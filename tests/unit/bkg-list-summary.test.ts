import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { createBooking } from '@/lib/booking/create-booking'
import { countActionsOutsideFilter, providerBookingSummary } from '@/lib/booking/list-bookings'

// T013: DSH018 booking action summary over all of the Provider's Bookings (#65).
// T014: BKG133 "N Booking cần xử lý nằm ngoài bộ lọc" (analyze H2).
const provider = DEMO_IDENTITIES.provider
const OCT_6 = { now: () => new Date('2026-10-06T00:00:00+07:00') }

// Analyze H1: fixtures are created with the same `now` as the call that checks them.
async function hold(startAt: string) {
  return (await createBooking(provider, {
    experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
    start_at: startAt, duration: 60, group_size: 10, agreed_price: 2000000,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
  }, OCT_6)).booking_id
}
const forbidden = (promise: Promise<unknown>) => expect(promise).rejects.toMatchObject({ code: 'FORBIDDEN' })

describe('T013 | providerBookingSummary (#65)', () => {
  beforeEach(() => demoRepository().reset())

  it('counts every Booking, across more than one page', async () => {
    for (const day of ['2026-10-12', '2026-10-19', '2026-10-26']) {
      for (let hour = 9; hour <= 15; hour++) await hold(`${day}T${String(hour).padStart(2, '0')}:00:00+07:00`)
    }
    const summary = await providerBookingSummary(provider, OCT_6)
    expect(summary.status_counts).toEqual({ 'On hold': 21, Booked: 2, Completed: 0, Cancelled: 0 })
    expect(summary.requires_action_count).toBe(22) // 21 holds + 4bf17b30 (started 2026-10-05)
    expect(typeof summary.requires_action_count).toBe('number')
  })

  it('Agency, UBND, HDT and Guest are forbidden', async () => {
    for (const key of ['agency', 'ubnd', 'hdt', 'guest'] as const) await forbidden(providerBookingSummary(DEMO_IDENTITIES[key], OCT_6))
  })
})

describe('T014 | countActionsOutsideFilter (analyze H2)', () => {
  beforeEach(() => demoRepository().reset())

  it('counts Bookings needing action that the filter hides', async () => {
    await hold('2026-10-12T09:00:00+07:00')
    const outside = await countActionsOutsideFilter(provider, { date_from: '2026-10-06' }, OCT_6)
    expect(outside).toBe(1) // 4bf17b30 (Booked, past start) is before date_from; the hold is inside
    expect(typeof outside).toBe('number')
    expect(await countActionsOutsideFilter(provider, {}, OCT_6)).toBe(0)
    expect(await countActionsOutsideFilter(provider, { status: 'On hold' }, OCT_6)).toBe(1)
  })

  it('Agency is forbidden', async () => {
    await forbidden(countActionsOutsideFilter(DEMO_IDENTITIES.agency, {}, OCT_6))
  })
})
