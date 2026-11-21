import { randomUUID } from 'node:crypto'
import type { SessionLike } from '../auth/session'
import { demoRepository } from '../db/application-store'
import { bookingUpdateOperations } from './agency-sync'
import { loadBookingForActor } from './booking-access'
import { hanoiTimestamp, systemClock, type Clock } from './clock'
import { BookingError, invalid } from './create-booking'
import { expireDueHoldsLocked } from './expire-holds'
import { assertTransition } from './transitions'
import { withBookingWriteLock } from './write-lock'

// F-SCHED-05 Booking status transitions (spec-BKG US-5, FR-005).
// Edges and roles live in ./transitions. On hold → Booked only while now < hold_expires_at (#45).
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

export async function changeBookingStatus(
  session: SessionLike,
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

  return (await withBookingWriteLock(async () => {
    // BR-001 first: only the owning Provider or Agency may open the Booking; a denied request writes nothing.
    // Then expiry, so a confirm at or after hold_expires_at finds the Booking already Cancelled (#45, #50), and a fresh read.
    await loadBookingForActor(session, bookingId)
    ;(await expireDueHoldsLocked(new Date(now)))
    const { booking, view } = (await loadBookingForActor(session, bookingId))
    // One guard for edges and roles (BR-011, UI v3 decisions #1, #5): the Agency may only cancel an On hold Booking.
    assertTransition({ actor: view, from: booking.status, to: target, reason })

    const at = hanoiTimestamp(now)
    const entry: StatusHistoryEntry = {
      from_status: booking.status, to_status: target, changed_by: session.userId ?? '', changed_at: at,
      reason: target === 'Cancelled' ? reason : '',
    }
    const sync = (await bookingUpdateOperations({ ...booking, status: target, updated_at: at }, at))
    // BR-019, #44: status, history and message in one persist.
    ;(await repository.applyBatch([
      { table: 'bookings', match: row => row.booking_id === booking.booking_id && row.status === booking.status, changes: { status: target, updated_at: at } },
      { table: 'booking_status_history', row: { history_id: randomUUID(), booking_id: booking.booking_id, ...entry } },
      ...sync.operations,
    ]))
    return { booking_status: target, status_history_entry: entry, schedules_synced: true, agency_notification_message_id: sync.messageId }
  }))
}
