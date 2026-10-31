// Operating-hours fit for F-SCHED-03 (Clarifications #28, #29, #31; AC-BKG-HOURS).
// Asia/Ho_Chi_Minh has no daylight saving time, so a fixed +07:00 offset is exact.
const DAY = 86_400_000
const HANOI_OFFSET = 7 * 3_600_000

export interface OperatingHoursRow {
  weekday: string | number
  local_start: string
  local_end: string
}

function minutes(value: string): number {
  const [hour, minute, second] = value.split(':').map(Number)
  return hour * 60 + minute + (second || 0) / 60
}

function localDayStart(timestamp: number): number {
  return Math.floor((timestamp + HANOI_OFFSET) / DAY) * DAY - HANOI_OFFSET
}

// ISO 8601 weekday (1 = Monday … 7 = Sunday) of an instant, read in Asia/Ho_Chi_Minh.
export function isoWeekdayInHanoi(instant: string): number {
  const local = new Date(Date.parse(instant) + HANOI_OFFSET)
  return (local.getUTCDay() + 6) % 7 + 1
}

// True when the whole [startAt, endAt) lies inside one window of that weekday.
// No rows means no available period. An interval crossing midnight never fits.
export function fitsOperatingHours(hours: readonly OperatingHoursRow[], startAt: string, endAt: string): boolean {
  const start = Date.parse(startAt)
  const end = Date.parse(endAt)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false
  const dayStart = localDayStart(start)
  const startMinute = (start - dayStart) / 60_000
  const endMinute = (end - dayStart) / 60_000
  const weekday = isoWeekdayInHanoi(startAt)
  return hours.some(row =>
    Number(row.weekday) === weekday &&
    minutes(row.local_start) <= startMinute &&
    endMinute <= minutes(row.local_end))
}
