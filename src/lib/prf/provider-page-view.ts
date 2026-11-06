// PRF127 Provider profile page: what to show to whom (slice A2, checklist §3 #40).
import { WEEKDAY_LABELS, operatingHoursToRows, type OperatingHoursByWeekday } from './provider-edit-form'
import { toSessionContext, type SessionLike } from '@/lib/auth/session'

interface ProfileForView {
  provider_id: string
  verification_status?: string
  availability?: unknown
  booking_conditions?: unknown
  pricing?: number
  capacity?: number
}

export interface ProviderPageView {
  /** BR-002: only the owning Local Provider edits its profile. */
  canEdit: boolean
  /** BKG134 is opened by the owning Local Provider only (BKG BR-001). */
  canCreateBooking: boolean
  /** T039 + spec-PRF #33: the review panel is for UBND, while a version is Pending Verification. */
  canReview: boolean
  operatingHours: string[]
  bookingConditions: string[]
  /** spec-PRF #34: "từ X ₫/khách", or null without Experiences. */
  pricingLine: string | null
  capacityLine: string | null
}

export function providerPageView(profile: ProfileForView, session: SessionLike): ProviderPageView {
  const actor = toSessionContext(session)
  const isOwner = actor.role === 'Local_Provider' && actor.providerId === profile.provider_id
  const isUbnd = actor.role === 'ADMIN' && actor.adminType === 'UBND'
  const hours = (profile.availability as { operating_hours?: OperatingHoursByWeekday } | undefined)?.operating_hours
  const conditions = profile.booking_conditions && typeof profile.booking_conditions === 'object'
    ? Object.entries(profile.booking_conditions as Record<string, unknown>)
    : []
  return {
    canEdit: isOwner,
    canCreateBooking: isOwner,
    canReview: isUbnd && profile.verification_status === 'Pending Verification',
    operatingHours: operatingHoursToRows(hours).map(row => `${WEEKDAY_LABELS[row.weekday]} ${row.local_start}–${row.local_end}`),
    pricingLine: typeof profile.pricing === 'number' ? `từ ${profile.pricing.toLocaleString('vi-VN')} ₫/khách` : null,
    capacityLine: typeof profile.capacity === 'number' ? `Tối đa ${profile.capacity} khách` : null,
    bookingConditions: conditions.map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`),
  }
}
