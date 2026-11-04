/**
 * Slice A (linh/prf-fixes) – PRF US-4 / US-6 versioning of a Verified Provider.
 *
 * Written before the fix (Constitution II). Covers:
 * - FR-004 / BR-018: only a real change of Business Name, Craft Type or Business
 *   Registration is a major change; saving the current values is not.
 * - BR-007: while a major revision of a Verified Provider is pending or requires
 *   revision, the last Verified version stays public and keeps being used by
 *   Explore and Booking (spec-PRF clarification, decision Q2 2026-11-04: the
 *   review state lives on provider_profile_versions.version_status;
 *   provider_profiles.verification_status stays Verified while a version is published).
 * - US-6 AC2: approving the pending revision publishes it and supersedes the old one.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { getProviderProfile, reviewProvider, updateProviderProfile } from '@/lib/prf/provider-service'
import { eligibleRows } from '@/lib/explore/catalog'
import { loadExploreRuntime } from '@/lib/explore/seed-repository'
import { createBooking } from '@/lib/booking/create-booking'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { guestSession, providerSession, ubndSession, SEED_IDS } from '../helpers/mockSession'

const BAT_TRANG = SEED_IDS.provider1Verified // 50f2c8fc, Verified, version 1 published
const EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69' // Nặn gốm thủ công (Bát Tràng)
const TRANG_AN = '02e568d8-d65e-54b1-a554-b411150d1dcb'
const owner = providerSession(BAT_TRANG, SEED_IDS.provider1VerifiedUserId)
const ubnd = ubndSession(SEED_IDS.village1)

const profileRow = () => demoRepository().all('provider_profiles').find(row => row.provider_id === BAT_TRANG)!
const versions = () => demoRepository().all('provider_profile_versions').filter(row => row.provider_id === BAT_TRANG)
const version = (no: number) => versions().find(row => row.version_no === String(no))!
const inExplore = () => eligibleRows(loadExploreRuntime()).some(row => row.provider.provider_id === BAT_TRANG)
const book = () => createBooking(DEMO_IDENTITIES.provider, {
  experience_id: EXPERIENCE, agency_id: TRANG_AN,
  start_at: '2026-10-12T09:00:00+07:00', duration: 60, group_size: 10, agreed_price: 1500000,
  booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
}, { now: () => new Date('2026-09-30T00:00:00+07:00') })

/** What the PRF128 form sends when the Provider clicks Save without editing anything. */
function unchangedSave() {
  const v1 = version(1)
  return {
    business_name: v1.business_name,
    craft_type: v1.craft_type,
    business_registration: v1.business_registration_number,
    location_address: v1.location_address,
    general_description: v1.description,
  }
}

describe('Slice A | Save without a change on a Verified Provider (FR-004, BR-018, BR-007)', () => {
  beforeEach(() => demoRepository().reset())

  it('is not a major change: no new version, Provider stays Verified and public', async () => {
    const result = await updateProviderProfile(BAT_TRANG, owner, unchangedSave())
    expect(result.new_version_pending).toBe(false)
    expect(versions()).toHaveLength(1)
    expect(profileRow().verification_status).toBe('Verified')
    expect(profileRow().current_version_no).toBe('1')
    expect(inExplore()).toBe(true)
  })
})

describe('Slice A | real major change on a Verified Provider (BR-007, BR-018)', () => {
  beforeEach(() => demoRepository().reset())

  it('creates a Pending Verification version, but the Provider stays Verified, in Explore and bookable', async () => {
    const result = await updateProviderProfile(BAT_TRANG, owner, { ...unchangedSave(), business_name: 'Xưởng gốm Bát Tràng Mới' })
    expect(result.new_version_pending).toBe(true)
    expect(result.verification_status).toBe('Pending Verification')
    expect(version(2).version_status).toBe('Pending Verification')
    expect(version(2).business_name).toBe('Xưởng gốm Bát Tràng Mới')
    expect(version(1).version_status).toBe('Verified')
    expect(profileRow().verification_status).toBe('Verified')
    expect(profileRow().published_version_no).toBe('1')
    expect(inExplore()).toBe(true)
    expect((await getProviderProfile(BAT_TRANG, guestSession()))?.provider_name).toBe(version(1).business_name)
    await expect(book()).resolves.toMatchObject({ status: 'On hold' })
  })

  it('a second save of the pending revision edits that revision, it does not add a third version', async () => {
    await updateProviderProfile(BAT_TRANG, owner, { ...unchangedSave(), business_name: 'Tên mới 1' })
    await updateProviderProfile(BAT_TRANG, owner, { ...unchangedSave(), business_name: 'Tên mới 2' })
    expect(versions()).toHaveLength(2)
    expect(version(2).business_name).toBe('Tên mới 2')
    expect(profileRow().verification_status).toBe('Verified')
  })
})

describe('Slice A | UBND review of a pending revision of a Verified Provider (US-6, BR-007)', () => {
  beforeEach(() => demoRepository().reset())

  it('Request Revision marks only the revision; the published version stays public and bookable', async () => {
    await updateProviderProfile(BAT_TRANG, owner, { ...unchangedSave(), business_name: 'Xưởng gốm Bát Tràng Mới' })
    const result = await reviewProvider(BAT_TRANG, ubnd, 'Request Revision', 'Cần bổ sung giấy phép.')
    expect(result.verification_status).toBe('Revision Required')
    expect(version(2).version_status).toBe('Revision Required')
    expect(version(1).version_status).toBe('Verified')
    expect(profileRow().verification_status).toBe('Verified')
    expect(inExplore()).toBe(true)
    await expect(book()).resolves.toMatchObject({ status: 'On hold' })
  })

  it('Approve publishes the revision and supersedes the previous version (US-6 AC2)', async () => {
    await updateProviderProfile(BAT_TRANG, owner, { ...unchangedSave(), business_name: 'Xưởng gốm Bát Tràng Mới' })
    const result = await reviewProvider(BAT_TRANG, ubnd, 'Approve')
    expect(result.published_version_no).toBe(2)
    expect(version(2).version_status).toBe('Verified')
    expect(version(1).version_status).toBe('Superseded')
    expect(profileRow().published_version_no).toBe('2')
    expect(profileRow().verification_status).toBe('Verified')
    expect((await getProviderProfile(BAT_TRANG, guestSession()))?.provider_name).toBe('Xưởng gốm Bát Tràng Mới')
    expect(inExplore()).toBe(true)
  })
})
