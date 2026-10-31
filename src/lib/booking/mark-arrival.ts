import { randomUUID } from 'node:crypto'
import type { ActorSession } from '../auth/demo-session'
import { demoRepository } from '../demo/json-repository'
import { bookingUpdateOperations } from './agency-sync'
import { loadBookingForActor } from './booking-access'
import { hanoiTimestamp, systemClock, type Clock } from './clock'
import { BookingError } from './create-booking'
import type { StatusHistoryEntry } from './change-status'
import { expireDueHoldsLocked } from './expire-holds'
import { withBookingWriteLock } from './write-lock'

// F-SCHED-06 Mark Group Arrival (spec-BKG US-5, FR-006, BR-010, #11).
// A rejected arrival is reported through transition_applied = false, not as an error.

export type MarkArrivalResult =
  | {
      transition_applied: true
      booking_status: 'Completed'
      arrived_at: string
      status_history_entry: StatusHistoryEntry
      private_schedule_synced: true
      availability_released: true
    }
  | {
      transition_applied: false
      booking_status: string
      validation_error: 'Booking Not Booked' | 'Tour Start Time Not Reached'
      private_schedule_synced: false
      availability_released: false
    }

export async function markGroupArrival(
  session: ActorSession,
  bookingId: string,
  options: { now?: Clock } = {},
): Promise<MarkArrivalResult> {
  const now = (options.now ?? systemClock)().getTime()
  const repository = demoRepository()

  return withBookingWriteLock(() => {
    // BR-001 first: a denied request writes nothing. Then expiry (#50, analyze H1) and a fresh read.
    if (loadBookingForActor(session, bookingId).view !== 'provider') throw new BookingError('FORBIDDEN', 'Only the Local Provider of this Booking can mark arrival')
    expireDueHoldsLocked(new Date(now))
    const { booking } = loadBookingForActor(session, bookingId)

    const rejected = (validation_error: 'Booking Not Booked' | 'Tour Start Time Not Reached'): MarkArrivalResult => ({
      transition_applied: false, booking_status: booking.status, validation_error, private_schedule_synced: false, availability_released: false,
    })
    if (booking.status !== 'Booked') return rejected('Booking Not Booked')
    if (now < Date.parse(booking.start_at)) return rejected('Tour Start Time Not Reached') // BR-010

    const at = hanoiTimestamp(now)
    const entry: StatusHistoryEntry = { from_status: 'Booked', to_status: 'Completed', changed_by: session.userId ?? '', changed_at: at, reason: '' }
    const sync = bookingUpdateOperations({ ...booking, status: 'Completed', arrival_at: at, updated_at: at }, at)
    // BR-016: the whole Booking completes; BR-019, #44: one persist.
    repository.applyBatch([
      { table: 'bookings', match: row => row.booking_id === booking.booking_id && row.status === 'Booked', changes: { status: 'Completed', arrival_at: at, updated_at: at } },
      { table: 'booking_status_history', row: { history_id: randomUUID(), booking_id: booking.booking_id, ...entry } },
      ...sync.operations,
    ])
    return {
      transition_applied: true, booking_status: 'Completed', arrived_at: at, status_history_entry: entry,
      private_schedule_synced: true, availability_released: true,
    }
  })
}
