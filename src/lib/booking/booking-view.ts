import type { DemoRow } from '../demo/types'
import { hanoiClock, hanoiDate } from '../time/hanoi-time'
import { bookingCode, slotPeriod, slotRange } from './display'

// View model of the booking screens 06/07 (Tour Agency) and 10/10c (Local Provider), mockup 19/11.
// Client-safe: pure function of stored rows. Money is VND, dates are Asia/Ho_Chi_Minh.
const WEEKDAY = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
const dmy = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`
const weekday = (date: string) => WEEKDAY[new Date(`${date}T00:00:00Z`).getUTCDay()]

export interface BookingView {
  code: string; status: string; experienceName: string; providerName: string; agencyName: string; address: string
  dateLong: string; range: string; period: string; minutes: number
  price: { perGuest: number; guests: number; listTotal: number; total: number; discount: number; discountPct: number }
  holdUntil: string; holdLeft: string
  /** 1 Gửi yêu cầu, 2 Xưởng giữ chỗ, 3 Thanh toán, 4 Hoàn thành; value = the current step, 5 = all done, 0 = cancelled. */
  step: 0 | 3 | 4 | 5
  cancelLine: string; contactName: string; contactPhone: string; note: string
}

export function bookingView(input: { booking: DemoRow; experience: Partial<DemoRow> | undefined; providerName: string; agencyName: string; now: Date }): BookingView {
  const { booking, experience } = input
  const guests = Number(booking.group_size)
  const perGuest = Number(experience?.price_per_person ?? 0)
  const listTotal = perGuest * guests
  const total = Number(booking.agreed_price_total)
  const discount = listTotal > total ? listTotal - total : 0
  const day = hanoiDate(booking.start_at)
  let holdUntil = '', holdLeft = ''
  if (booking.status === 'On hold' && booking.hold_expires_at) {
    const end = Date.parse(booking.hold_expires_at)
    const d = hanoiDate(booking.hold_expires_at)
    holdUntil = `${hanoiClock(booking.hold_expires_at)}, ${weekday(d)} ${d.slice(8, 10)}/${d.slice(5, 7)}`
    const left = Math.max(0, end - input.now.getTime())
    const days = Math.floor(left / 86_400_000), hours = Math.floor((left % 86_400_000) / 3_600_000)
    holdLeft = days > 0 ? `${days} ngày ${hours} giờ` : `${hours} giờ ${Math.floor((left % 3_600_000) / 60_000)} phút`
  }
  let cancelLine = ''
  try {
    const policy = (JSON.parse(booking.conditions_snapshot) as { cancellation_policy?: { before_hours?: number; refund_percent?: number } }).cancellation_policy
    if (policy?.before_hours !== undefined && policy.refund_percent !== undefined) cancelLine = `Huỷ trước ${policy.before_hours} giờ: hoàn ${policy.refund_percent}% số tiền`
  } catch { /* snapshot is not JSON: no line */ }
  return {
    code: bookingCode(booking.booking_id), status: booking.status,
    experienceName: experience?.name ?? '', providerName: input.providerName, agencyName: input.agencyName, address: experience?.experience_location_address ?? '',
    dateLong: `${weekday(day)}, ${dmy(day)}`, range: slotRange(booking.start_at, booking.end_at), period: slotPeriod(booking.start_at), minutes: Number(booking.duration_minutes),
    price: { perGuest, guests, listTotal, total, discount, discountPct: discount ? Math.round(discount * 100 / listTotal) : 0 },
    holdUntil, holdLeft,
    step: booking.status === 'On hold' ? 3 : booking.status === 'Booked' ? 4 : booking.status === 'Completed' ? 5 : 0,
    cancelLine, contactName: booking.contact_name ?? '', contactPhone: booking.contact_phone ?? '', note: booking.note ?? '',
  }
}

const money = (value: number) => `${value.toLocaleString('vi-VN')} ₫`

/** Rows of screen 10d "Tour đã hoàn thành!" (label, value), from a Completed booking. */
export function completionRows(view: BookingView, booking: DemoRow): [string, string][] {
  const arrived = booking.arrival_at ? `${hanoiClock(booking.arrival_at)}, ${hanoiDate(booking.arrival_at).split('-').reverse().join('/')}` : ''
  return [
    ['Mã đặt chỗ', view.code], ['Trải nghiệm', view.experienceName],
    ['Ngày giờ', `${view.range.slice(0, 5)}, ${view.dateLong.replace(', ', ' ')}`], ['Số khách', `${view.price.guests} khách`],
    ['Đã nhận', money(view.price.total)], ['Xác nhận lúc', arrived], ['Trạng thái', 'Hoàn thành tour'],
  ]
}
