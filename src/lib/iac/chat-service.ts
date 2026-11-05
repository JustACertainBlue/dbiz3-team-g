import { randomUUID } from 'node:crypto'
import type { ActorSession } from '../auth/demo-session'
import { demoRepository } from '../demo/json-repository'
import type { DemoRow } from '../demo/types'
import { ChatError, isParticipant, requireChatActor, requireParticipant, type ChatActor } from './chat-access'
import { withChatWriteLock } from './chat-lock'
import { messageOperations, nextSentAt, pairChatPlan, pairUserIds, type ChatSource, type PairContext } from './chat-pairs'

// IAC F-CHAT-01..03 (spec-IAC FR-001..FR-003). Every function: authorize → validate → lock →
// read/write; a denied or invalid request writes nothing (lesson #15).

export const MESSAGE_MAX_CODE_POINTS = 4000 // FR-002, spec-IAC #25
export const HISTORY_PAGE_SIZE = 50 // BR-015
const PREVIEW_CODE_POINTS = 120
const SYSTEM_SENDER = 'Hệ thống'

type Clock = () => Date
const systemClock: Clock = () => new Date()

export interface OpenChatInput {
  source: ChatSource
  experienceId?: string
  matchingSessionId?: string
  quoteRequestId?: string
  bookingId?: string
}

export interface OpenChatResult {
  chat_session_id: string
  chat_status: 'Active'
  is_new_session: boolean
}

/** The Agency–Provider pair and context of an open request, after authorization and validation. */
export function resolveOpenTarget(actor: ChatActor, input: OpenChatInput): Omit<PairContext, 'at'> {
  const repository = demoRepository()
  if (input.source === 'Booking') {
    if (!input.bookingId) throw new ChatError('VALIDATION_ERROR', 'booking_id is required when source = Booking')
    const booking = repository.find('bookings', row => row.booking_id === input.bookingId)
    if (!booking) throw new ChatError('NOT_FOUND', 'Booking not found')
    const own = actor.role === 'TourAgency' ? booking.agency_id === actor.agencyId : booking.provider_id === actor.providerId
    if (!own) throw new ChatError('FORBIDDEN', 'The Booking belongs to another participant')
    return { agencyId: booking.agency_id, providerId: booking.provider_id, source: 'Booking', bookingId: booking.booking_id, experienceId: booking.experience_id }
  }
  // FR-001, Q5: a Local Provider starts a Chat only from its own Booking in this slice.
  if (actor.role !== 'TourAgency') throw new ChatError('FORBIDDEN', 'A Local Provider can open a Chat only from its own Booking')
  if (input.source === 'Quote Request') throw new ChatError('VALIDATION_ERROR', 'source Quote Request is not supported yet')
  if (!input.experienceId) throw new ChatError('VALIDATION_ERROR', 'experience_id is required')
  if (input.source === 'AI Matching' && !input.matchingSessionId) throw new ChatError('VALIDATION_ERROR', 'matching_session_id is required when source = AI Matching')
  const experience = repository.find('experiences', row => row.experience_id === input.experienceId && !row.archived_at)
  if (!experience) throw new ChatError('NOT_FOUND', 'Experience not found')
  const provider = repository.find('provider_profiles', row => row.provider_id === experience.provider_id)
  if (!provider || provider.verification_status !== 'Verified') throw new ChatError('PROVIDER_UNAVAILABLE', 'Provider is not available')
  return {
    agencyId: actor.agencyId, providerId: provider.provider_id, source: input.source,
    matchingSessionId: input.matchingSessionId, experienceId: experience.experience_id, quoteRequestId: input.quoteRequestId,
  }
}

/** F-CHAT-01: open the pair's Active Chat or create it (FR-001, BR-004, BR-021, spec-IAC #19, #21, #24). */
export async function openChat(
  session: ActorSession,
  input: OpenChatInput,
  // afterPairCheck is a test-only seam: an async pause between the pair check and the write (lesson #13).
  options: { now?: Clock; afterPairCheck?: () => Promise<void> } = {},
): Promise<OpenChatResult> {
  const actor = requireChatActor(session)
  const target = resolveOpenTarget(actor, input)
  const at = (options.now ?? systemClock)().toISOString()
  return withChatWriteLock(async () => {
    const plan = pairChatPlan({ ...target, at })
    if (options.afterPairCheck) await options.afterPairCheck()
    demoRepository().applyBatch(plan.operations)
    return { chat_session_id: plan.chat.chat_session_id, chat_status: 'Active' as const, is_new_session: plan.isNew }
  })
}

function codePoints(text: string): number {
  return [...text].length
}

/** The other participant of the pair (recipient of the sender's message). */
function recipientOf(chat: DemoRow, senderUserId: string): string {
  const { agencyUserId, providerUserId } = pairUserIds(chat.agency_id, chat.provider_id)
  return senderUserId === agencyUserId ? providerUserId : agencyUserId
}

/** F-CHAT-02: send a text message (FR-002, BR-006, BR-017, BR-021, spec-IAC #25, #26). */
export async function sendMessage(session: ActorSession, chatSessionId: string, text: unknown, options: { now?: Clock } = {}) {
  const chat = requireParticipant(session, chatSessionId)
  const senderUserId = session.userId!
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed) throw new ChatError('VALIDATION_ERROR', 'Message cannot be empty')
  if (codePoints(trimmed) > MESSAGE_MAX_CODE_POINTS) throw new ChatError('VALIDATION_ERROR', `Message is longer than ${MESSAGE_MAX_CODE_POINTS} characters`)
  return withChatWriteLock(() => {
    const current = demoRepository().find('chat_sessions', row => row.chat_session_id === chatSessionId)!
    if (current.status !== 'Active') throw new ChatError('CHAT_CLOSED', 'This Chat is closed; start a new Chat to continue')
    const sentAt = nextSentAt(chatSessionId, (options.now ?? systemClock)().toISOString())
    const message: DemoRow = {
      message_id: randomUUID(), chat_session_id: chatSessionId, sender_user_id: senderUserId, text: trimmed,
      message_kind: 'User Text', experience_id: current.experience_id, quote_request_id: current.quote_request_id,
      booking_id: current.booking_id, sent_at: sentAt,
    }
    demoRepository().applyBatch(messageOperations(chatSessionId, message, recipientOf(chat, senderUserId)))
    return { message_id: message.message_id, sent_at: sentAt, last_message_timestamp: sentAt }
  })
}

/** Messages of a Chat in history order: sent_at, then message_id (Q6). */
function orderedMessages(chatSessionId: string): DemoRow[] {
  return demoRepository().all('chat_messages')
    .filter(row => row.chat_session_id === chatSessionId)
    .sort((a, b) => (Date.parse(a.sent_at) - Date.parse(b.sent_at)) || a.message_id.localeCompare(b.message_id))
}

function fullName(userId: string): string {
  return demoRepository().find('user_accounts', row => row.user_id === userId)?.full_name ?? ''
}

// spec-IAC #22: counterpart user's full_name and organization.
function counterpart(actor: ChatActor, chat: DemoRow): { participant_name: string; organization: string } {
  const repository = demoRepository()
  if (actor.role === 'TourAgency') {
    const provider = repository.find('provider_profiles', row => row.provider_id === chat.provider_id)
    const version = provider && repository.find('provider_profile_versions', row => row.provider_id === provider.provider_id && row.version_no === provider.published_version_no)
    return { participant_name: fullName(provider?.user_id ?? ''), organization: version?.business_name ?? '' }
  }
  const agency = repository.find('agency_profiles', row => row.agency_id === chat.agency_id)
  return { participant_name: fullName(agency?.user_id ?? ''), organization: agency?.company_name ?? '' }
}

export interface ChatListEntry {
  chat_session_id: string
  chat_status: 'Active' | 'Closed'
  participant_name: string
  organization: string
  last_message_preview?: string
  last_message_at?: string
  unread_count: number
}

/** F-CHAT-03 Chat list (FR-003, BR-002, BR-013, BR-016). */
export function listChats(session: ActorSession): ChatListEntry[] {
  const actor = requireChatActor(session)
  const repository = demoRepository()
  const activity = (chat: DemoRow) => Date.parse(chat.last_message_at || chat.started_at)
  return repository.all('chat_sessions')
    .filter(chat => isParticipant(actor, chat))
    .sort((a, b) => (activity(b) - activity(a)) || a.chat_session_id.localeCompare(b.chat_session_id))
    .map(chat => {
      const latest = orderedMessages(chat.chat_session_id).at(-1)
      const own = repository.find('chat_participants', row => row.chat_session_id === chat.chat_session_id && row.user_id === actor.userId)
      const entry: ChatListEntry = {
        chat_session_id: chat.chat_session_id,
        chat_status: chat.status as 'Active' | 'Closed',
        ...counterpart(actor, chat),
        unread_count: Number(own?.unread_count || 0),
      }
      if (latest?.text) entry.last_message_preview = [...latest.text].slice(0, PREVIEW_CODE_POINTS).join('')
      if (chat.last_message_at) entry.last_message_at = chat.last_message_at
      return entry
    })
}

function attachmentsOf(messageId: string) {
  const repository = demoRepository()
  return repository.all('chat_attachments').filter(row => row.message_id === messageId).map(row => {
    const file = repository.find('stored_files', f => f.file_id === row.file_id)
    return { attachment_id: row.attachment_id, file_name: file?.file_name ?? '', file_type: file?.media_type ?? '', file_size: Number(file?.file_size_bytes || 0) }
  })
}

function historyItem(message: DemoRow) {
  return {
    message_id: message.message_id,
    message_kind: message.message_kind,
    text: message.text,
    sender_name: message.sender_user_id ? fullName(message.sender_user_id) : SYSTEM_SENDER,
    sent_at: message.sent_at,
    experience_id: message.experience_id, // spec-IAC #28
    booking_id: message.booking_id, // spec-IAC #28
    attachments: attachmentsOf(message.message_id),
  }
}

/**
 * F-CHAT-03 history (BR-014, BR-015, Q6): 50 messages oldest → newest, older pages by before_cursor.
 * The first page resets the reader's unread count (BR-017, spec-IAC #23).
 */
export async function getChatHistory(session: ActorSession, chatSessionId: string, query: { beforeCursor?: string } = {}) {
  const chat = requireParticipant(session, chatSessionId)
  const userId = session.userId!
  const messages = orderedMessages(chatSessionId)
  let end = messages.length
  if (query.beforeCursor !== undefined) {
    end = messages.findIndex(row => row.message_id === query.beforeCursor)
    if (end < 0) throw new ChatError('VALIDATION_ERROR', 'before_cursor is not a message of this Chat')
  }
  const start = Math.max(0, end - HISTORY_PAGE_SIZE)
  const page = messages.slice(start, end)
  if (query.beforeCursor === undefined) {
    await withChatWriteLock(() => {
      const newest = orderedMessages(chatSessionId).at(-1)
      demoRepository().applyBatch([{
        table: 'chat_participants',
        match: row => row.chat_session_id === chatSessionId && row.user_id === userId,
        changes: { unread_count: '0', last_read_message_id: newest?.message_id ?? '' },
      }])
    })
  }
  return {
    chat_session_id: chat.chat_session_id,
    chat_status: chat.status as 'Active' | 'Closed',
    message_history: page.map(historyItem),
    has_more_messages: start > 0,
  }
}
