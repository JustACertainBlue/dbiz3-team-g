import type { DemoRow } from '../demo/types'

// Statuses that occupy a Provider time slot (BR-005; schema EXCLUDE on bookings).
// The stored status is authoritative: an expired On hold blocks until the worker cancels it (#40).
const BLOCKING_STATUSES = ['On hold', 'Booked']

// First Booking of the Provider whose half-open [start_at, end_at) overlaps the request.
// Intervals that only touch do not overlap (#41). An update excludes the Booking being moved (#47).
export function findConflict(
  bookings: readonly DemoRow[],
  providerId: string,
  startAt: string,
  endAt: string,
  excludeBookingId?: string,
): DemoRow | undefined {
  const start = Date.parse(startAt)
  const end = Date.parse(endAt)
  return bookings.find(row =>
    row.provider_id === providerId &&
    row.booking_id !== excludeBookingId &&
    BLOCKING_STATUSES.includes(row.status) &&
    Date.parse(row.start_at) < end &&
    start < Date.parse(row.end_at))
}
