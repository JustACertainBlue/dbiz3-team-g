import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { createBooking } from '@/lib/booking/create-booking'

// T007 (AC-BKG-RACE, build-log §4): an async pause between the conflict check and the write.
// Without withBookingWriteLock both writers pass the check during the pause; with it, one waits.
const pause = () => new Promise<void>(resolve => setTimeout(resolve, 10))
const now = () => new Date(SEED_NOW)
const provider = DEMO_IDENTITIES.provider

function body(startAt: string) {
  return {
    experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69',
    agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
    start_at: startAt,
    duration: 60,
    group_size: 10,
    agreed_price: 2000000,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
  }
}

const count = (table: string) => demoRepository().all(table).length

describe('T007 | race with an async pause', () => {
  beforeEach(() => demoRepository().reset())

  it('createBooking: two creates on one interval commit exactly one', async () => {
    const bookings = count('bookings')
    const history = count('booking_status_history')

    const results = await Promise.allSettled([
      createBooking(provider, body('2026-10-12T09:00:00+07:00'), { now, afterConflictCheck: pause }),
      createBooking(provider, body('2026-10-12T09:00:00+07:00'), { now, afterConflictCheck: pause }),
    ])

    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    expect(rejected).toHaveLength(1)
    expect(rejected[0].reason).toMatchObject({ code: 'SLOT_UNAVAILABLE' })
    expect(count('bookings')).toBe(bookings + 1)
    expect(count('booking_status_history')).toBe(history + 1)
  })

  it('updateBooking: two moves into one free interval apply exactly one', async () => {
    // loaded lazily so the createBooking case above still runs before update-booking.ts exists
    const { updateBooking } = await import('@/lib/booking/update-booking')
    const first = await createBooking(provider, body('2026-10-12T09:00:00+07:00'), { now })
    const second = await createBooking(provider, body('2026-10-12T11:00:00+07:00'), { now })

    const results = await Promise.allSettled([
      updateBooking(provider, first.booking_id, { start_at: '2026-10-12T14:00:00+07:00' }, { now, afterConflictCheck: pause }),
      updateBooking(provider, second.booking_id, { start_at: '2026-10-12T14:00:00+07:00' }, { now, afterConflictCheck: pause }),
    ])

    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    expect(rejected[0]?.reason).toMatchObject({ code: 'SLOT_UNAVAILABLE' })
    const atTwo = demoRepository().all('bookings').filter(row => Date.parse(row.start_at) === Date.parse('2026-10-12T14:00:00+07:00'))
    expect(atTwo).toHaveLength(1)
  })
})
