import { randomUUID } from 'node:crypto'
import type { ActorSession } from '../auth/demo-session'
import { demoRepository } from './json-repository'
import type { DemoRow } from './types'

export class HandoffError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message)
    this.name = 'HandoffError'
  }
}

function requireAgency(session: ActorSession): asserts session is ActorSession & { agencyId: string; userId: string } {
  if (!session.authenticated || session.role !== 'TourAgency' || !session.agencyId || !session.userId) {
    throw new HandoffError('Only an authenticated Tour Agency can contact a Provider', 403)
  }
}

function experienceContext(experienceId: string): { experience: DemoRow; provider: DemoRow; providerUserId: string } {
  const repository = demoRepository()
  const experience = repository.find('experiences', row => row.experience_id === experienceId && !row.archived_at)
  if (!experience) throw new HandoffError('Experience not found', 404)
  const provider = repository.find('provider_profiles', row => row.provider_id === experience.provider_id)
  if (!provider || provider.verification_status !== 'Verified') throw new HandoffError('Provider is not available', 409)
  return { experience, provider, providerUserId: provider.user_id }
}

function openPairChat(agencyId: string, providerId: string, experienceId: string, quoteRequestId: string, agencyUserId: string, providerUserId: string): DemoRow {
  const repository = demoRepository()
  const existing = repository.find('chat_sessions', row => row.agency_id === agencyId && row.provider_id === providerId && row.status !== 'Closed')
  const now = new Date().toISOString()
  if (existing) {
    return repository.update('chat_sessions', row => row.chat_session_id === existing.chat_session_id, {
      experience_id: experienceId,
      quote_request_id: quoteRequestId || existing.quote_request_id,
      last_message_at: now,
    })!
  }
  const chat: DemoRow = {
    chat_session_id: randomUUID(), agency_id: agencyId, provider_id: providerId, source: 'Explore', matching_session_id: '',
    experience_id: experienceId, quote_request_id: quoteRequestId, booking_id: '', status: 'Open',
    started_at: now, last_message_at: now, closed_at: '', closed_by: '',
  }
  repository.insert('chat_sessions', chat)
  for (const userId of [agencyUserId, providerUserId]) {
    repository.insert('chat_participants', { chat_session_id: chat.chat_session_id, user_id: userId, last_read_message_id: '', unread_count: '0' })
  }
  return chat
}

function sendContextMessage(chatId: string, senderUserId: string, experience: DemoRow, quoteRequestId: string, action: 'quote' | 'chat'): DemoRow {
  const repository = demoRepository()
  const now = new Date().toISOString()
  const message: DemoRow = {
    message_id: randomUUID(), chat_session_id: chatId, sender_user_id: senderUserId,
    text: action === 'quote'
      ? `Yêu cầu báo giá cho trải nghiệm: ${experience.name}. Vui lòng trao đổi lịch, quy mô đoàn và điều kiện hợp tác trong hội thoại này.`
      : `Tôi muốn trao đổi về trải nghiệm: ${experience.name}.`,
    message_kind: action === 'quote' ? 'Quote Request' : 'Experience Context', experience_id: experience.experience_id,
    quote_request_id: quoteRequestId, booking_id: '', sent_at: now,
  }
  repository.insert('chat_messages', message)
  repository.update('chat_sessions', row => row.chat_session_id === chatId, { last_message_at: now })
  return message
}

export function createQuoteHandoff(session: ActorSession, experienceId: string) {
  requireAgency(session)
  const repository = demoRepository()
  const { experience, provider, providerUserId } = experienceContext(experienceId)
  const bookingsBefore = repository.all('bookings').length
  let quote = repository.find('quote_requests', row => row.agency_id === session.agencyId && row.experience_id === experienceId)
  const isNewRequest = !quote
  if (!quote) {
    quote = repository.insert('quote_requests', {
      quote_request_id: randomUUID(), agency_id: session.agencyId, experience_id: experienceId,
      source: 'Explore', matching_session_id: '', created_at: new Date().toISOString(),
    })
  }
  const chat = openPairChat(session.agencyId, provider.provider_id, experienceId, quote.quote_request_id, session.userId, providerUserId)
  if (isNewRequest) sendContextMessage(chat.chat_session_id, session.userId, experience, quote.quote_request_id, 'quote')
  if (repository.all('bookings').length !== bookingsBefore) throw new HandoffError('Quote handoff must not create a Booking', 500)
  return { quote_request_id: quote.quote_request_id, chat_session_id: chat.chat_session_id, is_new_request: isNewRequest }
}

export function createChatHandoff(session: ActorSession, experienceId: string) {
  requireAgency(session)
  const repository = demoRepository()
  const { experience, provider, providerUserId } = experienceContext(experienceId)
  const bookingsBefore = repository.all('bookings').length
  const chat = openPairChat(session.agencyId, provider.provider_id, experienceId, '', session.userId, providerUserId)
  const message = sendContextMessage(chat.chat_session_id, session.userId, experience, '', 'chat')
  if (repository.all('bookings').length !== bookingsBefore) throw new HandoffError('Chat handoff must not create a Booking', 500)
  return { chat_session_id: chat.chat_session_id, initial_message_id: message.message_id }
}

export function listConversations(session: ActorSession) {
  if (!session.authenticated || !session.userId) throw new HandoffError('Authentication required', 401)
  const repository = demoRepository()
  const sessions = repository.all('chat_sessions').filter(row =>
    session.role === 'TourAgency' ? row.agency_id === session.agencyId :
      session.role === 'LocalProvider' ? row.provider_id === session.providerId : false)
  const conversations = sessions.map(chat => {
    const experience = repository.find('experiences', row => row.experience_id === chat.experience_id)
    const providerVersion = repository.find('provider_profile_versions', row => row.provider_id === chat.provider_id && row.version_status === 'Verified')
    const agency = repository.find('agency_profiles', row => row.agency_id === chat.agency_id)
    const messages = repository.all('chat_messages').filter(row => row.chat_session_id === chat.chat_session_id)
      .sort((a, b) => a.sent_at.localeCompare(b.sent_at))
    return {
      ...chat,
      experience_name: experience?.name || 'Trao đổi chung',
      provider_name: providerVersion?.business_name || 'Local Provider',
      agency_name: agency?.company_name || 'Tour Agency',
      messages,
    }
  }) as Array<DemoRow & { experience_name: string; provider_name: string; agency_name: string; messages: DemoRow[] }>
  return conversations.sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
}

export function sendConversationMessage(session: ActorSession, chatSessionId: string, text: string) {
  if (!session.authenticated || !session.userId) throw new HandoffError('Authentication required', 401)
  if (!text.trim()) throw new HandoffError('Message cannot be empty')
  const repository = demoRepository()
  const chat = repository.find('chat_sessions', row => row.chat_session_id === chatSessionId)
  if (!chat) throw new HandoffError('Conversation not found', 404)
  const allowed = session.role === 'TourAgency' ? chat.agency_id === session.agencyId : session.role === 'LocalProvider' && chat.provider_id === session.providerId
  if (!allowed) throw new HandoffError('Conversation access denied', 403)
  const now = new Date().toISOString()
  const message = repository.insert('chat_messages', {
    message_id: randomUUID(), chat_session_id: chatSessionId, sender_user_id: session.userId, text: text.trim(),
    message_kind: 'Text', experience_id: chat.experience_id, quote_request_id: chat.quote_request_id,
    booking_id: '', sent_at: now,
  })
  repository.update('chat_sessions', row => row.chat_session_id === chatSessionId, { last_message_at: now })
  return message
}
