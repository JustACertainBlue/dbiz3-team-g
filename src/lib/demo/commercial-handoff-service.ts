import { randomUUID } from 'node:crypto'
import type { ActorSession } from '../auth/demo-session'
import { demoRepository } from './json-repository'
import type { BatchOperation, DemoRow } from './types'
import { demoRuntime } from '../explore/demo-runtime'
import { withChatWriteLock } from '../iac/chat-lock'
import { messageOperations, nextSentAt, pairChatPlan } from '../iac/chat-pairs'

/** FR-007 source of a strong action (spec-EXP #29, #33). */
export const SOURCE_CONTEXTS = ['Card', 'Detail Page'] as const
export type SourceContext = typeof SOURCE_CONTEXTS[number]

/** Explore context of a handoff started from EXP screens; AIT handoffs pass none. */
export interface ExploreSignal {
  exploreSessionId?: string
  sourceContext: SourceContext
}

/**
 * FR-007: record the strong action in the Agency's current Explore session, with
 * filter_values = { source_context } (spec-EXP #29). Returns the interaction id, or null when there is
 * no Explore session or the runtime does not log it (tracking scope, Experience not in the catalog).
 */
function logStrongAction(signal: ExploreSignal | undefined, action: 'request_quote' | 'open_chat', experienceId: string): string | null {
  if (!signal?.exploreSessionId) return null
  try {
    const result = demoRuntime().recordEvent(signal.exploreSessionId, {
      event_id: randomUUID(), action_type: action, experience_id: experienceId,
      filter_values: { source_context: signal.sourceContext },
    })
    return result.logged ? result.interaction_log_id : null
  } catch {
    return null
  }
}

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

/** Entry point of a handoff (spec-IAC #19); the AIT entry carries its Matching Session. */
export type HandoffSource = 'Explore' | 'Provider Profile' | 'AI Matching'
export interface HandoffContext {
  source?: HandoffSource
  matchingSessionId?: string
  signal?: ExploreSignal
}

function chatContext(context: HandoffContext): { source: HandoffSource; matchingSessionId?: string } {
  const source = context.source ?? 'Explore'
  if (source === 'AI Matching' && !context.matchingSessionId) throw new HandoffError('matching_session_id is required for AI Matching', 400)
  return { source, matchingSessionId: source === 'AI Matching' ? context.matchingSessionId : undefined }
}

// spec-IAC #18 / #7: the Chat context message is a User Text from the Agency with the Experience name, link and greeting.
function contextText(experience: DemoRow, action: 'quote' | 'chat'): string {
  return action === 'quote'
    ? `Yêu cầu báo giá cho trải nghiệm: ${experience.name}. Vui lòng trao đổi lịch, quy mô đoàn và điều kiện hợp tác trong hội thoại này.`
    : `Xin chào, tôi quan tâm đến trải nghiệm này: **${experience.name}** (/explore/experiences/${experience.experience_id})`
}

function contextMessage(chatId: string, senderUserId: string, experience: DemoRow, quoteRequestId: string, action: 'quote' | 'chat', at: string): DemoRow {
  return {
    message_id: randomUUID(), chat_session_id: chatId, sender_user_id: senderUserId, text: contextText(experience, action),
    message_kind: action === 'quote' ? 'Quote Request' : 'User Text', experience_id: experience.experience_id,
    quote_request_id: quoteRequestId, booking_id: '', sent_at: nextSentAt(chatId, at),
  }
}

export async function createQuoteHandoff(session: ActorSession, experienceId: string, context: HandoffContext = {}) {
  requireAgency(session)
  const { experience, provider, providerUserId } = experienceContext(experienceId)
  const chatSource = chatContext(context)
  const { agencyId, userId } = session
  const result = await withChatWriteLock(() => {
    const repository = demoRepository()
    const bookingsBefore = repository.all('bookings').length
    const at = new Date().toISOString()
    const operations: BatchOperation[] = []
    let quote = repository.find('quote_requests', row => row.agency_id === agencyId && row.experience_id === experienceId)
    const isNewRequest = !quote
    if (!quote) {
      // quote_source_chk: Matching (+ matching_session_id) from AI Tour Matching, otherwise Explore (analyze M5).
      quote = {
        quote_request_id: randomUUID(), agency_id: agencyId, experience_id: experienceId,
        source: chatSource.source === 'AI Matching' ? 'Matching' : 'Explore', matching_session_id: chatSource.matchingSessionId ?? '',
        created_at: at,
      }
      operations.push({ table: 'quote_requests', row: quote })
    }
    const plan = pairChatPlan({
      agencyId, providerId: provider.provider_id, ...chatSource, at, experienceId, quoteRequestId: quote.quote_request_id,
    })
    operations.push(...plan.operations)
    if (isNewRequest) {
      operations.push(...messageOperations(plan.chat.chat_session_id, contextMessage(plan.chat.chat_session_id, userId, experience, quote.quote_request_id, 'quote', at), providerUserId))
    }
    repository.applyBatch(operations)
    if (repository.all('bookings').length !== bookingsBefore) throw new HandoffError('Quote handoff must not create a Booking', 500)
    return { quote_request_id: quote.quote_request_id, chat_session_id: plan.chat.chat_session_id, chat_status: 'Active' as const, is_new_session: plan.isNew, is_new_request: isNewRequest }
  })
  // spec-EXP #32: only a new Quote Request logs the FR-007 signal.
  const actionSignalLogId = result.is_new_request ? logStrongAction(context.signal, 'request_quote', experienceId) : null
  return { ...result, action_signal_log_id: actionSignalLogId }
}

export async function createChatHandoff(session: ActorSession, experienceId: string, context: HandoffContext = {}) {
  requireAgency(session)
  const { experience, provider, providerUserId } = experienceContext(experienceId)
  const chatSource = chatContext(context)
  const { agencyId, userId } = session
  const result = await withChatWriteLock(() => {
    const repository = demoRepository()
    const bookingsBefore = repository.all('bookings').length
    const at = new Date().toISOString()
    const plan = pairChatPlan({ agencyId, providerId: provider.provider_id, ...chatSource, at, experienceId })
    const message = contextMessage(plan.chat.chat_session_id, userId, experience, '', 'chat', at)
    repository.applyBatch([...plan.operations, ...messageOperations(plan.chat.chat_session_id, message, providerUserId)])
    if (repository.all('bookings').length !== bookingsBefore) throw new HandoffError('Chat handoff must not create a Booking', 500)
    return { chat_session_id: plan.chat.chat_session_id, chat_status: 'Active' as const, is_new_session: plan.isNew, initial_message_id: message.message_id }
  })
  return { ...result, action_signal_log_id: logStrongAction(context.signal, 'open_chat', experienceId) }
}

/** FR-011: the Agency already sent a Quote Request for this Experience (Request Quote is hidden). */
export function hasQuoteRequest(session: ActorSession, experienceId: string): boolean {
  if (!session.authenticated || session.role !== 'TourAgency' || !session.agencyId) return false
  return Boolean(demoRepository().find('quote_requests', row => row.agency_id === session.agencyId && row.experience_id === experienceId))
}
