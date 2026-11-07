import { randomUUID } from 'node:crypto'
import { demoRepository } from '../db/application-store'
import type { BatchOperation, DemoRow } from '../demo/types'
import { findActivePairChat, newPairChatOperations, nextSentAt } from '../iac/chat-pairs'
import { hanoiClock, hanoiDate } from '../time/hanoi-time'

// F-SCHED-08: every Booking event sends one 'Booking Update' message to the Agency (spec #49, #55).
// The caller adds the returned operations to its own applyBatch call (one persist per event, #44)
// and must run inside withBookingWriteLock, so the "no Active Chat → create one" step can never
// create a second Active Chat for the same Agency–Provider pair.

function money(value: string): string {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

// #49: "Booking {status}: {experience}, {start}–{end}, {group_size} pax, {agreed_price} VND" (+ changed fields).
function messageText(booking: DemoRow, experienceName: string, changedFields: readonly string[]): string {
  const when = `${hanoiDate(booking.start_at)} ${hanoiClock(booking.start_at)}–${hanoiClock(booking.end_at)}` // spec-BKG #31, #87
  const text = `Booking ${booking.status}: ${experienceName}, ${when}, ${booking.group_size} pax, ${money(booking.agreed_price_total)} VND`
  return changedFields.length ? `${text}; changed: ${changedFields.join(', ')}` : text
}

// FR-008 order (#13): Active source Chat of the same pair (#56), else the latest Active Chat of the pair.
async function resolveChat(booking: DemoRow): Promise<DemoRow | undefined> {
  const repository = demoRepository()
  const samePairActive = (row: DemoRow) =>
    row.status === 'Active' && row.agency_id === booking.agency_id && row.provider_id === booking.provider_id
  if (booking.source_chat_session_id) {
    const source = (await repository.find('chat_sessions', row => row.chat_session_id === booking.source_chat_session_id))
    if (source && samePairActive(source)) return source
  }
  // IAC FR-001: the pair has at most one Active Chat; the shared lookup is used by every Chat creator.
  return (await findActivePairChat(booking.agency_id, booking.provider_id))
}

export async function bookingUpdateOperations(
  booking: DemoRow,
  at: string,
  changedFields: readonly string[] = [],
): Promise<{ operations: BatchOperation[]; messageId: string }> {
  const repository = demoRepository()
  const experience = (await repository.find('experiences', row => row.experience_id === booking.experience_id))
  const agencyUserId = (await repository.find('agency_profiles', row => row.agency_id === booking.agency_id))?.user_id ?? ''
  const operations: BatchOperation[] = []

  // Issue #66: the message uses the IAC sent_at format (ISO UTC, milliseconds) and is strictly later than
  // the Chat's latest message (spec-IAC #47), even when two Booking events fall in the same second.
  // The Booking's own timestamps keep the BKG +07:00 format; only the Chat message time changes.
  const instant = new Date(Date.parse(at)).toISOString()
  let chat = await resolveChat(booking)
  let sentAt: string
  if (!chat) {
    sentAt = instant
    const created = await newPairChatOperations({
      agencyId: booking.agency_id, providerId: booking.provider_id, source: 'Booking', at,
      experienceId: booking.experience_id, bookingId: booking.booking_id, unread: { agency: 1 },
    })
    chat = { ...created.chat, last_message_at: sentAt }
    operations.push({ ...created.operations[0], row: chat } as BatchOperation, ...created.operations.slice(1))
  } else {
    const chatId = chat.chat_session_id
    sentAt = await nextSentAt(chatId, instant)
    operations.push({ table: 'chat_sessions', match: row => row.chat_session_id === chatId, changes: { last_message_at: sentAt } })
    const participant = await repository.find('chat_participants', row => row.chat_session_id === chatId && row.user_id === agencyUserId)

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
      experience_id: booking.experience_id, quote_request_id: '', booking_id: booking.booking_id, sent_at: sentAt,
    },
  })
  return { operations, messageId }
}

// #27: Seen once the participant's last read message is this message or a later one, otherwise Unseen.
export async function recipientReadStatus(chatSessionId: string, userId: string, messageId: string): Promise<'Seen' | 'Unseen'> {
  const repository = demoRepository()
  const participant = (await repository.find('chat_participants', row => row.chat_session_id === chatSessionId && row.user_id === userId))
  const message = (await repository.find('chat_messages', row => row.message_id === messageId))
  if (!participant?.last_read_message_id || !message) return 'Unseen'
  const lastRead = (await repository.find('chat_messages', row => row.message_id === participant.last_read_message_id))
  return lastRead && Date.parse(lastRead.sent_at) >= Date.parse(message.sent_at) ? 'Seen' : 'Unseen'
}
