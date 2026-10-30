import type { ActorSession } from '../auth/demo-session'
import { demoRepository } from '../demo/json-repository'
import type { DemoRow } from '../demo/types'
import { bookingActions, type BookingActions } from './booking-actions'
import { loadBookingForActor, type BookingView } from './booking-access'
import { systemClock, type Clock } from './clock'
import { expireDueHolds } from './expire-holds'

// F-SCHED-07 Booking Detail (spec-BKG US-3). Contract: specs/011-bkg-manage/contracts/manage-booking-api.md

export interface BookingDetail {
  booking_id: string
  experience_name: string
  start_at: string
  end_at: string
  group_size: number
  agreed_price: number
  notice_period: number
  cancellation_policy: Record<string, unknown>
  status: string
  last_updated_at: string
  hold_expires_at?: string
  agency_contact?: { company_name: string; contact_info: unknown }
  provider_profile_link?: string
  actions: BookingActions
}

function parseJson(value: string | undefined): unknown {
  try {
    return value ? JSON.parse(value) : null
  } catch {
    return value
  }
}

// #57: the one place a stored Booking row (strings, DB names) becomes the FR-007 shape (spec names,
// numbers). Used by getBookingDetail and by F-SCHED-04's updated_booking.
export function toBookingDetail(booking: DemoRow, view: BookingView, now: Date): BookingDetail {
  const repository = demoRepository()
  const experience = repository.find('experiences', row => row.experience_id === booking.experience_id)
  const conditions = parseJson(booking.conditions_snapshot) as { notice_period_hours: number; cancellation_policy: Record<string, unknown> }
  const detail: BookingDetail = {
    booking_id: booking.booking_id,
    experience_name: experience?.name ?? '',
    start_at: booking.start_at,
    end_at: booking.end_at,
    group_size: Number(booking.group_size),
    agreed_price: Number(booking.agreed_price_total),
    notice_period: Number(conditions.notice_period_hours),
    cancellation_policy: conditions.cancellation_policy,
    status: booking.status,
    last_updated_at: booking.updated_at,
    actions: bookingActions(booking.status, now, booking.start_at, view),
  }
  if (booking.status === 'On hold') detail.hold_expires_at = booking.hold_expires_at
  if (view === 'provider') {
    // #53: Agency company name + contact info.
    const agency = repository.find('agency_profiles', row => row.agency_id === booking.agency_id)
    detail.agency_contact = { company_name: agency?.company_name ?? '', contact_info: parseJson(agency?.contact_info) }
  } else {
    detail.provider_profile_link = `/explore/providers/${booking.provider_id}` // #53
  }
  return detail
}

export async function getBookingDetail(session: ActorSession, bookingId: string, options: { now?: Clock } = {}): Promise<BookingDetail> {
  const now = (options.now ?? systemClock)()
  // Authorize first, so a denied read writes nothing; then expiry (#50) and a fresh read.
  loadBookingForActor(session, bookingId)
  await expireDueHolds(now)
  const { booking, view } = loadBookingForActor(session, bookingId)
  return toBookingDetail(booking, view, now)
}
