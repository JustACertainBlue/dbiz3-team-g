// Screens 29 / 30 / 33: day cells of the provider month calendar and the dashboard numbers. Read-only over the
// existing rows; the booking and availability logic is not changed (human instruction: the stat cells only read data).
import { addDays, hanoiDate } from '@/lib/booking/clock'
import { isoWeekdayInHanoi } from '@/lib/booking/operating-hours'

type Row = Record<string, string | undefined>
export type DayState = 'free' | 'hold' | 'booked' | 'closed'
export interface DayCell {
  date: string; state: DayState; past: boolean
  /** First booking of the day: the agency (calendar cell, panel line 1) and the experience; guests = total of all On hold / Booked bookings. */
  company?: string; experience?: string; guests?: number; bookingId?: string; startTime?: string; groups?: number
}

export function monthDays(seed: { hours: Row[]; bookings: Row[]; experiences: Row[]; agencies?: Row[] }, from: string, to: string, today: string): DayCell[] {
  const cells: DayCell[] = []
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const weekday = isoWeekdayInHanoi(`${date}T12:00:00+07:00`)
    const open = seed.hours.some(row => Number(row.weekday) === weekday && row.local_start && row.local_end)
    const own = seed.bookings.filter(b => (b.status === 'On hold' || b.status === 'Booked') && hanoiDate(Date.parse(b.start_at as string)) === date)
      .sort((a, b) => (a.start_at as string).localeCompare(b.start_at as string))
    const cell: DayCell = { date, past: date < today, state: open ? 'free' : 'closed' }
    if (own.length) {
      cell.state = own.some(b => b.status === 'Booked') ? 'booked' : 'hold'
      cell.guests = own.reduce((sum, b) => sum + Number(b.group_size || 0), 0)
      cell.groups = own.length
      cell.bookingId = own[0].booking_id
      cell.startTime = new Date(Date.parse(own[0].start_at as string)).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false })
      cell.experience = seed.experiences.find(e => e.experience_id === own[0].experience_id)?.name
      cell.company = seed.agencies?.find(a => a.agency_id === own[0].agency_id)?.company_name || cell.experience
    }
    cells.push(cell)
  }
  return cells
}

/** Dashboard cells 2 and 4: groups / guests of On hold + Booked bookings in the next 30 days, and non-archived experiences. */
export function providerStats(seed: { bookings: Row[]; experiences: Row[] }, providerId: string, now: number) {
  const end = now + 30 * 86_400_000
  const upcoming = seed.bookings.filter(b => (b.provider_id === undefined || b.provider_id === providerId) && (b.status === 'On hold' || b.status === 'Booked')
    && Date.parse(b.start_at as string) >= now && Date.parse(b.start_at as string) <= end)
  return {
    upcomingGroups: upcoming.length,
    upcomingGuests: upcoming.reduce((sum, b) => sum + Number(b.group_size || 0), 0),
    activeExperiences: seed.experiences.filter(e => e.provider_id === providerId && !e.archived_at).length,
  }
}

const DAY_NAMES = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const windowsOf = (hours: Row[], weekday: number) => hours.filter(row => Number(row.weekday) === weekday && row.local_start && row.local_end)
  .sort((a, b) => (a.local_start as string).localeCompare(b.local_start as string)).map(row => `${row.local_start} – ${row.local_end}`).join(', ')

/** ISO weekday → opening text, open days only. */
export function hoursByWeekday(hours: Row[]): Record<number, string> {
  const result: Record<number, string> = {}
  for (let day = 1; day <= 7; day++) { const text = windowsOf(hours, day); if (text) result[day] = text }
  return result
}

/** "Giờ mở cửa" card: runs of consecutive days with the same hours; a run of 3+ days reads "Thứ 2 – Thứ 6". */
export function hoursSummary(hours: Row[]): Array<{ days: string; text: string }> {
  const runs: Array<{ from: number; to: number; text: string }> = []
  for (let day = 1; day <= 7; day++) {
    const text = windowsOf(hours, day) || 'Nghỉ'
    const last = runs[runs.length - 1]
    if (last && last.text === text) last.to = day; else runs.push({ from: day, to: day, text })
  }
  return runs.map(run => ({
    days: run.from === run.to ? DAY_NAMES[run.from] : run.to - run.from >= 2 ? `${DAY_NAMES[run.from]} – ${DAY_NAMES[run.to]}` : `${DAY_NAMES[run.from]}, ${DAY_NAMES[run.to]}`,
    text: run.text,
  }))
}
