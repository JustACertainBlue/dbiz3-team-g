/**
 * G3 audit (linh/g3-audit) – PRF rule parts that had no test (audit 05/11). Supplementary tests on
 * existing code, each proven by a mutation check (build-log Entry 43).
 *
 * - BR-003: HDT / UBND cannot edit an Agency profile either.
 * - BR-010: notice period below 0 is rejected.
 * - BR-018: Craft Type and Business Registration are major fields too (not only Business Name).
 * - BR-019: an Experience with an active seed Booking cannot be deleted (real Bookings, not a fixture id).
 * - BR-020: an Experience edit leaves the Provider's verification and published version unchanged.
 * - BR-021: saved weekly operating hours are what the profile reads back.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { updateAgencyProfile } from '@/lib/prf/agency-service'
import { deleteExperience, updateExperience } from '@/lib/prf/experience-service'
import { getProviderProfile, updateProviderProfile } from '@/lib/prf/provider-service'
import { ExperienceCreateSchema } from '@/lib/prf/validators'
import { agencyOwnerSession, hdtSession, providerSession, ubndSession, SEED_IDS } from '../helpers/mockSession'

const BAT_TRANG = SEED_IDS.provider1Verified
const owner = providerSession(BAT_TRANG, SEED_IDS.provider1VerifiedUserId)
const SEED_EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69' // seed Bookings 4bf17b30 and 5782011c are Booked on it
const profileRow = () => demoRepository().all('provider_profiles').find(row => row.provider_id === BAT_TRANG)!

describe('G3 audit | PRF BR-003 admins cannot edit an Agency profile', () => {
  beforeEach(() => demoRepository().reset())

  it('HDT and UBND get 403 on the Agency profile and nothing changes', async () => {
    const before = JSON.stringify(demoRepository().all('agency_profiles'))
    for (const admin of [hdtSession(), ubndSession(SEED_IDS.village1)]) {
      await expect(updateAgencyProfile(SEED_IDS.agency1, admin, { description: 'Admin sửa hồ sơ Agency' }))
        .rejects.toMatchObject({ statusCode: 403 })
    }
    expect(JSON.stringify(demoRepository().all('agency_profiles'))).toBe(before)
  })
})

describe('G3 audit | PRF BR-010 notice period ≥ 0', () => {
  it('rejects notice_period_hours -1 and accepts 0', () => {
    const valid = {
      name: 'x', description: 'Mô tả đủ dài cho trải nghiệm.', category: 'Workshop/Hands-on', duration_minutes: 60,
      price_per_person: 1000, max_participants: 1,
      images: ['Activity', 'Space', 'Product'].map(category => ({ url: `upload://t/${category}.jpg`, category, media_type: 'image/jpeg', file_size_bytes: 1000, width_px: 1280, height_px: 720 })),
    }
    expect(ExperienceCreateSchema.safeParse({ ...valid, notice_period_hours: -1 }).success).toBe(false)
    expect(ExperienceCreateSchema.safeParse({ ...valid, notice_period_hours: 0 }).success).toBe(true)
  })
})

describe('G3 audit | PRF BR-018 every major field', () => {
  beforeEach(() => demoRepository().reset())

  it('a Craft Type change creates a pending revision', async () => {
    const result = await updateProviderProfile(BAT_TRANG, owner, { craft_type: 'Woodcarving' })
    expect(result.new_version_pending).toBe(true)
  })

  it('a Business Registration change creates a pending revision', async () => {
    const result = await updateProviderProfile(BAT_TRANG, owner, { business_registration: 'HKD-HN-29999999' })
    expect(result.new_version_pending).toBe(true)
  })
})

describe('G3 audit | PRF BR-019 delete with a real active Booking', () => {
  beforeEach(() => demoRepository().reset())

  it('refuses to delete the seed Experience that has Booked Bookings and keeps it', async () => {
    await expect(deleteExperience(SEED_EXPERIENCE, owner)).rejects.toMatchObject({ statusCode: 409 })
    expect(demoRepository().find('experiences', row => row.experience_id === SEED_EXPERIENCE)?.archived_at).toBe('')
  })
})

describe('G3 audit | PRF BR-020 Experience edit does not touch Provider verification', () => {
  beforeEach(() => demoRepository().reset())

  it('the provider_profiles row keeps Verified and the same published version', async () => {
    const before = profileRow()
    await updateExperience(SEED_EXPERIENCE, owner, { description: 'Mô tả mới của trải nghiệm nặn gốm.' })
    expect(profileRow()).toMatchObject({ verification_status: before.verification_status, published_version_no: before.published_version_no, current_version_no: before.current_version_no })
  })
})

describe('G3 audit | PRF BR-021 operating hours round trip', () => {
  beforeEach(() => demoRepository().reset())

  it('saved weekly hours are the ones the profile returns', async () => {
    await updateProviderProfile(BAT_TRANG, owner, { operating_hours: [{ weekday: 2, local_start: '09:00', local_end: '18:00', is_closed: false }] })
    const profile = await getProviderProfile(BAT_TRANG, agencyOwnerSession())
    expect((profile?.availability as { operating_hours: Record<string, unknown> }).operating_hours).toEqual({
      1: [], 2: [{ local_start: '09:00', local_end: '18:00' }], 3: [], 4: [], 5: [], 6: [], 7: [],
    })
  })
})
