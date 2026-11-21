// Screen 38 (mockup v3): pure aggregation behind the admin overview.
import { describe, expect, it } from 'vitest'
import { buildOverview, monthRange, type OverviewInput } from '@/lib/adm/v3-overview'

const providers = [
  { provider_id: 'p1', business_name: 'Xưởng A', village_id: 'v1', account_status: 'Active', review_status: 'Verified' },
  { provider_id: 'p2', business_name: 'Xưởng B', village_id: 'v2', account_status: 'Active', review_status: 'Pending Verification' },
  { provider_id: 'p3', business_name: 'Xưởng C', village_id: 'v1', account_status: 'Disabled', review_status: 'Verified' },
]
const agencies = [
  { agency_id: 'a1', company_name: 'Công ty 1', account_status: 'Approved' },
  { agency_id: 'a2', company_name: 'Công ty 2', account_status: 'Pending Approval' },
  { agency_id: 'a3', company_name: 'Công ty 3', account_status: 'Approved' },
]
const b = (id: string, provider_id: string, agency_id: string, status: string, created_at: string, group_size = 10, chat?: string) =>
  ({ booking_id: id, provider_id, agency_id, status, created_at, group_size, source_chat_session_id: chat })
const input = (over: Partial<OverviewInput> = {}): OverviewInput => ({
  villageId: null, from: '2026-09-01', to: '2026-11-15', today: '2026-11-15',
  providers, agencies,
  bookings: [
    b('b1', 'p1', 'a1', 'Completed', '2026-09-05T03:00:00Z', 10, 'c1'),
    b('b2', 'p1', 'a1', 'Booked', '2026-10-05T03:00:00Z', 5, 'c2'),
    b('b3', 'p2', 'a3', 'On hold', '2026-11-02T03:00:00Z', 7),
    b('b4', 'p2', 'a3', 'Cancelled', '2026-11-03T03:00:00Z', 9),
    b('b5', 'p1', 'a1', 'Completed', '2026-08-01T03:00:00Z', 4), // before the range
  ],
  chats: [
    { chat_session_id: 'c1', agency_id: 'a1', provider_id: 'p1', created_at: '2026-09-04T03:00:00Z' },
    { chat_session_id: 'c2', agency_id: 'a1', provider_id: 'p1', created_at: '2026-10-04T03:00:00Z' },
    { chat_session_id: 'c3', agency_id: 'a3', provider_id: 'p2', created_at: '2026-11-01T03:00:00Z' },
    { chat_session_id: 'c4', agency_id: 'a3', provider_id: 'p2', created_at: '2026-07-01T03:00:00Z' }, // outside
  ],
  ...over,
})

describe('monthRange', () => {
  it('lists every month between two dates, oldest first', () => {
    expect(monthRange('2026-06-01', '2026-11-15').map(m => m.key)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'])
    expect(monthRange('2026-06-01', '2026-11-15')[0].label).toBe('T6')
  })
})

describe('buildOverview', () => {
  it('cards: counts by account scope; pending numbers come from review status', () => {
    const o = buildOverview(input())
    expect(o.cards.agencies).toEqual({ total: 3, pending: 1 })
    expect(o.cards.providers).toEqual({ total: 3, active: 1, pending: 1 })
    expect(o.cards.bookingsThisMonth).toBe(2) // b3 and b4 created in November, cancelled counted
    expect(o.cards.monthNumber).toBe(11)
  })

  it('monthly stack counts bookings created inside the range by status', () => {
    const o = buildOverview(input())
    expect(o.monthly.map(m => m.key)).toEqual(['2026-09', '2026-10', '2026-11'])
    expect(o.monthly[0]).toMatchObject({ total: 1, counts: { Completed: 1, Booked: 0, 'On hold': 0, Cancelled: 0 } })
    expect(o.monthly[2]).toMatchObject({ total: 2, counts: { 'On hold': 1, Cancelled: 1 } })
  })

  it('funnel: chats in range, chats with a booking, paid (Booked or Completed), completed', () => {
    const o = buildOverview(input())
    expect(o.funnel).toEqual({ chats: 3, withBooking: 2, paid: 2, completed: 1, bookingsPer100Chats: 67 })
  })

  it('funnel shows zero rate when there are no chats', () => {
    const o = buildOverview(input({ chats: [] }))
    expect(o.funnel.chats).toBe(0)
    expect(o.funnel.bookingsPer100Chats).toBe(0)
  })

  it('top five ignore cancelled bookings and rank by bookings, then guests', () => {
    const o = buildOverview(input())
    expect(o.topProviders).toEqual([
      { id: 'p1', name: 'Xưởng A', bookings: 2, guests: 15 },
      { id: 'p2', name: 'Xưởng B', bookings: 1, guests: 7 },
    ])
    expect(o.topAgencies.map(r => r.id)).toEqual(['a1', 'a3'])
  })

  it('UBND scope: only that village, agencies only when they have activity there', () => {
    const o = buildOverview(input({ villageId: 'v1' }))
    expect(o.cards.providers.total).toBe(2)
    expect(o.cards.agencies.total).toBe(1)
    expect(o.monthly.reduce((n, m) => n + m.total, 0)).toBe(2)
    expect(o.topProviders.map(r => r.id)).toEqual(['p1'])
    expect(o.funnel.chats).toBe(2)
  })

  it('a booking on the last day of the range counts (Hanoi date, not UTC)', () => {
    const late = b('b9', 'p1', 'a1', 'Booked', '2026-11-15T18:00:00Z') // 16/11 01:00 Hanoi
    const o = buildOverview(input({ bookings: [late] }))
    expect(o.monthly.reduce((n, m) => n + m.total, 0)).toBe(0)
  })
})
