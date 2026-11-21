import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { createBooking } from '@/lib/booking/create-booking'
import { chattedAgencies } from '@/lib/booking/chatted-agencies'

// Screen 35 (UI v3): contact person, phone and note are stored on the booking; only agencies that chatted are offered.
const provider = DEMO_IDENTITIES.provider
const AGENCY = DEMO_IDENTITIES.agency.agencyId!
const options = { now: () => new Date('2026-11-21T09:00:00+07:00') }
const body = (extra: Record<string, unknown> = {}) => ({
  experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: AGENCY, start_at: '2026-11-23T09:00:00+07:00', duration: 60, group_size: 10, agreed_price: 1425000,
  booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } }, ...extra,
})
const code = (promise: Promise<unknown>) => promise.then(() => 'OK', (error: { code?: string }) => error.code)

describe('chattedAgencies', () => {
  beforeEach(() => demoRepository().reset())
  it('lists approved agencies that have a chat with the provider, nobody else', async () => {
    const list = await chattedAgencies(provider.providerId!)
    expect(list.map(a => a.agency_id)).toContain(AGENCY) // the fixture shim chat
    const otherProvider = await chattedAgencies('0858b5e8-89e1-577f-904a-562150c4fe4f')
    expect(otherProvider.map(a => a.agency_id)).toContain(AGENCY) // seed chat a0b57355 of that pair
    expect(await chattedAgencies('00000000-0000-0000-0000-000000000000')).toEqual([])
  })
})
