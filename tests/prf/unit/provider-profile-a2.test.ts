/**
 * Slice A2 (linh/prf-fixes-2) – checklist §3 #39 and #40. Written before the code (Constitution II).
 *
 * #39 / spec-PRF #33: Request Revision applies only to a version in Pending Verification. A Verified
 *      Provider with no pending revision is refused with 409 and stays public (BR-007).
 * #40 / FR-003: PRF127 data comes from the Provider's data, not fixed values:
 *      - `availability.operating_hours` = provider_operating_hours (spec-BKG #78 shape, ISO weekdays)
 *      - `booking_conditions` = the shown profile version's booking_conditions
 *      - `experiences` = the Provider's non-archived Experiences (FR-003 "Full: experiences")
 *      - the owner (and UBND/HDT) sees the status of the version under review (#32); others see Verified.
 *      - PRF127 view: Edit / Create Booking only for the owner; the UBND review panel only for UBND
 *        and only while a version is Pending Verification.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { getProviderProfile, reviewProvider, updateProviderProfile } from '@/lib/prf/provider-service'
import { eligibleRows } from '@/lib/explore/catalog'
import { loadExploreRuntime } from '@/lib/explore/seed-repository'
import { agencyOwnerSession, guestSession, hdtSession, providerSession, ubndSession, SEED_IDS } from '../helpers/mockSession'

const BAT_TRANG = SEED_IDS.provider1Verified
const owner = providerSession(BAT_TRANG, SEED_IDS.provider1VerifiedUserId)
const ubnd = ubndSession(SEED_IDS.village1)
const agency = agencyOwnerSession()
const profileRow = () => demoRepository().all('provider_profiles').find(row => row.provider_id === BAT_TRANG)!
const inExplore = () => eligibleRows(loadExploreRuntime()).some(row => row.provider.provider_id === BAT_TRANG)

describe('A2 | #39 Request Revision only on a Pending Verification version (spec-PRF #33, BR-007)', () => {
  beforeEach(() => demoRepository().reset())

  it('refuses Request Revision with 409 when the Verified Provider has no pending revision; nothing changes', async () => {
    const reviewsBefore = demoRepository().all('provider_verification_reviews').length
    await expect(reviewProvider(BAT_TRANG, ubnd, 'Request Revision', 'Bổ sung giấy phép.'))
      .rejects.toMatchObject({ statusCode: 409 })
    expect(profileRow().verification_status).toBe('Verified')
    expect(demoRepository().all('provider_verification_reviews')).toHaveLength(reviewsBefore)
    expect(inExplore()).toBe(true)
  })

  it('accepts Request Revision on the pending revision of a Verified Provider', async () => {
    await updateProviderProfile(BAT_TRANG, owner, { business_name: 'Xưởng gốm Bát Tràng Mới' })
    await expect(reviewProvider(BAT_TRANG, ubnd, 'Request Revision', 'Bổ sung giấy phép.'))
      .resolves.toMatchObject({ verification_status: 'Revision Required' })
  })

  it('refuses a second Request Revision on a revision that already requires revision', async () => {
    await updateProviderProfile(BAT_TRANG, owner, { business_name: 'Xưởng gốm Bát Tràng Mới' })
    await reviewProvider(BAT_TRANG, ubnd, 'Request Revision', 'Bổ sung giấy phép.')
    await expect(reviewProvider(BAT_TRANG, ubnd, 'Request Revision', 'Lần hai.'))
      .rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('A2 | #40 FR-003 profile data comes from the Provider data', () => {
  beforeEach(() => demoRepository().reset())

  it('availability holds the real weekly operating hours in the #78 shape', async () => {
    const profile = await getProviderProfile(BAT_TRANG, agency)
    expect(profile?.availability).toEqual({
      operating_hours: { 1: [{ local_start: '08:00', local_end: '17:00' }], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] },
    })
  })

  it('booking_conditions are the shown version\'s booking_conditions', async () => {
    const profile = await getProviderProfile(BAT_TRANG, agency)
    expect(profile?.booking_conditions).toEqual({ notice_hours: 24 })
  })

  it('experiences list the Provider\'s non-archived Experiences for an Agency, not for a Guest', async () => {
    const forAgency = await getProviderProfile(BAT_TRANG, agency)
    expect(forAgency?.experiences).toEqual([{
      experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', name: 'Nặn gốm thủ công', category: 'Workshop/Hands-on',
      duration_minutes: 60, max_participants: 12, price_per_person: 150000,
    }])
    expect((await getProviderProfile(BAT_TRANG, guestSession()))?.experiences).toBeUndefined()
  })

  it('the owner, UBND and HDT see the status of the revision under review; an Agency sees Verified', async () => {
    await updateProviderProfile(BAT_TRANG, owner, { business_name: 'Xưởng gốm Bát Tràng Mới' })
    expect((await getProviderProfile(BAT_TRANG, owner))?.verification_status).toBe('Pending Verification')
    expect((await getProviderProfile(BAT_TRANG, ubnd))?.verification_status).toBe('Pending Verification')
    expect((await getProviderProfile(BAT_TRANG, hdtSession()))?.verification_status).toBe('Pending Verification')
    expect((await getProviderProfile(BAT_TRANG, agency))?.verification_status).toBe('Verified')
  })
})

describe('A2 | #39 verify route answers 409 (spec-PRF #33)', () => {
  beforeEach(() => demoRepository().reset())

  it('POST verify Request Revision on a Verified Provider without a pending revision → 409, Provider stays Verified', async () => {
    // The demo UBND cookie is assigned to Hạ Thái; Approve its pending profile first, then ask for a revision.
    const { POST } = await import('@/app/api/prf/provider/[providerId]/verify/route')
    const HA_THAI = SEED_IDS.providerPending
    const verify = (body: unknown) => POST(new Request(`http://localhost:3000/api/prf/provider/${HA_THAI}/verify`, {
      method: 'POST',
      headers: { cookie: 'hab_demo_account=ubnd', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }), { params: { providerId: HA_THAI } })
    expect((await verify({ decision: 'Approve' })).status).toBe(200)
    const res = await verify({ decision: 'Request Revision', revision_comments: 'Bổ sung giấy phép.' })
    expect(res.status).toBe(409)
    const row = demoRepository().all('provider_profiles').find(r => r.provider_id === HA_THAI)!
    expect(row.verification_status).toBe('Verified')
  })
})

describe('Slice B | #40 / spec-PRF #34 pricing and capacity across Experiences', () => {
  beforeEach(() => demoRepository().reset())

  it('pricing = lowest non-archived price, capacity = largest max_participants', async () => {
    const insert = (id: string, price: string, max: string, archived = '') => demoRepository().insert('experiences', {
      experience_id: id, provider_id: BAT_TRANG, name: id, description: 'x', category: 'Workshop/Hands-on',
      duration_minutes: '60', price_per_person: price, max_participants: max, notice_period_hours: '24',
      experience_location_address: '', cancellation_policy: '{}', archived_at: archived, created_at: '', updated_at: '',
    })
    insert('cheap-small', '90000.00', '6')
    insert('big', '300000.00', '30')
    insert('archived-cheapest', '10000.00', '99', '2026-09-01T00:00:00+07:00')
    const profile = await getProviderProfile(BAT_TRANG, agency)
    expect(profile?.pricing).toBe(90000)
    expect(profile?.capacity).toBe(30)
  })

  it('a Provider without a non-archived Experience has no pricing and no capacity', async () => {
    const haThai = await getProviderProfile(SEED_IDS.providerPending, hdtSession())
    expect(haThai?.pricing).toBeUndefined()
    expect(haThai?.capacity).toBeUndefined()
  })
})
