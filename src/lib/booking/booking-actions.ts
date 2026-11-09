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

/**
 * Why "Đánh dấu đoàn đã đến" (Mark Group Arrival) is locked, shown under the BKG135 actions bar. This line is a Figma
 * addition ("Màn 3"); the spec only defines when the button is enabled (FR-007 matrix, FR-006: Booked and
 * server time >= start_at, BR-017). It returns '' exactly when the button is enabled.
 */
export function arrivalLockReason(status: string, actions: BookingActions): string {
  if (actions.mark_arrival) return ''
  if (status === 'Booked') return 'Đánh dấu đoàn đã đến: chưa tới giờ bắt đầu'
  if (status === 'On hold') return 'Đánh dấu đoàn đã đến: chỉ khi đặt chỗ đã đặt và đã tới giờ bắt đầu'
  if (status === 'Completed') return 'Đánh dấu đoàn đã đến: đặt chỗ đã hoàn tất, chỉ xem'
  if (status === 'Cancelled') return 'Đánh dấu đoàn đã đến: đặt chỗ đã huỷ, chỉ xem'
  return 'Đánh dấu đoàn đã đến: không khả dụng với trạng thái này'
}
