import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { createBooking } from '@/lib/booking/create-booking'
import { updateBooking } from '@/lib/booking/update-booking'
import { getBookingDetail } from '@/lib/booking/booking-detail'

// T029: F-SCHED-07 detail (US-3 AS-1..AS-4, #50, #53) and #57 (updated_booking = same serializer).
const provider = DEMO_IDENTITIES.provider
const options = { now: () => new Date(SEED_NOW) }
const BOOKED = '4bf17b30-9819-5c47-b745-06be7171087b' // Agency ebf4fcfa (Hồng Hà), Mon 2026-10-05 09:00
const EXPIRED_HOLD = '54d7a276-90a2-5c70-be22-cb59ea95ea14' // Provider 70efa801, hold until 2026-10-01T08:00
const hongHa = { ...DEMO_IDENTITIES.agency, agencyId: 'ebf4fcfa-1013-5ecd-b7c6-e0d8e9fa0277' }
const rejects = (promise: Promise<unknown>, code: string) => expect(promise).rejects.toMatchObject({ code })
const status = (id: string) => demoRepository().find('bookings', r => r.booking_id === id)!.status

async function onHold() {
  return (await createBooking(provider, {
    experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
    start_at: '2026-10-12T09:00:00+07:00', duration: 60, group_size: 10, agreed_price: 2000000,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
  }, options)).booking_id
}

describe('T029 | getBookingDetail (F-SCHED-07)', () => {
  beforeEach(() => demoRepository().reset())

  it('Provider view: FR-007 fields with numbers, agency_contact, no provider_profile_link (AS-1, #53, #57)', async () => {
    const detail = await getBookingDetail(provider, BOOKED, options)
    expect(detail).toMatchObject({
      booking_id: BOOKED,
      experience_name: 'Nặn gốm thủ công',
      start_at: '2026-10-05T09:00:00+07:00',
      end_at: '2026-10-05T10:00:00+07:00',
      group_size: 6,
      agreed_price: 900000,
      notice_period: 24,
      cancellation_policy: { before_hours: 24, refund_percent: 80 },
      status: 'Booked',
      last_updated_at: '2026-09-24T08:00:00+07:00', // = updated_at
      actions: { confirm: false, update: true, cancel: true, mark_arrival: false },
    })
    expect(detail.agency_contact).toMatchObject({ company_name: 'Công ty Du lịch Hồng Hà' })
    expect(JSON.stringify(detail.agency_contact)).toContain('+84932000000')
    expect(detail).not.toHaveProperty('provider_profile_link')
    expect(detail).not.toHaveProperty('hold_expires_at') // Booked
    expect(detail).not.toHaveProperty('duration_minutes')
    expect(detail).not.toHaveProperty('agreed_price_total')
  })

  it('Agency view: provider_profile_link, no agency_contact, all actions false (AS-2)', async () => {
    const detail = await getBookingDetail(hongHa, BOOKED, options)
    expect(detail.provider_profile_link).toBe('/explore/providers/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374')
    expect(detail).not.toHaveProperty('agency_contact')
    expect(detail.actions).toEqual({ confirm: false, update: false, cancel: false, mark_arrival: false })
    expect(typeof detail.group_size).toBe('number')
  })

  it('hold_expires_at only for On hold', async () => {
    const id = await onHold()
    const detail = await getBookingDetail(provider, id, options)
    expect(detail.status).toBe('On hold')
    expect(detail.hold_expires_at).toEqual(expect.any(String))
  })

  it('another Agency, UBND, HDT, Guest → FORBIDDEN (AS-3, AS-4); unknown → NOT_FOUND', async () => {
    await rejects(getBookingDetail(DEMO_IDENTITIES.agency, BOOKED, options), 'FORBIDDEN') // Tràng An is not the Agency of 4bf17b30
    for (const key of ['ubnd', 'hdt', 'guest'] as const) await rejects(getBookingDetail(DEMO_IDENTITIES[key], BOOKED, options), 'FORBIDDEN')
    await rejects(getBookingDetail(provider, 'no-such-booking', options), 'NOT_FOUND')
  })

  it('expires due holds first (#50), but a denied read writes nothing', async () => {
    const after = { now: () => new Date('2026-10-02T00:00:00+07:00') }
    await rejects(getBookingDetail(DEMO_IDENTITIES.ubnd, EXPIRED_HOLD, after), 'FORBIDDEN')
    expect(status(EXPIRED_HOLD)).toBe('On hold')
    const owner = { ...provider, providerId: '70efa801-a908-5e16-8510-fd094fbdc020' }
    expect((await getBookingDetail(owner, EXPIRED_HOLD, after)).status).toBe('Cancelled')
  })

  it('#57: updated_booking is the Provider detail read right after, with numbers; also when nothing changed (#52)', async () => {
    const id = await onHold()
    const changed = await updateBooking(provider, id, { group_size: 11 }, options)
    expect(changed.updated_booking).toEqual(await getBookingDetail(provider, id, options))
    expect(changed.updated_booking).toMatchObject({ group_size: 11, agreed_price: 2000000, notice_period: 24 })
    const same = await updateBooking(provider, id, { group_size: 11 }, options)
    expect(same.audit_log_id).toBeNull()
    expect(same.updated_booking).toEqual(await getBookingDetail(provider, id, options))
  })
})
