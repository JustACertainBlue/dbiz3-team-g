import type { ActorSession } from '../auth/demo-session'
import { demoRepository } from '../demo/json-repository'
import { authorizeAgencyList } from './booking-access'
import { hanoiDate, isQueryDate, systemClock, type Clock } from './clock'
import { invalid } from './create-booking'
import { expireDueHolds } from './expire-holds'
import { BOOKING_STATUSES } from './list-bookings'

// F-SCHED-02 Agency Private Schedule (spec-BKG US-1; screens BKG137, SCH141). Derived from
// `bookings` (#36). Contract: specs/013-bkg-schedule/contracts/schedule-api.md

export interface AgencyBooking {
  booking_id: string
  village_name: string
  provider_name: string
  experience_name: string
  start_at: string
  end_at: string
  group_size: number
  agreed_price: number
  notice_period: number
  cancellation_policy: Record<string, unknown>
  status: string
  last_updated_at: string
}

export type AgencyQuery = Partial<Record<'status' | 'village_id' | 'date_from' | 'date_to', unknown>>

const present = (value: unknown): value is string => typeof value === 'string' && value !== ''

function validate(query: AgencyQuery) {
  const status = present(query.status) ? query.status : undefined
  if (status && !(BOOKING_STATUSES as readonly string[]).includes(status)) invalid(`status must be one of ${BOOKING_STATUSES.join(', ')}`)
  const date_from = present(query.date_from) ? query.date_from : undefined
  const date_to = present(query.date_to) ? query.date_to : undefined
  if (date_from !== undefined && !isQueryDate(date_from)) invalid('date_from must be a date YYYY-MM-DD')
  if (date_to !== undefined && !isQueryDate(date_to)) invalid('date_to must be a date YYYY-MM-DD')
  if (date_from && date_to && date_from > date_to) invalid('date_from must not be after date_to')
  return { status, village_id: present(query.village_id) ? query.village_id : undefined, date_from, date_to }
}

export async function listAgencyBookings(session: ActorSession, query: AgencyQuery, options: { now?: Clock } = {}): Promise<{ bookings: AgencyBooking[] }> {
  // #80: authorize, validate, expire, read — a denied or invalid request writes nothing.
  const agencyId = authorizeAgencyList(session)
  const valid = validate(query)
  const now = (options.now ?? systemClock)()
  await expireDueHolds(now)

  const repository = demoRepository()
  const providerOf = (providerId: string) => repository.find('provider_profiles', row => row.provider_id === providerId)
  const rows = repository.all('bookings')
    .filter(row => row.agency_id === agencyId)
    .filter(row => !valid.status || row.status === valid.status)
    .filter(row => !valid.village_id || providerOf(row.provider_id)?.village_id === valid.village_id)
    .filter(row => {
      const day = hanoiDate(Date.parse(row.start_at))
      return (!valid.date_from || day >= valid.date_from) && (!valid.date_to || day <= valid.date_to)
    })
    .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at) || (a.booking_id < b.booking_id ? -1 : a.booking_id > b.booking_id ? 1 : 0))

  const bookings = rows.map(row => {
    const provider = providerOf(row.provider_id)
    const village = provider && repository.find('villages', item => item.village_id === provider.village_id)
    // #79: the public name is the published profile version's (build-log §4, Entry 2).
    const version = provider && repository.find('provider_profile_versions', item =>
      item.provider_id === row.provider_id && item.version_no === (provider.published_version_no || provider.current_version_no))
    const experience = repository.find('experiences', item => item.experience_id === row.experience_id)
    const conditions = JSON.parse(row.conditions_snapshot || '{}') as { notice_period_hours?: number; cancellation_policy?: Record<string, unknown> }
    return {
      booking_id: row.booking_id,
      village_name: village?.name ?? '',
      provider_name: version?.business_name ?? '',
      experience_name: experience?.name ?? '',
      start_at: row.start_at,
      end_at: row.end_at,
      group_size: Number(row.group_size),
      agreed_price: Number(row.agreed_price_total),
      notice_period: Number(conditions.notice_period_hours),
      cancellation_policy: conditions.cancellation_policy ?? {},
      status: row.status,
      last_updated_at: row.updated_at,
    }
  })
  return { bookings }
}
