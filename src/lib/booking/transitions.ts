import { BookingError } from './create-booking'

// The one place that decides whether a Booking status may change (UI v3 decisions 20/11, #1, #5).
// Edges: On hold → Booked | Cancelled; Booked → Completed | Cancelled. Nothing else.
// Who: the Local Provider may take every edge. The Tour Agency may only cancel an On hold Booking.
// A cancellation always needs a reason.

export type BookingStatus = 'On hold' | 'Booked' | 'Completed' | 'Cancelled'
export type TransitionActor = 'provider' | 'agency'

const EDGES: Record<string, readonly string[]> = { 'On hold': ['Booked', 'Cancelled'], Booked: ['Completed', 'Cancelled'] }

export function assertTransition(input: { actor: TransitionActor; from: string; to: string; reason?: string }): void {
  const { actor, from, to } = input
  if (to === 'Cancelled' && !(input.reason ?? '').trim()) {
    throw new BookingError('VALIDATION_ERROR', 'cancellation_reason is required to cancel')
  }
  if (from === 'Completed' || from === 'Cancelled') throw new BookingError('BOOKING_TERMINAL', `A ${from} Booking cannot change status`)
  if (!(EDGES[from] ?? []).includes(to)) throw new BookingError('INVALID_TRANSITION', `${from} → ${to} is not an allowed transition`)
  if (actor === 'agency' && !(from === 'On hold' && to === 'Cancelled')) {
    throw new BookingError('FORBIDDEN', 'A Tour Agency can only cancel a Booking that is On hold')
  }
}
