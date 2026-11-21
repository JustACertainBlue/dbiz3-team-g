import type { AgencyBooking } from './agency-bookings'
import { hanoiClock, hanoiDate } from '../time/hanoi-time'

// View model of screen 27 "Lịch Công ty" (mockup LichDaiLy 19/11). Cancelled Bookings are not on the calendar.
// Client-safe: pure function of the Agency's Booking rows.
export type TripState = 'hold' | 'booked' | 'done'
export type DayState = TripState | 'past' | 'none'
const STATE: Record<string, TripState | undefined> = { 'On hold': 'hold', Booked: 'booked', Completed: 'done' }
const RANK: Record<TripState, number> = { hold: 0, booked: 1, done: 2 }
const WEEKDAY = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
export const STATE_LABEL: Record<TripState, string> = { hold: 'Chờ thanh toán', booked: 'Đã thanh toán', done: 'Hoàn thành tour' }

export interface ScheduleEvent { bookingId: string; state: TripState; weekday: string; day: string; time: string; name: string; provider: string; guests: number; date: string }
export interface ScheduleDay { date: string; day: number; state: DayState; bookingId?: string }
export interface ScheduleModel {
  summary: { upcoming: number; pending: number }
  title: string; month: string; leading: number; days: ScheduleDay[]; events: ScheduleEvent[]; prev: string; next: string
}

export const shiftMonth = (month: string, delta: number): string => {
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + delta
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

export function scheduleModel(rows: readonly AgencyBooking[], month: string, today: string): ScheduleModel {
  const trips = rows.filter(row => STATE[row.status]).map(row => ({ row, state: STATE[row.status]!, date: hanoiDate(row.start_at) }))
    .sort((a, b) => Date.parse(a.row.start_at) - Date.parse(b.row.start_at) || a.row.booking_id.localeCompare(b.row.booking_id))
  const summary = {
    upcoming: trips.filter(trip => trip.state !== 'done' && trip.date >= today).length,
    pending: trips.filter(trip => trip.state === 'hold').length,
  }
  const length = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()
  const leading = (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7
  const inMonth = trips.filter(trip => trip.date.startsWith(month))
  const days: ScheduleDay[] = Array.from({ length }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, '0')}`
    const best = inMonth.filter(trip => trip.date === date).sort((a, b) => RANK[a.state] - RANK[b.state])[0]
    return { date, day: index + 1, state: best ? best.state : date < today ? 'past' : 'none', ...(best ? { bookingId: best.row.booking_id } : {}) }
  })
  const events = inMonth.map(({ row, state, date }) => ({
    bookingId: row.booking_id, state, weekday: WEEKDAY[new Date(`${date}T00:00:00Z`).getUTCDay()], day: date.slice(8, 10),
    time: `${hanoiClock(row.start_at)} – ${hanoiClock(row.end_at)}`, name: row.experience_name, provider: row.provider_name, guests: row.group_size, date,
  }))
  return { summary, title: `Tháng ${Number(month.slice(5, 7))}/${month.slice(0, 4)}`, month, leading, days, events, prev: shiftMonth(month, -1), next: shiftMonth(month, 1) }
}
