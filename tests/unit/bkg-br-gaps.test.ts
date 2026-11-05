/**
 * G3 audit (linh/g3-audit) – BKG rule parts without a test (audit 05/11). Supplementary tests on existing
 * code, each proven by a mutation check (build-log Entry 43).
 *
 * - BR-006: the schedule API is read-only (no manual block editing).
 * - BR-007: a status change does not change Booking details.
 * - BR-011: a Completed Booking is terminal for status change and arrival too.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { ActorSession } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { changeBookingStatus } from '@/lib/booking/change-status'
import { markGroupArrival } from '@/lib/booking/mark-arrival'
import * as scheduleRoute from '@/app/api/bkg/providers/[providerId]/schedule/route'

const options = { now: () => new Date(SEED_NOW) }
const BOOKED = '4bf17b30-9819-5c47-b745-06be7171087b' // Bát Tràng, Booked, group_size in seed
const COMPLETED = '0971a1b6-0000-0000-0000-000000000000'
function providerSession(providerId: string): ActorSession {
  const profile = demoRepository().find('provider_profiles', r => r.provider_id === providerId)!
  return { authenticated: true, role: 'LocalProvider', userId: profile.user_id, providerId, agencyId: null, villageId: null, adminType: null }
}
const booking = (id: string) => demoRepository().find('bookings', row => row.booking_id === id)!
const completedId = () => demoRepository().all('bookings').find(row => row.booking_id.startsWith(COMPLETED.slice(0, 8)))!.booking_id

describe('G3 audit | BKG BR-006 schedule is read-only', () => {
  it('the schedule route exports GET only', () => {
    const route = scheduleRoute as Record<string, unknown>
    expect(typeof route.GET).toBe('function')
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) expect(route[method]).toBeUndefined()
  })
})

describe('G3 audit | BKG BR-007 status change keeps the details', () => {
  beforeEach(() => demoRepository().reset())

  it('extra detail fields sent with a status change are ignored', async () => {
    const before = booking(BOOKED)
    await changeBookingStatus(providerSession(before.provider_id), BOOKED,
      { target_status: 'Cancelled', cancellation_reason: 'Đoàn hủy', group_size: 2, agreed_price_total: 1, start_at: '2026-10-20T09:00:00+07:00' }, options)
    const after = booking(BOOKED)
    expect(after.status).toBe('Cancelled')
    expect({ group_size: after.group_size, agreed_price_total: after.agreed_price_total, start_at: after.start_at })
      .toEqual({ group_size: before.group_size, agreed_price_total: before.agreed_price_total, start_at: before.start_at })
  })
})

describe('G3 audit | BKG BR-011 Completed is terminal', () => {
  beforeEach(() => demoRepository().reset())

  it('a Completed Booking cannot be cancelled or marked again, and nothing is written', async () => {
    const id = completedId()
    const session = providerSession(booking(id).provider_id)
    const history = demoRepository().all('booking_status_history').length
    await expect(changeBookingStatus(session, id, { target_status: 'Cancelled', cancellation_reason: 'x' }, options))
      .rejects.toMatchObject({ code: 'BOOKING_TERMINAL' })
    await expect(markGroupArrival(session, id, options)).resolves.toMatchObject({ transition_applied: false, validation_error: 'Booking Not Booked', booking_status: 'Completed' })
    expect(booking(id).status).toBe('Completed')
    expect(demoRepository().all('booking_status_history')).toHaveLength(history)
  })
})
