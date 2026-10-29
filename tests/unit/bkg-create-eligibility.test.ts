import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES, type ActorSession } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { createBooking } from '@/lib/booking/create-booking'

// T013: AS-6 / BR-001, BR-018, spec #37, #39. Every rejection writes nothing.
const EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69' // owned by Provider 50f2c8fc
const PROVIDER_USER = 'c2c7fe0d-e2cb-5402-ac90-3cd427c2e669' // user of Provider 50f2c8fc
const DRAFT_PROVIDER = 'c8e989d4-88be-5b00-8382-a41177c4c16d' // Draft, weekday 6
const DRAFT_PROVIDER_USER = '48255ede-2e52-565b-8369-4547416e6e8d'
const DRAFT_EXPERIENCE = '67a2cbab-850c-5f69-b496-59f2e9a5f594'
const AGENCY_APPROVED = '02e568d8-d65e-54b1-a554-b411150d1dcb'
const AGENCY_DISABLED = 'ab81de3b-a65e-5f0d-9407-894ac464a0e9'
const AGENCY_OTHER = '14390b41-4e6c-5b8d-be3a-05e7c5e761bd'
const AGENCY_OTHER_USER = 'fbf87ace-4c0c-5328-8a89-ef827480c778'
const options = { now: () => new Date(SEED_NOW) }

function input(overrides: Record<string, unknown> = {}) {
  return {
    experience_id: EXPERIENCE,
    agency_id: AGENCY_APPROVED,
    start_at: '2026-10-12T09:00:00+07:00',
    duration: 60,
    group_size: 10,
    agreed_price: 2000000,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
    ...overrides,
  }
}

const counts = () => [demoRepository().all('bookings').length, demoRepository().all('booking_status_history').length]

async function expectRejected(session: ActorSession, body: Record<string, unknown>, code: string) {
  const before = counts()
  await expect(createBooking(session, body, options)).rejects.toMatchObject({ code })
  expect(counts()).toEqual(before)
}

const setAccountStatus = (userId: string, status: string) =>
  demoRepository().update('user_accounts', row => row.user_id === userId, { account_status: status })

describe('T013 | createBooking eligibility', () => {
  beforeEach(() => demoRepository().reset())

  it.each(['agency', 'ubnd', 'hdt', 'guest'] as const)('AS-6 / BR-001: %s cannot create a Booking', async key => {
    await expectRejected(DEMO_IDENTITIES[key], input(), 'FORBIDDEN')
  })

  it('BR-018: a Provider that is not Verified cannot create', async () => {
    const draft: ActorSession = {
      authenticated: true, role: 'LocalProvider', userId: DRAFT_PROVIDER_USER, providerId: DRAFT_PROVIDER,
      agencyId: null, villageId: null, adminType: null,
    }
    await expectRejected(draft, input({ experience_id: DRAFT_EXPERIENCE, start_at: '2026-10-17T09:00:00+07:00' }), 'PROVIDER_NOT_ELIGIBLE')
  })

  it("BR-018: an Experience of another Provider is rejected", async () => {
    await expectRejected(DEMO_IDENTITIES.provider, input({ experience_id: DRAFT_EXPERIENCE }), 'FORBIDDEN')
  })

  it('BR-018: an archived Experience is rejected', async () => {
    demoRepository().update('experiences', row => row.experience_id === EXPERIENCE, { archived_at: '2026-09-29T08:00:00+07:00' })
    await expectRejected(DEMO_IDENTITIES.provider, input(), 'PROVIDER_NOT_ELIGIBLE')
  })

  it('#37: a Verified Provider whose account is not Active cannot create', async () => {
    setAccountStatus(PROVIDER_USER, 'Disabled')
    await expectRejected(DEMO_IDENTITIES.provider, input(), 'PROVIDER_NOT_ELIGIBLE')
  })

  it('#39: a Disabled Agency is rejected', async () => {
    await expectRejected(DEMO_IDENTITIES.provider, input({ agency_id: AGENCY_DISABLED }), 'AGENCY_NOT_ELIGIBLE')
  })

  it.each(['Pending Approval', 'Rejected'])('#39: an Agency in %s is rejected', async status => {
    setAccountStatus(AGENCY_OTHER_USER, status)
    await expectRejected(DEMO_IDENTITIES.provider, input({ agency_id: AGENCY_OTHER }), 'AGENCY_NOT_ELIGIBLE')
  })

  it('#39: an Approved Agency is accepted', async () => {
    const result = await createBooking(DEMO_IDENTITIES.provider, input(), options)
    expect(result.status).toBe('On hold')
  })

  it('an unknown Agency is not found', async () => {
    await expectRejected(DEMO_IDENTITIES.provider, input({ agency_id: '00000000-0000-4000-8000-000000000000' }), 'NOT_FOUND')
  })
})
