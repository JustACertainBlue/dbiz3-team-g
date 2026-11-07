/**
 * Slice A2 (linh/prf-fixes-2) – checklist §3 #40, PRF127 view rules. Written before
 * src/lib/prf/provider-page-view.ts exists (Constitution II). Edit / Create Booking only for the
 * owning Local Provider (BR-002); the UBND review panel only for UBND and only while a version is
 * Pending Verification (spec-PRF #33, tasks T039); availability and booking_conditions shown from data.
 */
import { describe, expect, it } from 'vitest'
import { providerPageView } from '@/lib/prf/provider-page-view'
import { sessionContextFor } from '@/lib/auth/session'
import { agencyOwnerSession, guestSession, hdtSession, providerSession, ubndSession, SEED_IDS } from '../helpers/mockSession'

const BAT_TRANG = SEED_IDS.provider1Verified
const owner = sessionContextFor(providerSession(BAT_TRANG, SEED_IDS.provider1VerifiedUserId))
const ubnd = sessionContextFor(ubndSession(SEED_IDS.village1))
const agency = sessionContextFor(agencyOwnerSession())

describe('A2 | #40 PRF127 view rules (providerPageView)', () => {
  const profile = { provider_id: BAT_TRANG, verification_status: 'Verified' }

  it('shows Edit and Create Booking only to the owning Local Provider', () => {
    expect(providerPageView(profile, owner)).toMatchObject({ canEdit: true, canCreateBooking: true })
    for (const viewer of [agency, ubnd, sessionContextFor(hdtSession()), sessionContextFor(guestSession()), sessionContextFor(providerSession(SEED_IDS.providerDraft, SEED_IDS.providerDraftUserId))]) {
      expect(providerPageView(profile, viewer)).toMatchObject({ canEdit: false, canCreateBooking: false })
    }
  })

  it('shows the UBND review panel only to UBND and only while a version is Pending Verification', () => {
    expect(providerPageView({ ...profile, verification_status: 'Pending Verification' }, ubnd).canReview).toBe(true)
    expect(providerPageView(profile, ubnd).canReview).toBe(false)
    expect(providerPageView({ ...profile, verification_status: 'Pending Verification' }, sessionContextFor(hdtSession())).canReview).toBe(false)
    expect(providerPageView({ ...profile, verification_status: 'Pending Verification' }, owner).canReview).toBe(false)
  })

  it('turns availability and booking_conditions into display rows', () => {
    const view = providerPageView({
      ...profile,
      availability: { operating_hours: { 1: [{ local_start: '08:00', local_end: '17:00' }], 7: [{ local_start: '09:00', local_end: '12:00' }] } },
      booking_conditions: { notice_hours: 24 },
    }, agency)
    expect(view.operatingHours).toEqual(['Thứ Hai 08:00–17:00', 'Chủ nhật 09:00–12:00'])
    expect(view.bookingConditions).toEqual(['Báo trước (giờ): 24'])
  })
})

describe('Slice B | spec-PRF #34 pricing line on PRF127', () => {
  it('shows "từ X ₫/khách" and the capacity, or nothing without Experiences', () => {
    expect(providerPageView({ provider_id: BAT_TRANG, pricing: 90000, capacity: 30 }, agency)).toMatchObject({ pricingLine: 'từ 90.000 ₫/khách', capacityLine: 'Tối đa 30 khách' })
    expect(providerPageView({ provider_id: BAT_TRANG }, agency)).toMatchObject({ pricingLine: null, capacityLine: null })
  })
})
