import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { createBooking } from '@/lib/booking/create-booking'
import { listProviderBookings } from '@/lib/booking/list-bookings'

// Screen 34 tab "Cần xử lý" (UI v3 decision #10): On hold only, soonest hold_expires_at first.
const provider = DEMO_IDENTITIES.provider
const body = (start: string) => ({
  experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: DEMO_IDENTITIES.agency.agencyId, start_at: start, duration: 60, group_size: 5, agreed_price: 1000000,
  booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
})
const at = (iso: string) => ({ now: () => new Date(iso) })

describe('listProviderBookings tab=todo', () => {
  beforeEach(() => demoRepository().reset())

  it('returns only On hold bookings ordered by hold_expires_at ascending, not by tour date', async () => {
    // created later but the tour is earlier: the hold that expires first must still come first
    const late = (await createBooking(provider, body('2026-11-23T09:00:00+07:00'), at('2026-11-21T10:00:00+07:00'))).booking_id
    const early = (await createBooking(provider, body('2026-11-30T09:00:00+07:00'), at('2026-11-20T10:00:00+07:00'))).booking_id
    const result = await listProviderBookings(provider, { tab: 'todo' }, at('2026-11-21T11:00:00+07:00'))
    const ids = result.bookings.map(b => b.booking_id)
    expect(ids.indexOf(early)).toBeLessThan(ids.indexOf(late))
    expect(result.bookings.every(b => b.status === 'On hold')).toBe(true)
    const stamps = result.bookings.map(b => Date.parse(b.hold_expires_at!))
    expect(stamps).toEqual([...stamps].sort((a, b) => a - b))
    expect(result.total_count).toBe(result.status_counts['On hold'])
  })
  it('without the tab the order stays by tour start (unchanged)', async () => {
    const result = await listProviderBookings(provider, {}, at('2026-11-21T11:00:00+07:00'))
    const starts = result.bookings.map(b => Date.parse(b.start_at))
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
  })
  it('an unknown tab is a validation error', async () => {
    await expect(listProviderBookings(provider, { tab: 'nope' }, at('2026-11-21T11:00:00+07:00'))).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })
})
