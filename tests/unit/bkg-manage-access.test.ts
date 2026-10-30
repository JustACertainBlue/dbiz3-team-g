import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES, type ActorSession } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { createBooking } from '@/lib/booking/create-booking'
import { updateBooking } from '@/lib/booking/update-booking'
import { changeBookingStatus } from '@/lib/booking/change-status'
import { markGroupArrival } from '@/lib/booking/mark-arrival'

// T015: BR-001, US-5 AS-7, SC-005, SC-006; spec #51.
const provider = DEMO_IDENTITIES.provider
const options = { now: () => new Date(SEED_NOW) }
const BOOKED = '4bf17b30-9819-5c47-b745-06be7171087b'
const otherProvider: ActorSession = {
  authenticated: true, role: 'LocalProvider', userId: '48255ede-2e52-565b-8369-4547416e6e8d',
  providerId: 'c8e989d4-88be-5b00-8382-a41177c4c16d', agencyId: null, villageId: null, adminType: null,
}
const snapshot = () => JSON.stringify(demoRepository().snapshot(['bookings', 'booking_status_history', 'chat_messages', 'audit_logs']))

async function onHold() {
  return (await createBooking(provider, {
    experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
    start_at: '2026-10-12T09:00:00+07:00', duration: 60, group_size: 10, agreed_price: 2000000,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
  }, options)).booking_id
}

const denied: Array<[string, ActorSession]> = [
  ['Tour Agency', DEMO_IDENTITIES.agency],
  ['UBND', DEMO_IDENTITIES.ubnd],
  ['HDT', DEMO_IDENTITIES.hdt],
  ['Guest', DEMO_IDENTITIES.guest],
  ['another Provider', otherProvider],
]

describe('T015 | only the owning Local Provider manages a Booking', () => {
  beforeEach(() => demoRepository().reset())

  it.each(denied)('%s cannot update, change status or mark arrival; nothing is written', async (_, session) => {
    const id = await onHold()
    const before = snapshot()
    await expect(updateBooking(session, id, { group_size: 11 }, options)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(changeBookingStatus(session, id, { target_status: 'Booked' }, options)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(markGroupArrival(session, BOOKED, { now: () => new Date('2026-10-05T09:00:00+07:00') })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(snapshot()).toBe(before)
  })

  it('#51: lifecycle actions stay allowed after the Provider loses Verified or the Experience is archived', async () => {
    const id = await onHold()
    demoRepository().update('provider_profiles', r => r.provider_id === provider.providerId, { verification_status: 'Revision Required' })
    await expect(updateBooking(provider, id, { group_size: 11 }, options)).resolves.toBeTruthy()
    demoRepository().update('experiences', r => r.experience_id === 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', { archived_at: '2026-09-30T00:00:00+07:00' })
    await expect(changeBookingStatus(provider, id, { target_status: 'Cancelled', cancellation_reason: 'Workshop closed' }, options)).resolves.toMatchObject({ booking_status: 'Cancelled' })
  })
})
