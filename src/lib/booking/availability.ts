import { demoRepository } from '../demo/json-repository'
import type { DemoRow } from '../demo/types'
import { addDays, hanoiTimestamp } from './clock'
import { isoWeekdayInHanoi } from './operating-hours'

// F-SCHED-09 Calculated Availability (spec-BKG US-2). Contract: specs/013-bkg-schedule/contracts/schedule-api.md

export type CalendarStatus = 'Available' | 'On hold' | 'Booked' | 'Unavailable'
export type CalendarView = 'owner' | 'public'

export interface CalendarBlock {
  start_at: string
  end_at: string
  status: CalendarStatus
  booking_id?: string // owner view only (#73)
}

const DAY = 86_400_000
const OCCUPYING = ['On hold', 'Booked'] // Completed and Cancelled block nothing (US-2 AS-3)

// A provider_operating_hours row as stored (strings) or typed (#28).
export type HoursRow = { weekday?: string | number; local_start?: string; local_end?: string }

interface Segment { start: number; end: number; status: CalendarStatus; booking_id?: string }

function minutes(value: string): number {
  const [hour, minute, second] = value.split(':').map(Number)
  return hour * 60 + minute + (second || 0) / 60
}

// Paints [start, end) over the day's segments; later paints win.
function paint(segments: Segment[], start: number, end: number, status: CalendarStatus, booking_id?: string): Segment[] {
  if (end <= start) return segments
  const next: Segment[] = []
  for (const segment of segments) {
    if (segment.end <= start || end <= segment.start) { next.push(segment); continue }
    if (segment.start < start) next.push({ ...segment, end: start })
    if (end < segment.end) next.push({ ...segment, start: end })
  }
  next.push({ start, end, status, booking_id })
  return next.sort((a, b) => a.start - b.start)
}

function merge(segments: Segment[]): Segment[] {
  const merged: Segment[] = []
  for (const segment of segments) {
    const last = merged[merged.length - 1]
    if (last && last.end === segment.start && last.status === segment.status && last.booking_id === segment.booking_id) last.end = segment.end
    else merged.push({ ...segment })
  }
  return merged
}

// #72: per local day 00:00–24:00, half-open. Unavailable, then the operating windows of that ISO
// weekday Available (#28, #29), then On hold / Booked Bookings over it — also outside the hours (#32).
export function buildCalendarBlocks(
  hours: readonly HoursRow[],
  bookings: readonly DemoRow[],
  dateFrom: string,
  dateTo: string,
  view: CalendarView,
): CalendarBlock[] {
  const blocks: CalendarBlock[] = []
  for (let day = dateFrom; day <= dateTo; day = addDays(day, 1)) {
    const dayStart = Date.parse(`${day}T00:00:00+07:00`)
    const dayEnd = dayStart + DAY
    const weekday = isoWeekdayInHanoi(`${day}T12:00:00+07:00`)
    let segments: Segment[] = [{ start: dayStart, end: dayEnd, status: 'Unavailable' }]
    for (const row of hours) {
      if (Number(row.weekday) !== weekday) continue
      if (!row.local_start || !row.local_end) continue
      segments = paint(segments, dayStart + minutes(row.local_start) * 60_000, Math.min(dayEnd, dayStart + minutes(row.local_end) * 60_000), 'Available')
    }
    for (const booking of bookings) {
      if (!OCCUPYING.includes(booking.status)) continue
      const start = Math.max(dayStart, Date.parse(booking.start_at))
      const end = Math.min(dayEnd, Date.parse(booking.end_at))
      segments = paint(segments, start, end, booking.status as CalendarStatus, booking.booking_id)
    }
    // Public view: drop booking_id first, so adjacent Bookings merge and nothing identifies them (#73).
    const visible = view === 'owner' ? segments : segments.map(({ start, end, status }) => ({ start, end, status }))
    for (const segment of merge(visible)) {
      const block: CalendarBlock = { start_at: hanoiTimestamp(segment.start), end_at: hanoiTimestamp(segment.end), status: segment.status }
      if (view === 'owner' && segment.booking_id) block.booking_id = segment.booking_id
      blocks.push(block)
    }
  }
  return blocks
}

export interface AvailabilityResult {
  availability_calendar: CalendarBlock[]
  available_slots: { start_at: string; end_at: string }[]
  occupied_slots: { booking_id: string; start_at: string; end_at: string; status: 'On hold' | 'Booked' }[]
  calculated_at: string
}

// F-SCHED-09 (#77): internal System function, no HTTP route; date_to defaults to date_from.
export function calculateAvailability(providerId: string, range: { date_from: string; date_to?: string }, now: Date): AvailabilityResult {
  const repository = demoRepository()
  const hours = repository.all('provider_operating_hours').filter(row => row.provider_id === providerId)
  const bookings = repository.all('bookings').filter(row => row.provider_id === providerId)
  const calendar = buildCalendarBlocks(hours, bookings, range.date_from, range.date_to ?? range.date_from, 'owner')
  return {
    availability_calendar: calendar,
    available_slots: calendar.filter(block => block.status === 'Available').map(({ start_at, end_at }) => ({ start_at, end_at })),
    occupied_slots: calendar
      .filter(block => block.booking_id && (block.status === 'On hold' || block.status === 'Booked'))
      .map(block => ({ booking_id: block.booking_id!, start_at: block.start_at, end_at: block.end_at, status: block.status as 'On hold' | 'Booked' })),
    calculated_at: hanoiTimestamp(now.getTime()),
  }
}
