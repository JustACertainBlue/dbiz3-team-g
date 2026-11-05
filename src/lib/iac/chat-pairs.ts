import { randomUUID } from 'node:crypto'
import { demoRepository } from '../demo/json-repository'
import type { BatchOperation, DemoRow } from '../demo/types'

/** `chat_sessions.source` (data/schema.sql chat_source_chk; spec-IAC #19). */
export const CHAT_SOURCES = ['AI Matching', 'Explore', 'Provider Profile', 'Quote Request', 'Booking'] as const
export type ChatSource = typeof CHAT_SOURCES[number]

export interface PairContext {
  agencyId: string
  providerId: string
  source: ChatSource
  at: string
  matchingSessionId?: string
  experienceId?: string
  quoteRequestId?: string
  bookingId?: string
  /** Initial unread counts of the new participants (default 0). */
  unread?: { agency?: number; provider?: number }
}

/** FR-001: at most one Active Chat per Agency–Local Provider pair (chat_one_active_pair_uq). */
export function findActivePairChat(agencyId: string, providerId: string): DemoRow | undefined {
  return demoRepository().find('chat_sessions', row => row.agency_id === agencyId && row.provider_id === providerId && row.status === 'Active')
}

export function pairUserIds(agencyId: string, providerId: string): { agencyUserId: string; providerUserId: string } {
  const repository = demoRepository()
  const agencyUserId = repository.find('agency_profiles', row => row.agency_id === agencyId)?.user_id
  const providerUserId = repository.find('provider_profiles', row => row.provider_id === providerId)?.user_id
  if (!agencyUserId || !providerUserId) throw new Error('Chat pair has no Agency or Provider user')
  return { agencyUserId, providerUserId }
}

/** Rows of a new Active pair Chat and its two participants; writes nothing. */
export function newPairChatOperations(context: PairContext): { chat: DemoRow; operations: BatchOperation[] } {
  if (!(CHAT_SOURCES as readonly string[]).includes(context.source)) throw new Error(`Invalid chat source: ${context.source}`)
  if (context.source === 'AI Matching' && !context.matchingSessionId) throw new Error('AI Matching Chat needs matching_session_id')
  const { agencyUserId, providerUserId } = pairUserIds(context.agencyId, context.providerId)
  const chat: DemoRow = {
    chat_session_id: randomUUID(), agency_id: context.agencyId, provider_id: context.providerId, source: context.source,
    matching_session_id: context.matchingSessionId ?? '', experience_id: context.experienceId ?? '',
    quote_request_id: context.quoteRequestId ?? '', booking_id: context.bookingId ?? '', status: 'Active',
    started_at: context.at, last_message_at: '', closed_at: '', closed_by: '',
  }
  const participant = (userId: string, unread = 0): BatchOperation => ({
    table: 'chat_participants',
    row: { chat_session_id: chat.chat_session_id, user_id: userId, last_read_message_id: '', unread_count: String(unread) },
  })
  return {
    chat,
    operations: [
      { table: 'chat_sessions', row: chat },
      participant(agencyUserId, context.unread?.agency),
      participant(providerUserId, context.unread?.provider),
    ],
  }
}

/**
 * Reuse the pair's Active Chat or plan a new one (FR-001). On reuse `source` and
 * `matching_session_id` stay; the context ids follow this handoff (spec-IAC #21). Writes nothing.
 */
export function pairChatPlan(context: PairContext): { chat: DemoRow; isNew: boolean; operations: BatchOperation[] } {
  const existing = findActivePairChat(context.agencyId, context.providerId)
  if (!existing) return { ...newPairChatOperations(context), isNew: true }
  const changes = {
    experience_id: context.experienceId ?? '', quote_request_id: context.quoteRequestId ?? '', booking_id: context.bookingId ?? '',
  }
  const chatId = existing.chat_session_id
  return {
    chat: { ...existing, ...changes },
    isNew: false,
    operations: [{ table: 'chat_sessions', match: row => row.chat_session_id === chatId, changes }],
  }
}

/**
 * sent_at for a new message: `at`, or 1 ms after the Chat's latest message when `at` is not later.
 * History is ordered by (sent_at, message_id) (Q6); without this two messages written in the same
 * millisecond would be ordered by their random ids instead of the order they were sent.
 */
export function nextSentAt(chatId: string, at: string): string {
  const latest = demoRepository().all('chat_messages')
    .filter(row => row.chat_session_id === chatId)
    .reduce((max, row) => Math.max(max, Date.parse(row.sent_at)), Number.NEGATIVE_INFINITY)
  const wanted = Date.parse(at)
  return wanted > latest ? at : new Date(latest + 1).toISOString()
}

/**
 * One stored message: insert it, move the Chat's last_message_at, add 1 to the recipient's
 * unread count (spec-IAC #26). Works for a Chat planned in the same batch.
 */
export function messageOperations(chatId: string, message: DemoRow, recipientUserId: string): BatchOperation[] {
  const current = demoRepository().find('chat_participants', row => row.chat_session_id === chatId && row.user_id === recipientUserId)
  return [
    { table: 'chat_messages', row: message },
    { table: 'chat_sessions', match: row => row.chat_session_id === chatId, changes: { last_message_at: message.sent_at } },
    {
      table: 'chat_participants',
      match: row => row.chat_session_id === chatId && row.user_id === recipientUserId,
      changes: { unread_count: String(Number(current?.unread_count || 0) + 1) },
    },
  ]
}
