import type { ActorSession } from '../auth/demo-session'
import { demoRepository } from '../demo/json-repository'
import { buildCalendarBlocks, calculateAvailability, type CalendarBlock } from './availability'
import { authorizeProviderSchedule } from './booking-access'
import { addDays, hanoiDate, isQueryDate, systemClock, type Clock } from './clock'
import { BookingError, invalid } from './create-booking'
import { expireDueHolds } from './expire-holds'

// F-SCHED-01 Provider Schedule (spec-BKG US-1) on F-SCHED-09. Contract: specs/013-bkg-schedule/contracts/schedule-api.md

export type OperatingHours = Record<string, { local_start: string; local_end: string }[]>

export interface ProviderSchedule {
  calendar_blocks: CalendarBlock[]
  operating_hours: OperatingHours
}

const DEFAULT_DAYS = 29 // FR-001: date_to = date_from + 29 days
const MAX_DAYS = 31 // #71

function validRange(query: { date_from?: unknown; date_to?: unknown }, now: Date): { date_from: string; date_to: string } {
  const date_from = query.date_from === undefined || query.date_from === '' ? hanoiDate(now.getTime()) : query.date_from
  if (!isQueryDate(date_from)) invalid('date_from must be a date YYYY-MM-DD')
  const date_to = query.date_to === undefined || query.date_to === '' ? addDays(date_from, DEFAULT_DAYS) : query.date_to
  if (!isQueryDate(date_to)) invalid('date_to must be a date YYYY-MM-DD')
  if (date_from > date_to) invalid('date_from must not be after date_to')
  if (date_to > addDays(date_from, MAX_DAYS - 1)) invalid(`the range must be at most ${MAX_DAYS} days`)
  return { date_from, date_to }
}

export async function getProviderSchedule(
  session: ActorSession,
  providerId: string,
  query: { date_from?: unknown; date_to?: unknown },
  options: { now?: Clock } = {},
): Promise<ProviderSchedule> {
  // #80: authorize, validate, expire, read — a denied or invalid request writes nothing.
  const view = authorizeProviderSchedule(session, providerId)
  const now = (options.now ?? systemClock)()
  const range = validRange(query, now)
  await expireDueHolds(now)

  const repository = demoRepository()
  // #72: blocks are per local day in both views; buildCalendarBlocks already merges within a day.
  // #73: the public view is built from an allow-list, never by deleting fields.
  const calendar_blocks = view === 'owner'
    ? calculateAvailability(providerId, range, now).availability_calendar
    : buildCalendarBlocks(
        repository.all('provider_operating_hours').filter(row => row.provider_id === providerId),
        repository.all('bookings').filter(row => row.provider_id === providerId),
        range.date_from, range.date_to, 'public',
      ).map(({ start_at, end_at, status }) => ({ start_at, end_at, status }))

  // #78: the seven ISO weekdays, each with its windows.
  const operating_hours: OperatingHours = Object.fromEntries(['1', '2', '3', '4', '5', '6', '7'].map(day => [day, []]))
  for (const row of repository.all('provider_operating_hours').filter(item => item.provider_id === providerId)) {
    operating_hours[String(Number(row.weekday))]?.push({ local_start: row.local_start, local_end: row.local_end })
  }
  return { calendar_blocks, operating_hours }
}

// SCH140 entry (#74, #82; analyze M3).
export type ScheduleEntry = 'redirect-owner' | 'public' | 'not-found' | 'denied'

export function scheduleEntryFor(session: ActorSession, providerId: string): ScheduleEntry {
  try {
    return authorizeProviderSchedule(session, providerId) === 'owner' ? 'redirect-owner' : 'public'
  } catch (error) {
    if (error instanceof BookingError && error.code === 'NOT_FOUND') return 'not-found'
    return 'denied'
  }
}

// The Explore Provider page shows "Xem lịch trống" only to an authenticated Tour Agency (#82).
export function showScheduleLink(session: ActorSession): boolean {
  return session.authenticated && session.role === 'TourAgency'
}
