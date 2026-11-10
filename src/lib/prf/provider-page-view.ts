// PRF127 Provider profile page: what to show to whom (slice A2, checklist §3 #40).
import { WEEKDAY_LABELS, operatingHoursToRows, type OperatingHoursByWeekday } from './provider-edit-form'
import type { SessionContext } from '@/lib/auth/session'

interface ProfileForView {
  provider_id: string
  verification_status?: string
  village_id?: string
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
  /** #217, screen-spec-PRF127 §5 #2: Experiences → EXP067, own Experience management (owner only). */
  experiencesHref: string | null
  /** #217, §5 #3 / §1: the Village name links to VIL030 (Tour Agency / Local Provider / Admin, not Guest). */
  villageHref: string | null
}

export function providerPageView(profile: ProfileForView, session: SessionContext): ProviderPageView {
  const isOwner = session.role === 'Local_Provider' && session.providerId === profile.provider_id
  const isUbnd = session.role === 'ADMIN' && session.adminType === 'UBND'
  const hours = (profile.availability as { operating_hours?: OperatingHoursByWeekday } | undefined)?.operating_hours
  const conditions = profile.booking_conditions && typeof profile.booking_conditions === 'object'
    ? Object.entries(profile.booking_conditions as Record<string, unknown>)
    : []
  return {
    canEdit: isOwner,
    experiencesHref: isOwner ? `/provider/${profile.provider_id}/experiences` : null,
    villageHref: session.authenticated && profile.village_id ? `/village/${profile.village_id}` : null,
    canCreateBooking: isOwner,
    canReview: isUbnd && profile.verification_status === 'Pending Verification',
    operatingHours: operatingHoursToRows(hours).map(row => `${WEEKDAY_LABELS[row.weekday]} ${row.local_start}–${row.local_end}`),
    pricingLine: typeof profile.pricing === 'number' ? `từ ${profile.pricing.toLocaleString('vi-VN')} ₫/khách` : null,
    capacityLine: typeof profile.capacity === 'number' ? `Tối đa ${profile.capacity} khách` : null,
    bookingConditions: conditions.map(([key, value]) => `${({cancellation_notice_hours:'Báo trước khi hủy (giờ)',deposit_percentage:'Đặt cọc (%)',notice_hours:'Báo trước (giờ)',notes:'Ghi chú'} as Record<string,string>)[key] || key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`),
  }
}
