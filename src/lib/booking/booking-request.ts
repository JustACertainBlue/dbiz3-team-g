import { randomUUID } from 'node:crypto'
import { toSessionContext, type SessionLike } from '../auth/session'
import { demoRepository } from '../db/application-store'
import { messageOperations, nextSentAt, pairChatPlan, pairUserIds } from '../iac/chat-pairs'
import { hanoiDate } from '../time/hanoi-time'
import { BookingError, invalid, isPositiveInteger } from './create-booking'
import { freeSlotsOn } from './free-slots'
import { encodeBookingRequest } from './request-card'
import { withBookingWriteLock } from './write-lock'

// "Gửi yêu cầu đặt chỗ" (screens 04, 24; UI v3 decisions #1, #12). The Tour Agency never creates a Booking:
// it sends the Provider a chat message carrying the request. The Provider then creates the Booking (screen 35).
export const NOTE_MAX = 500

export interface BookingRequestResult { chat_session_id: string; message_id: string }

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/

export async function createBookingRequest(
  session: SessionLike,
  input: Record<string, unknown>,
  options: { now?: () => Date } = {},
): Promise<BookingRequestResult> {
  const actor = await toSessionContext(session)
  if (!actor.authenticated || actor.role !== 'Tour_Agency' || !actor.agencyId || !actor.userId) {
    throw new BookingError('FORBIDDEN', 'Only a Tour Agency can send a booking request')
  }
  const { agencyId, userId } = actor
  const now = (options.now ?? (() => new Date()))()
  const repository = demoRepository()

  const experienceId = typeof input.experience_id === 'string' ? input.experience_id : ''
  const experience = experienceId ? await repository.find('experiences', row => row.experience_id === experienceId && !row.archived_at) : undefined
  if (!experience) throw new BookingError('NOT_FOUND', 'Experience not found')
  const provider = await repository.find('provider_profiles', row => row.provider_id === experience.provider_id)
  if (!provider || provider.verification_status !== 'Verified') throw new BookingError('PROVIDER_NOT_ELIGIBLE', 'The Provider is not available')

  const date = typeof input.date === 'string' ? input.date : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00+07:00`))) invalid('date must be YYYY-MM-DD')
  if (date < hanoiDate(now)) invalid('date cannot be in the past')
  // 21/11: a free slot of that day is required (Ngày này xưởng không có ca trống → nothing to send).
  const slotStart = typeof input.slot_start === 'string' ? input.slot_start : ''
  const slotEnd = typeof input.slot_end === 'string' ? input.slot_end : ''
  if (!slotStart || !slotEnd) invalid('slot_start and slot_end are required: choose a free slot of the day')
  if (!CLOCK.test(slotStart) || !CLOCK.test(slotEnd)) invalid('slot_start and slot_end must both be HH:mm')
  if (slotEnd <= slotStart) invalid('slot_end must be after slot_start')
  const groupSize = input.group_size
  if (!isPositiveInteger(groupSize)) invalid('group_size must be an integer > 0')
  if (groupSize > Number(experience.max_participants)) invalid('group_size exceeds max_participants')
  const note = typeof input.note === 'string' ? input.note.trim() : ''
  if ([...note].length > NOTE_MAX) invalid(`note is longer than ${NOTE_MAX} characters`)

  const free = await freeSlotsOn(experienceId, date)
  if (!free.some(slot => slot.start === slotStart && slot.end === slotEnd)) {
    throw new BookingError('SLOT_UNAVAILABLE', 'Slot Unavailable: this is not a free slot of the Experience on that day')
  }

  return withBookingWriteLock(async () => {
    const at = now.toISOString()
    const plan = await pairChatPlan({ agencyId, providerId: provider.provider_id, source: 'Explore', at, experienceId })
    const chatId = plan.chat.chat_session_id
    const { providerUserId } = await pairUserIds(agencyId, provider.provider_id)
    const messageId = randomUUID()
    const sentAt = plan.isNew ? at : await nextSentAt(chatId, at)
    const text = encodeBookingRequest({ experience_id: experienceId, experience_name: experience.name, date, slot_start: slotStart, slot_end: slotEnd, group_size: groupSize, note })
    await repository.applyBatch([
      ...plan.operations,
      ...(await messageOperations(chatId, {
        message_id: messageId, chat_session_id: chatId, sender_user_id: userId, text, message_kind: 'Quote Request',
        experience_id: experienceId, quote_request_id: '', booking_id: '', sent_at: sentAt,
      }, providerUserId)),
    ])
    return { chat_session_id: chatId, message_id: messageId }
  })
}
