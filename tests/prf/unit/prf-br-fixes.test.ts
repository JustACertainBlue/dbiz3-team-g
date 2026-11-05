/**
 * linh/br-fixes – PRF rules the G3 audit found broken in code (checklist §3 #44, #45). Written before the fix.
 *
 * - BR-017 / FR-002: a Company Name or Tax ID change creates an HDT review request
 *   (`agency_major_change_requests`, review_status "Pending Review") and the approved values stay in
 *   effect; other fields update at once.
 * - BR-014: while an Experience has an On hold or Booked Booking, price_per_person, max_participants,
 *   duration and experience_location_address cannot be changed; description and other fields can.
 *   Real Bookings decide it (seed Experience c9f9faf7 has two Booked Bookings), not a fixture id.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { updateAgencyProfile } from '@/lib/prf/agency-service'
import { updateExperience } from '@/lib/prf/experience-service'
import { agencyOwnerSession, providerSession, SEED_IDS } from '../helpers/mockSession'

const AGENCY = SEED_IDS.agency1 // Công ty Du lịch Tràng An
const owner = agencyOwnerSession(AGENCY)
const agencyRow = () => demoRepository().find('agency_profiles', row => row.agency_id === AGENCY)!
// The seed already holds one reviewed request for this Agency; only requests created by the test count.
const SEED_REQUESTS = new Set<string>()
const requests = () => demoRepository().all('agency_major_change_requests').filter(row => row.agency_id === AGENCY && !SEED_REQUESTS.has(row.major_change_id))

describe('PRF BR-017 | major Agency changes wait for HDT review', () => {
  beforeEach(() => {
    demoRepository().reset()
    SEED_REQUESTS.clear()
    for (const row of demoRepository().all('agency_major_change_requests')) SEED_REQUESTS.add(row.major_change_id)
  })

  it('a Company Name change keeps the approved name and stores a Pending Review request', async () => {
    const before = agencyRow()
    const result = await updateAgencyProfile(AGENCY, owner, { company_name: 'Công ty Du lịch Tràng An Mới' })
    expect(result.requires_hdt_rereview).toBe(true)
    expect(agencyRow().company_name).toBe(before.company_name)
    expect(requests()).toEqual([expect.objectContaining({
      proposed_company_name: 'Công ty Du lịch Tràng An Mới', review_status: 'Pending Review', reviewed_at: '',
    })])
  })

  it('a Tax ID change keeps the approved Tax ID and stores it as proposed', async () => {
    const before = agencyRow()
    await updateAgencyProfile(AGENCY, owner, { tax_id: '0109999999' })
    expect(agencyRow().tax_id).toBe(before.tax_id)
    expect(requests()).toEqual([expect.objectContaining({ proposed_tax_id: '0109999999', review_status: 'Pending Review' })])
  })

  it('non-major fields still update at once, without a review request', async () => {
    const result = await updateAgencyProfile(AGENCY, owner, { description: 'Mô tả mới của Agency.' })
    expect(result.requires_hdt_rereview).toBe(false)
    expect(agencyRow().description).toBe('Mô tả mới của Agency.')
    expect(requests()).toEqual([])
  })

  it('the same Company Name is not a major change', async () => {
    await updateAgencyProfile(AGENCY, owner, { company_name: agencyRow().company_name })
    expect(requests()).toEqual([])
  })
})

describe('PRF BR-014 | Experience fields locked by real active Bookings', () => {
  beforeEach(() => demoRepository().reset())
  const BOOKED_EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
  const COMPLETED_ONLY_EXPERIENCE = 'b70bd0fa' // Chuông "Làm nón lá": only a Completed seed Booking
  const batTrang = providerSession(SEED_IDS.provider1Verified, SEED_IDS.provider1VerifiedUserId)
  const experience = (id: string) => demoRepository().find('experiences', row => row.experience_id.startsWith(id))!

  for (const [field, value] of [['price_per_person', 99000], ['max_participants', 3], ['duration_minutes', 30], ['experience_location_address', 'Địa chỉ khác']] as const) {
    it(`refuses a ${field} change while Booked Bookings exist and changes nothing`, async () => {
      const before = experience(BOOKED_EXPERIENCE)
      await expect(updateExperience(BOOKED_EXPERIENCE, batTrang, { [field]: value })).rejects.toMatchObject({ statusCode: 409 })
      expect(experience(BOOKED_EXPERIENCE)).toEqual(before)
    })
  }

  it('still accepts a description change on that Experience', async () => {
    await updateExperience(BOOKED_EXPERIENCE, batTrang, { description: 'Mô tả mới, giá không đổi.' })
    expect(experience(BOOKED_EXPERIENCE).description).toBe('Mô tả mới, giá không đổi.')
  })

  it('does not lock an Experience whose Bookings are only Completed', async () => {
    const row = experience(COMPLETED_ONLY_EXPERIENCE)
    const provider = demoRepository().find('provider_profiles', p => p.provider_id === row.provider_id)!
    await updateExperience(row.experience_id, providerSession(row.provider_id, provider.user_id), { price_per_person: 260000 })
    expect(experience(COMPLETED_ONLY_EXPERIENCE).price_per_person).toBe('260000')
  })
})

describe('PRF BR-014 | unchanged locked values are not a change', () => {
  beforeEach(() => demoRepository().reset())

  it('sending the current price and capacity with a description edit is accepted', async () => {
    const id = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
    const row = demoRepository().find('experiences', r => r.experience_id === id)!
    const owner = providerSession(SEED_IDS.provider1Verified, SEED_IDS.provider1VerifiedUserId)
    await expect(updateExperience(id, owner, { price_per_person: Number(row.price_per_person), max_participants: Number(row.max_participants), description: 'Mô tả mới, không đổi giá.' }))
      .resolves.toMatchObject({ updated: true })
  })
})
