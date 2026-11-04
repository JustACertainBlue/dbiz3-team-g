/**
 * T043 (A1) + route-level T047 (A3): ADM079 reads the shared JSON runtime, so Bookings created or
 * changed through BKG are what the dashboard shows. Time basis: docs/spec/docs/consistency-contract.md:110.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { demoRepository } from '@/lib/demo/json-repository'
import { GET as getDashboard } from '@/app/api/adm/dashboard/route'
import { POST as createBooking } from '@/app/api/bkg/bookings/route'
import { POST as changeStatus } from '@/app/api/bkg/bookings/[bookingId]/status/route'

type Json = Record<string, any>

// Same request as tests/integration/bkg-create-api.test.ts: demo Provider (Bát Tràng) books the demo
// Agency (Công ty Du lịch Tràng An) on a future Monday inside opening hours.
const bookingBody = {
  experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69',
  agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
  start_at: '2027-01-04T09:00:00+07:00',
  duration: 60,
  group_size: 10,
  agreed_price: 2000000,
  booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
}

async function dashboard(query: string, account = 'hdt'): Promise<Json> {
  const res = await getDashboard(new NextRequest(`http://localhost:3000/api/adm/dashboard?${query}`, {
    headers: { cookie: `hab_demo_account=${account}` },
  }))
  expect(res.status).toBe(200)
  return res.json()
}

const card = (data: Json, label: string) => data.metricCards.find((c: Json) => c.label === label)?.value

async function bkgCreate(): Promise<string> {
  const res = await createBooking(new Request('http://localhost:3000/api/bkg/bookings', {
    method: 'POST',
    headers: { cookie: 'hab_demo_account=provider', 'content-type': 'application/json' },
    body: JSON.stringify(bookingBody),
  }) as never)
  expect(res.status).toBe(201)
  return ((await res.json()) as Json).data.booking_id
}

async function bkgCancel(bookingId: string) {
  const res = await changeStatus(new Request(`http://localhost:3000/api/bkg/bookings/${bookingId}/status`, {
    method: 'POST',
    headers: { cookie: 'hab_demo_account=provider', 'content-type': 'application/json' },
    body: JSON.stringify({ target_status: 'Cancelled', cancellation_reason: 'Group postponed' }),
  }) as never, { params: { bookingId } } as never)
  expect(res.status).toBe(200)
}

describe('T043 | A1 ADM079 follows BKG writes in the shared runtime', () => {
  beforeEach(() => demoRepository().reset())

  it('a Booking created and cancelled through BKG appears in Last 7 days with its current status', async () => {
    const bookingId = await bkgCreate()

    const created = await dashboard('preset=Last+7+days')
    expect(card(created, 'Total Bookings')).toBe(1)
    expect(created.bookingMetrics.countsByStatus['On hold']).toBe(1)
    expect(created.bookingMetrics.bookingTable.map((r: Json) => r.bookingId)).toEqual([bookingId])
    // At the end date: 3 seed pairs with a Booked Booking + the new On hold pair. The expired seed
    // hold 54d7a276 was cancelled by the BKG expiry that ran with the create.
    expect(card(created, 'Active Collaborations')).toBe(4)

    await bkgCancel(bookingId)
    const cancelled = await dashboard('preset=Last+7+days')
    expect(cancelled.bookingMetrics.countsByStatus.Cancelled).toBe(1)
    expect(cancelled.bookingMetrics.countsByStatus['On hold']).toBe(0)
    expect(card(cancelled, 'Active Collaborations')).toBe(3)
  })

  it('the seed hold expired by BKG shows as Cancelled, as in the runtime (not On hold as in the CSV)', async () => {
    await bkgCreate()
    const data = await dashboard('preset=Last+90+days')
    const row = data.bookingMetrics.bookingTable.find((r: Json) => r.bookingId.startsWith('54d7a276'))
    expect(row.status).toBe('Cancelled')
  })
})

describe('T047 | A3 table and top 10 follow the period (route level)', () => {
  beforeEach(() => demoRepository().reset())

  it('Last 7 days after reset: no seed Booking was created in the period, so table and top 10 are empty', async () => {
    const data = await dashboard('preset=Last+7+days')
    expect(card(data, 'Total Bookings')).toBe(0)
    expect(data.bookingMetrics.bookingTable).toEqual([])
    expect(data.collaborationMetrics.topPairs).toEqual([])
  })
})
