import { randomUUID } from 'node:crypto'
import type { ActorSession } from '../auth/demo-session'
import { demoRepository } from '../demo/json-repository'
import { bookingUpdateOperations } from './agency-sync'
import { loadBookingForActor } from './booking-access'
import { hanoiTimestamp, systemClock, type Clock } from './clock'
import { BookingError, invalid } from './create-booking'
import { expireDueHoldsLocked } from './expire-holds'
import { withBookingWriteLock } from './write-lock'

// F-SCHED-05 Booking status transitions (spec-BKG US-5, FR-005).
// Allowed: On hold → Booked (only while now < hold_expires_at, #45), On hold → Cancelled, Booked → Cancelled.
// Completed is reached only through F-SCHED-06 (AC-BKG-COMPLETE).

export interface StatusHistoryEntry {
  from_status: string
  to_status: string
  changed_by: string
  changed_at: string
  reason: string
}

export interface ChangeStatusResult {
  booking_status: string
  status_history_entry: StatusHistoryEntry
  schedules_synced: boolean
  agency_notification_message_id: string
}

const ALLOWED: Record<string, readonly string[]> = { 'On hold': ['Booked', 'Cancelled'], Booked: ['Cancelled'] }

export async function changeBookingStatus(
  session: ActorSession,
  bookingId: string,
  input: Record<string, unknown>,
  options: { now?: Clock } = {},
): Promise<ChangeStatusResult> {
  const target = input.target_status
  if (target !== 'Booked' && target !== 'Cancelled') invalid('target_status must be Booked or Cancelled')
  const reason = typeof input.cancellation_reason === 'string' ? input.cancellation_reason.trim() : ''
  if (target === 'Cancelled' && !reason) invalid('cancellation_reason is required to cancel') // #10
  const now = (options.now ?? systemClock)().getTime()
  const repository = demoRepository()

  return withBookingWriteLock(() => {
    // BR-001 first: a denied request writes nothing. Then expiry, so a confirm at or after
    // hold_expires_at finds the Booking already Cancelled (#45, #50), and a fresh read.
    if (loadBookingForActor(session, bookingId).view !== 'provider') throw new BookingError('FORBIDDEN', 'Only the Local Provider of this Booking can change its status')
    expireDueHoldsLocked(new Date(now))
    const { booking } = loadBookingForActor(session, bookingId)
    if (booking.status === 'Completed' || booking.status === 'Cancelled') {
      throw new BookingError('BOOKING_TERMINAL', `A ${booking.status} Booking cannot change status`) // BR-011
    }
    if (!(ALLOWED[booking.status] ?? []).includes(target)) {
      throw new BookingError('INVALID_TRANSITION', `${booking.status} → ${target} is not an allowed transition`)
    }

    const at = hanoiTimestamp(now)
    const entry: StatusHistoryEntry = {
      from_status: booking.status, to_status: target, changed_by: session.userId ?? '', changed_at: at,
      reason: target === 'Cancelled' ? reason : '',
    }
    const sync = bookingUpdateOperations({ ...booking, status: target, updated_at: at }, at)
    // BR-019, #44: status, history and message in one persist.
    repository.applyBatch([
      { table: 'bookings', match: row => row.booking_id === booking.booking_id && row.status === booking.status, changes: { status: target, updated_at: at } },
      { table: 'booking_status_history', row: { history_id: randomUUID(), booking_id: booking.booking_id, ...entry } },
      ...sync.operations,
    ])
    return { booking_status: target, status_history_entry: entry, schedules_synced: true, agency_notification_message_id: sync.messageId }
  })
}
