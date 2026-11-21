import type { DemoRow } from '../demo/types'

// Statuses that occupy a Provider time slot (BR-005; schema EXCLUDE on bookings).
// The stored status is authoritative: an expired On hold blocks until the worker cancels it (#40).
const BLOCKING_STATUSES = ['On hold', 'Booked']

// Guests already held by On hold / Booked Bookings of the Experience whose time overlaps [start_at, end_at).
// Capacity is counted per time slot (UI v3 decision #7): occupancy + the new group must not exceed max_participants.
export function slotOccupancy(
  bookings: readonly DemoRow[],
  experienceId: string,
  startAt: string,
  endAt: string,
  excludeBookingId?: string,
): number {
  const start = Date.parse(startAt)
  const end = Date.parse(endAt)
  return bookings
    .filter(row =>
      row.experience_id === experienceId &&
      row.booking_id !== excludeBookingId &&
      BLOCKING_STATUSES.includes(row.status) &&
      Date.parse(row.start_at) < end &&
      start < Date.parse(row.end_at))
    .reduce((sum, row) => sum + Number(row.group_size), 0)
}

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
