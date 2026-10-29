import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { createBooking } from '@/lib/booking/create-booking'

// T015: AC-BKG-RACE — two valid requests for the same interval; at most one commits,
// and the failed request creates no block.
const body = {
  experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69',
  agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
  start_at: '2026-10-12T09:00:00+07:00',
  duration: 60,
  group_size: 10,
  agreed_price: 2000000,
  booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
}
const options = { now: () => new Date(SEED_NOW) }

describe('T015 | concurrent creates (AC-BKG-RACE)', () => {
  beforeEach(() => demoRepository().reset())

  it('commits exactly one of two simultaneous creates on the same interval', async () => {
    const bookings = demoRepository().all('bookings').length
    const history = demoRepository().all('booking_status_history').length

    const results = await Promise.allSettled([
      createBooking(DEMO_IDENTITIES.provider, { ...body }, options),
      createBooking(DEMO_IDENTITIES.provider, { ...body }, options),
    ])

    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    expect(rejected).toHaveLength(1)
    expect(rejected[0].reason).toMatchObject({ code: 'SLOT_UNAVAILABLE' })
    expect(demoRepository().all('bookings')).toHaveLength(bookings + 1)
    expect(demoRepository().all('booking_status_history')).toHaveLength(history + 1)
  })
})
