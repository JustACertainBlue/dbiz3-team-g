import { toSessionContext, type SessionLike } from '../auth/session'
import { demoRepository } from '../db/application-store'
import { bookingUpdateOperations } from './agency-sync'
import { hanoiTimestamp, systemClock, type Clock } from './clock'
import { BookingError, invalid } from './create-booking'
import { expireDueHoldsLocked } from './expire-holds'
import { withBookingWriteLock } from './write-lock'

// Screen 06 "Hoàn tất đặt chỗ" (UI v3, Part B step 3): the Tour Agency saves who is booking and sends the system
// message "Công ty báo đã thanh toán". No payment gateway exists, so the status does not change; the Provider
// presses "Đã nhận tiền" (On hold → Booked).
export const PAID_MESSAGE = 'Công ty báo đã thanh toán'
const PHONE = /^[0-9+().\s-]{6,32}$/

export interface BookerInfo { contact_name: string; contact_phone: string; note?: string }

export async function confirmBookerInfo(session: SessionLike, bookingId: string, input: Record<string, unknown>, options: { now?: Clock } = {}): Promise<void> {
  const actor = await toSessionContext(session)
  if (!actor.authenticated || actor.role !== 'Tour_Agency' || !actor.agencyId) throw new BookingError('FORBIDDEN', 'Only the Tour Agency of this Booking can save booker information')
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
  const name = text(input.contact_name), phone = text(input.contact_phone), note = text(input.note)
  if (!name) invalid('contact_name is required')
  if ([...name].length > 120) invalid('contact_name is longer than 120 characters')
  if (!PHONE.test(phone)) invalid('contact_phone is not a valid phone number')
  if ([...note].length > 1000) invalid('note is longer than 1000 characters')
  const now = (options.now ?? systemClock)()
  const repository = demoRepository()
  await withBookingWriteLock(async () => {
    const found = await repository.find('bookings', row => row.booking_id === bookingId)
    if (!found) throw new BookingError('NOT_FOUND', 'Booking not found')
    if (found.agency_id !== actor.agencyId) throw new BookingError('FORBIDDEN', 'Only the Tour Agency of this Booking can save booker information')
    await expireDueHoldsLocked(now)
    const booking = (await repository.find('bookings', row => row.booking_id === bookingId))!
    if (booking.status !== 'On hold') throw new BookingError(booking.status === 'Cancelled' || booking.status === 'Completed' ? 'BOOKING_TERMINAL' : 'INVALID_TRANSITION', `Booker information is saved while the Booking is On hold, not ${booking.status}`)
    const at = hanoiTimestamp(now.getTime())
    const changes = { contact_name: name, contact_phone: phone, note, updated_at: at }
    // One "Công ty báo đã thanh toán" per booking: a repeat press still saves the info but posts nothing.
    const already = (await repository.where('chat_messages', { booking_id: bookingId })).some(row => row.message_kind === 'Booking Update' && row.text.startsWith(PAID_MESSAGE))
    const sync = already ? { operations: [] } : await bookingUpdateOperations({ ...booking, ...changes }, at, [], { label: PAID_MESSAGE })
    await repository.applyBatch([
      { table: 'bookings', match: row => row.booking_id === bookingId && row.status === 'On hold', changes },
      ...sync.operations,
    ])
  })
}
