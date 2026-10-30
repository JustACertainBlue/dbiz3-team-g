import type { ActorSession } from '../auth/demo-session'
import { demoRepository } from '../demo/json-repository'
import { bookingActions } from './booking-actions'
import { authorizeProviderList } from './booking-access'
import { hanoiDate, systemClock, type Clock } from './clock'
import { invalid } from './create-booking'
import { expireDueHolds } from './expire-holds'

// F-SCHED-10 List Bookings (spec-BKG US-6). Contract: specs/012-bkg-list/contracts/list-bookings-api.md

export const BOOKING_STATUSES = ['On hold', 'Booked', 'Completed', 'Cancelled'] as const
export type StatusCounts = Record<(typeof BOOKING_STATUSES)[number], number>

export interface ListedBooking {
  booking_id: string
  experience_name: string
  agency_name: string
  start_at: string
  end_at: string
  group_size: number
  status: string
  hold_expires_at?: string
  requires_action: boolean
}

export interface BookingList {
  bookings: ListedBooking[]
  status_counts: StatusCounts
  total_count: number
}

// Query values arrive as URL strings; an empty string means "not set" (e.g. after "Xoá bộ lọc").
export type ListQuery = Partial<Record<'provider_id' | 'status' | 'date_from' | 'date_to' | 'page' | 'page_size', unknown>>

interface ValidQuery {
  status?: string
  date_from?: string
  date_to?: string
  page: number
  page_size: number
}

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100 // #63

const present = (value: unknown): value is string => typeof value === 'string' && value !== ''

function validDate(value: unknown, name: string): string | undefined {
  if (!present(value)) return undefined
  // YYYY-MM-DD and a real calendar date (#62).
  const parsed = new Date(`${value}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    invalid(`${name} must be a date YYYY-MM-DD`)
  }
  return value
}

function validInteger(value: unknown, name: string, fallback: number, max = Infinity): number {
  if (value === undefined || value === '') return fallback
  const text = String(value)
  const number = Number(text)
  if (!/^\d+$/.test(text) || number < 1 || number > max) invalid(`${name} must be an integer from 1${max === Infinity ? '' : ` to ${max}`}`)
  return number
}

function validateQuery(query: ListQuery): ValidQuery {
  const status = present(query.status) ? query.status : undefined
  if (status && !(BOOKING_STATUSES as readonly string[]).includes(status)) invalid(`status must be one of ${BOOKING_STATUSES.join(', ')}`)
  const date_from = validDate(query.date_from, 'date_from')
  const date_to = validDate(query.date_to, 'date_to')
  if (date_from && date_to && date_from > date_to) invalid('date_from must not be after date_to') // #62
  return {
    status, date_from, date_to,
    page: validInteger(query.page, 'page', 1),
    page_size: validInteger(query.page_size, 'page_size', DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
  }
}

export async function listProviderBookings(session: ActorSession, query: ListQuery, options: { now?: Clock } = {}): Promise<BookingList> {
  // Order is mandatory (#64, #67): authorize, validate, expire, read. A rejected request writes nothing.
  const providerId = authorizeProviderList(session, present(query.provider_id) ? query.provider_id : null)
  const valid = validateQuery(query)
  const now = (options.now ?? systemClock)()
  await expireDueHolds(now)

  const repository = demoRepository()
  const inRange = repository.all('bookings')
    .filter(row => row.provider_id === providerId)
    .filter(row => {
      const day = hanoiDate(Date.parse(row.start_at)) // local date of start_at, inclusive (#62)
      return (!valid.date_from || day >= valid.date_from) && (!valid.date_to || day <= valid.date_to)
    })

  // #61: counts cover Provider + date range and ignore the status filter; all four keys present.
  const status_counts = Object.fromEntries(BOOKING_STATUSES.map(status => [status, 0])) as StatusCounts
  for (const row of inRange) if (row.status in status_counts) status_counts[row.status as keyof StatusCounts] += 1

  const matching = inRange
    .filter(row => !valid.status || row.status === valid.status)
    .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at) || (a.booking_id < b.booking_id ? -1 : a.booking_id > b.booking_id ? 1 : 0)) // #60
  const page = matching.slice((valid.page - 1) * valid.page_size, valid.page * valid.page_size) // #63

  const bookings = page.map(row => {
    const experience = repository.find('experiences', item => item.experience_id === row.experience_id)
    const agency = repository.find('agency_profiles', item => item.agency_id === row.agency_id)
    const actions = bookingActions(row.status, now, row.start_at, 'provider') // #59: same rule as BKG135
    const listed: ListedBooking = {
      booking_id: row.booking_id,
      experience_name: experience?.name ?? '',
      agency_name: agency?.company_name ?? '',
      start_at: row.start_at,
      end_at: row.end_at,
      group_size: Number(row.group_size),
      status: row.status,
      requires_action: actions.confirm || actions.mark_arrival,
    }
    if (row.status === 'On hold') listed.hold_expires_at = row.hold_expires_at
    return listed
  })
  return { bookings, status_counts, total_count: matching.length }
}

// Every page of a query, MAX_PAGE_SIZE at a time (#63 caps one page).
async function allPages(session: ActorSession, query: ListQuery, options: { now?: Clock }): Promise<{ rows: ListedBooking[]; status_counts: StatusCounts }> {
  const rows: ListedBooking[] = []
  let page = 1
  for (;;) {
    const result = await listProviderBookings(session, { ...query, page: String(page), page_size: String(MAX_PAGE_SIZE) }, options)
    rows.push(...result.bookings)
    if (rows.length >= result.total_count || result.bookings.length === 0) return { rows, status_counts: result.status_counts }
    page += 1
  }
}

// DSH018 "Own booking action summary" over all of the Provider's Bookings (#65).
export async function providerBookingSummary(session: ActorSession, options: { now?: Clock } = {}): Promise<{ status_counts: StatusCounts; requires_action_count: number }> {
  const { rows, status_counts } = await allPages(session, {}, options)
  return { status_counts, requires_action_count: rows.filter(row => row.requires_action).length }
}

// BKG133: Bookings that need action but are hidden by the current filter (analyze H2).
export async function countActionsOutsideFilter(session: ActorSession, query: ListQuery, options: { now?: Clock } = {}): Promise<number> {
  const { requires_action_count } = await providerBookingSummary(session, options)
  const { page: _page, page_size: _pageSize, ...filter } = query
  const { rows } = await allPages(session, filter, options)
  return requires_action_count - rows.filter(row => row.requires_action).length
}
