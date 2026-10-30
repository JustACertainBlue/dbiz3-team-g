import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { createBooking } from '@/lib/booking/create-booking'
import { changeBookingStatus } from '@/lib/booking/change-status'
import { listAgencyBookings } from '@/lib/booking/agency-bookings'

// T023–T025: F-SCHED-02 (US-1 AS-3, AS-4, AS-5; FR-002; SC-004; #33, #36, #79, #80).
const agency = DEMO_IDENTITIES.agency // Tràng An
const hongHa = { ...DEMO_IDENTITIES.agency, agencyId: 'ebf4fcfa-1013-5ecd-b7c6-e0d8e9fa0277' }
const holdAgency = { ...DEMO_IDENTITIES.agency, agencyId: '14390b41-4e6c-5b8d-be3a-05e7c5e761bd' }
const COMPLETED = '0971a1b6' // Tràng An, Phú Vinh, 2026-09-26, Completed
const EXPIRED_HOLD = '54d7a276-90a2-5c70-be22-cb59ea95ea14'
const at = (iso: string) => ({ now: () => new Date(iso) })
const seedNow = at(SEED_NOW)
const ids = (result: { bookings: { booking_id: string }[] }) => result.bookings.map(row => row.booking_id)
const invalid = (promise: Promise<unknown>) => expect(promise).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
const forbidden = (promise: Promise<unknown>) => expect(promise).rejects.toMatchObject({ code: 'FORBIDDEN' })
const WRITE_TABLES = ['bookings', 'booking_status_history', 'chat_messages', 'chat_sessions', 'chat_participants']
const snapshot = () => JSON.parse(JSON.stringify(WRITE_TABLES.map(table => demoRepository().all(table))))

async function trangAnHold() {
  return (await createBooking(DEMO_IDENTITIES.provider, {
    experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
    start_at: '2026-10-12T09:00:00+07:00', duration: 60, group_size: 10, agreed_price: 2000000,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
  }, seedNow)).booking_id
}

describe('T023 | only own Bookings, ordered, filtered (US-1 AS-3, AS-5)', () => {
  beforeEach(() => demoRepository().reset())

  it('each Agency sees only its own Bookings', async () => {
    const own = await listAgencyBookings(agency, {}, seedNow)
    expect(ids(own)).toHaveLength(1)
    expect(ids(own)[0].startsWith(COMPLETED)).toBe(true)
    expect(ids(await listAgencyBookings(hongHa, {}, seedNow))).toEqual(['4bf17b30-9819-5c47-b745-06be7171087b'])
  })

  it('orders ascending and filters by status, village and dates', async () => {
    const hold = await trangAnHold()
    const all = await listAgencyBookings(agency, {}, seedNow)
    expect(ids(all)[0].startsWith(COMPLETED)).toBe(true)
    expect(ids(all)[1]).toBe(hold)
    expect(ids(await listAgencyBookings(agency, { status: 'On hold' }, seedNow))).toEqual([hold])
    const batTrang = demoRepository().find('provider_profiles', row => row.provider_id === '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374')!.village_id
    expect(ids(await listAgencyBookings(agency, { village_id: batTrang }, seedNow))).toEqual([hold])
    expect(ids(await listAgencyBookings(agency, { date_from: '2026-10-01' }, seedNow))).toEqual([hold])
  })

  it('rejects invalid queries', async () => {
    await invalid(listAgencyBookings(agency, { date_from: '2026-13-01' }, seedNow))
    await invalid(listAgencyBookings(agency, { date_from: '2026-10-06', date_to: '2026-10-05' }, seedNow))
    await invalid(listAgencyBookings(agency, { status: 'Done' }, seedNow))
  })
})

describe('T024 | row fields and JSON numbers (#79)', () => {
  beforeEach(() => demoRepository().reset())

  it('has the FR-002 fields with names from village and published profile version', async () => {
    const row = (await listAgencyBookings(agency, {}, seedNow)).bookings[0] as unknown as Record<string, unknown>
    const stored = demoRepository().find('bookings', item => item.booking_id === row.booking_id)!
    const experience = demoRepository().find('experiences', item => item.experience_id === stored.experience_id)!
    expect(row).toMatchObject({
      village_name: 'Phú Vinh',
      provider_name: 'Xưởng thủ công Phú Vinh',
      experience_name: experience.name,
      start_at: stored.start_at,
      end_at: stored.end_at,
      status: 'Completed',
      last_updated_at: stored.updated_at,
    })
    for (const field of ['group_size', 'agreed_price', 'notice_period']) expect(typeof row[field]).toBe('number')
    expect(typeof row.cancellation_policy).toBe('object')
  })
})

describe('T025 | latest data, expiry after authorization, denied writes nothing (AS-4, SC-004, #36, #80)', () => {
  beforeEach(() => demoRepository().reset())

  it('reflects a status change at once', async () => {
    const hold = await trangAnHold()
    await changeBookingStatus(DEMO_IDENTITIES.provider, hold, { target_status: 'Booked' }, seedNow)
    const row = (await listAgencyBookings(agency, {}, seedNow)).bookings.find(item => item.booking_id === hold)!
    expect(row.status).toBe('Booked')
  })

  it('the owning Agency sees a due hold already expired', async () => {
    const result = await listAgencyBookings(holdAgency, {}, at('2026-10-02T00:00:00+07:00'))
    expect(result.bookings.find(row => row.booking_id === EXPIRED_HOLD)!.status).toBe('Cancelled')
  })

  it('denied and invalid requests write nothing', async () => {
    const before = snapshot()
    const due = at('2026-10-02T00:00:00+07:00')
    for (const key of ['provider', 'ubnd', 'hdt', 'guest'] as const) await forbidden(listAgencyBookings(DEMO_IDENTITIES[key], {}, due))
    await invalid(listAgencyBookings(holdAgency, { date_from: 'bad' }, due))
    expect(snapshot()).toEqual(before)
    expect(demoRepository().find('bookings', row => row.booking_id === EXPIRED_HOLD)!.status).toBe('On hold')
  })
})
