import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES, type ActorSession } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { createBooking } from '@/lib/booking/create-booking'
import { changeBookingStatus } from '@/lib/booking/change-status'
import { findConflict } from '@/lib/booking/conflicts'
import { expireDueHolds, expireDueHoldsLocked } from '@/lib/booking/expire-holds'

// T013: BR-004, #26, #40, #45, #46, #50, AC-BKG-EXPIRY; analyze H1 (no deadlock) and M2 (create over an expired hold).
const ON_HOLD = '54d7a276-90a2-5c70-be22-cb59ea95ea14' // Provider 70efa801, hold until 2026-10-01 08:00
const OTHER_BOOKED = '0d7cb86c-36c2-5c6e-876d-2437c0e5b4e4' // Booked of the same Provider (Tue 2026-10-06)
const EXPIRY_REASON = 'Automatic expiry: 72-hour On hold elapsed'
const row = (id: string) => demoRepository().find('bookings', r => r.booking_id === id)!
const messagesFor = (id: string) => demoRepository().all('chat_messages').filter(r => r.booking_id === id && r.message_kind === 'Booking Update')
const historyOf = (id: string) => demoRepository().all('booking_status_history').filter(r => r.booking_id === id)

function providerSession(providerId: string): ActorSession {
  const profile = demoRepository().find('provider_profiles', r => r.provider_id === providerId)!
  return { authenticated: true, role: 'LocalProvider', userId: profile.user_id, providerId, agencyId: null, villageId: null, adminType: null }
}
function withinOneSecond<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('deadlock: did not resolve within 1 s')), 1000))])
}

describe('T013 | 72-hour expiry', () => {
  beforeEach(() => demoRepository().reset())

  it('BR-004 and #46: an On hold expires exactly at hold_expires_at, System, fixed reason', async () => {
    await expireDueHolds(new Date('2026-10-01T07:59:59+07:00'))
    expect(row(ON_HOLD).status).toBe('On hold')

    await expireDueHolds(new Date('2026-10-01T08:00:00+07:00'))
    expect(row(ON_HOLD).status).toBe('Cancelled')
    expect(historyOf(ON_HOLD).at(-1)).toMatchObject({ from_status: 'On hold', to_status: 'Cancelled', changed_by: '', reason: EXPIRY_REASON })
    expect(messagesFor(ON_HOLD)).toHaveLength(1)
  })

  it('#26: running it twice changes nothing and sends no second message', async () => {
    const at = new Date('2026-10-01T08:00:00+07:00')
    await expireDueHolds(at)
    const history = historyOf(ON_HOLD).length
    await expireDueHolds(at)
    expect(historyOf(ON_HOLD)).toHaveLength(history)
    expect(messagesFor(ON_HOLD)).toHaveLength(1)
  })

  it('only On hold is expired; Booked and Cancelled are untouched', async () => {
    const before = demoRepository().all('bookings').filter(r => r.status !== 'On hold').map(r => ({ ...r }))
    await expireDueHolds(new Date('2027-01-01T00:00:00+07:00'))
    for (const b of before) expect(row(b.booking_id).status).toBe(b.status)
  })

  it('#40: an expired On hold blocks its slot until expiry runs, then frees it', async () => {
    const slot = ['2026-10-11T09:00:00+07:00', '2026-10-11T10:15:00+07:00'] as const
    const providerId = row(ON_HOLD).provider_id
    expect(findConflict(demoRepository().all('bookings'), providerId, ...slot)?.booking_id).toBe(ON_HOLD)
    await expireDueHolds(new Date('2026-10-01T08:00:00+07:00'))
    expect(findConflict(demoRepository().all('bookings'), providerId, ...slot)).toBeUndefined()
  })

  it('AC-BKG-EXPIRY and #45: confirm racing expiry at the deadline ends with one transition and one message', async () => {
    const at = new Date('2026-10-01T08:00:00+07:00')
    const session = providerSession(row(ON_HOLD).provider_id)
    const history = historyOf(ON_HOLD).length
    await Promise.allSettled([
      changeBookingStatus(session, ON_HOLD, { target_status: 'Booked' }, { now: () => at }),
      expireDueHolds(at),
    ])
    expect(row(ON_HOLD).status).toBe('Cancelled')
    expect(historyOf(ON_HOLD)).toHaveLength(history + 1)
    expect(messagesFor(ON_HOLD)).toHaveLength(1)
  })

  it('#50 and analyze H1: a service call runs expiry first inside the lock without deadlock', async () => {
    const at = new Date('2026-10-01T08:00:00+07:00')
    const session = providerSession(row(ON_HOLD).provider_id)
    await withinOneSecond(changeBookingStatus(session, OTHER_BOOKED, { target_status: 'Cancelled', cancellation_reason: 'Weather' }, { now: () => at }))
    expect(row(OTHER_BOOKED).status).toBe('Cancelled')
    expect(row(ON_HOLD).status).toBe('Cancelled')
  })

  it('expireDueHoldsLocked does the same work without taking the lock', () => {
    const expired = expireDueHoldsLocked(new Date('2026-10-01T08:00:00+07:00'))
    expect(expired).toEqual([ON_HOLD])
    expect(row(ON_HOLD).status).toBe('Cancelled')
  })

  it('analyze M2: creating over an expired hold succeeds and cancels the old hold first', async () => {
    const provider = DEMO_IDENTITIES.provider
    const body = {
      experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
      start_at: '2026-10-12T09:00:00+07:00', duration: 60, group_size: 10, agreed_price: 2000000,
      booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
    }
    const first = await createBooking(provider, body, { now: () => new Date(SEED_NOW) }) // hold until 2026-10-03T00:00
    const second = await createBooking(provider, body, { now: () => new Date('2026-10-03T00:00:00+07:00') })
    expect(second.status).toBe('On hold')
    expect(row(first.booking_id).status).toBe('Cancelled')
    expect(historyOf(first.booking_id).at(-1)).toMatchObject({ to_status: 'Cancelled', reason: EXPIRY_REASON })
    expect(messagesFor(first.booking_id).some(m => m.text.startsWith('Booking Cancelled'))).toBe(true)
  })
})
