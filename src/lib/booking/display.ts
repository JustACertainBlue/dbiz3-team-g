import { hanoiClock } from '../time/hanoi-time'

// Display helpers of the v3 booking screens (decisions 20/11 #8, #9). Pure and client-safe.

/** "HAB-" + first 6 characters of the booking id, upper case. No column is stored. */
export const bookingCode = (bookingId: string) => `HAB-${bookingId.slice(0, 6).toUpperCase()}`

/** "HH:mm–HH:mm" in Asia/Ho_Chi_Minh. */
export const slotRange = (startAt: string, endAt: string) => `${hanoiClock(startAt)}–${hanoiClock(endAt)}`

/** "Ca sáng" before 12:00, "Ca chiều" before 17:00, else "Ca tối" (start time, Hanoi). */
export function slotPeriod(startAt: string): 'Ca sáng' | 'Ca chiều' | 'Ca tối' {
  const hour = Number(hanoiClock(startAt).slice(0, 2))
  return hour < 12 ? 'Ca sáng' : hour < 17 ? 'Ca chiều' : 'Ca tối'
}

/** "Điều chỉnh theo thoả thuận: +X ₫" / "−X ₫" (U+2212), '' when the agreed price equals the rule price. */
export const adjustmentLine = (adjustment: number): string =>
  adjustment === 0 ? '' : `Điều chỉnh theo thoả thuận: ${adjustment > 0 ? '+' : '−'}${Math.abs(adjustment).toLocaleString('vi-VN')} ₫`
