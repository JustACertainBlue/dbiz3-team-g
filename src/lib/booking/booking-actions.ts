import type { BookingView } from './booking-access'

// F-SCHED-07 action buttons (FR-007 matrix, BR-017, SC-007). The Agency view never has actions.
export interface BookingActions {
  confirm: boolean
  update: boolean
  cancel: boolean
  mark_arrival: boolean
}

const NONE: BookingActions = { confirm: false, update: false, cancel: false, mark_arrival: false }

export function bookingActions(status: string, now: Date, startAt: string, actor: BookingView): BookingActions {
  if (actor !== 'provider') return { ...NONE }
  if (status === 'On hold') return { confirm: true, update: true, cancel: true, mark_arrival: false }
  if (status === 'Booked') {
    // BR-017: Mark Group Arrival only from the scheduled start onwards.
    return { confirm: false, update: true, cancel: true, mark_arrival: now.getTime() >= Date.parse(startAt) }
  }
  return { ...NONE } // Completed, Cancelled: view only
}
