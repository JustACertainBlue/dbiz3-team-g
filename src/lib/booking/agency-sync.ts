import { randomUUID } from 'node:crypto'
import { demoRepository } from '../demo/json-repository'
import type { BatchOperation, DemoRow } from '../demo/types'

// F-SCHED-08: every Booking event sends one 'Booking Update' message to the Agency (spec #49, #55).
// The caller adds the returned operations to its own applyBatch call (one persist per event, #44)
// and must run inside withBookingWriteLock, so the "no Active Chat → create one" step can never
// create a second Active Chat for the same Agency–Provider pair.

function money(value: string): string {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

// #49: "Booking {status}: {experience}, {start}–{end}, {group_size} pax, {agreed_price} VND" (+ changed fields).
function messageText(booking: DemoRow, experienceName: string, changedFields: readonly string[]): string {
  const when = `${booking.start_at.slice(0, 10)} ${booking.start_at.slice(11, 16)}–${booking.end_at.slice(11, 16)}`
  const text = `Booking ${booking.status}: ${experienceName}, ${when}, ${booking.group_size} pax, ${money(booking.agreed_price_total)} VND`
  return changedFields.length ? `${text}; changed: ${changedFields.join(', ')}` : text
}

// FR-008 order (#13): Active source Chat of the same pair (#56), else the latest Active Chat of the pair.
function resolveChat(booking: DemoRow): DemoRow | undefined {
  const repository = demoRepository()
  const samePairActive = (row: DemoRow) =>
    row.status === 'Active' && row.agency_id === booking.agency_id && row.provider_id === booking.provider_id
  if (booking.source_chat_session_id) {
    const source = repository.find('chat_sessions', row => row.chat_session_id === booking.source_chat_session_id)
    if (source && samePairActive(source)) return source
  }
  return repository.all('chat_sessions')
    .filter(samePairActive)
    .sort((a, b) => Date.parse(b.last_message_at || b.started_at) - Date.parse(a.last_message_at || a.started_at))[0]
}

export function bookingUpdateOperations(
  booking: DemoRow,
  at: string,
  changedFields: readonly string[] = [],
): { operations: BatchOperation[]; messageId: string } {
  const repository = demoRepository()
  const experience = repository.find('experiences', row => row.experience_id === booking.experience_id)
  const agencyUserId = repository.find('agency_profiles', row => row.agency_id === booking.agency_id)?.user_id ?? ''
  const providerUserId = repository.find('provider_profiles', row => row.provider_id === booking.provider_id)?.user_id ?? ''
  const operations: BatchOperation[] = []

  let chat = resolveChat(booking)
  if (!chat) {
    chat = {
      chat_session_id: randomUUID(), agency_id: booking.agency_id, provider_id: booking.provider_id, source: 'Booking',
      matching_session_id: '', experience_id: booking.experience_id, quote_request_id: '', booking_id: booking.booking_id,
      status: 'Active', started_at: at, last_message_at: at, closed_at: '', closed_by: '',
    }
    operations.push(
      { table: 'chat_sessions', row: chat },
      { table: 'chat_participants', row: { chat_session_id: chat.chat_session_id, user_id: agencyUserId, last_read_message_id: '', unread_count: '1' } },
      { table: 'chat_participants', row: { chat_session_id: chat.chat_session_id, user_id: providerUserId, last_read_message_id: '', unread_count: '0' } },
    )
  } else {
    const chatId = chat.chat_session_id
    operations.push({ table: 'chat_sessions', match: row => row.chat_session_id === chatId, changes: { last_message_at: at } })
    const participant = repository.find('chat_participants', row => row.chat_session_id === chatId && row.user_id === agencyUserId)
    operations.push(participant
      ? { table: 'chat_participants', match: row => row.chat_session_id === chatId && row.user_id === agencyUserId, changes: { unread_count: String(Number(participant.unread_count || 0) + 1) } }
      : { table: 'chat_participants', row: { chat_session_id: chatId, user_id: agencyUserId, last_read_message_id: '', unread_count: '1' } })
  }

  const messageId = randomUUID()
  operations.push({
    table: 'chat_messages',
    row: {
      message_id: messageId, chat_session_id: chat.chat_session_id, sender_user_id: '',
      text: messageText(booking, experience?.name ?? '', changedFields), message_kind: 'Booking Update',
      experience_id: booking.experience_id, quote_request_id: '', booking_id: booking.booking_id, sent_at: at,
    },
  })
  return { operations, messageId }
}

// #27: Seen once the participant's last read message is this message or a later one, otherwise Unseen.
export function recipientReadStatus(chatSessionId: string, userId: string, messageId: string): 'Seen' | 'Unseen' {
  const repository = demoRepository()
  const participant = repository.find('chat_participants', row => row.chat_session_id === chatSessionId && row.user_id === userId)
  const message = repository.find('chat_messages', row => row.message_id === messageId)
  if (!participant?.last_read_message_id || !message) return 'Unseen'
  const lastRead = repository.find('chat_messages', row => row.message_id === participant.last_read_message_id)
  return lastRead && Date.parse(lastRead.sent_at) >= Date.parse(message.sent_at) ? 'Seen' : 'Unseen'
}
