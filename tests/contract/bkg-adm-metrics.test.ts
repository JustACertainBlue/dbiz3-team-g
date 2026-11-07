import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as dashboard } from '@/app/api/adm/dashboard/route'
import { POST as createBookingRoute } from '@/app/api/bkg/bookings/route'
import { POST as changeStatusRoute } from '@/app/api/bkg/bookings/[bookingId]/status/route'
import { demoRepository } from '@/lib/demo/json-repository'

// Integration contract §7 "BKG → ADM: dashboard booking metrics" (docs/test/integration-contract.md).
// A Booking written through the BKG routes must be counted by the ADM dashboard route:
// ADM FR-009 / BR-007 (status breakdown and table), consistency-contract.md:110 (Booking totals use the
// Booking created_at within the selected period), ADM FR-005 / BR-003 / AC-ADM-SCOPE (UBND is locked to
// its village), ADM BR-002 (Admin only). Clock: 2026-11-07 10:00 Hanoi; the Booking is on Monday 2026-11-09.
const BAT_TRANG_VILLAGE = '20896522-6235-5699-aeaf-f48b8150d895'
const HA_THAI_VILLAGE = '6dfbb5e9-f92e-58a0-b090-d67cea160f62' // demo UBND (thanhvien8)
const BOOKING = {
  experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
  start_at: '2026-11-09T09:00:00+07:00', duration: 60, group_size: 10, agreed_price: 2000000,
  booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
}
const json = (url: string, account: string, method = 'GET', body?: unknown) => new NextRequest(`http://localhost:3000${url}`, {
  method, headers: { cookie: `hab_demo_account=${account}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
})
async function metrics(account: string, query: string) {
  const response = await dashboard(json(`/api/adm/dashboard?${query}`, account))
  return { status: response.status, body: await response.json() as any }
}
async function createBooking() {
  const response = await createBookingRoute(json('/api/bkg/bookings', 'provider', 'POST', BOOKING) as never)
  expect(response.status).toBe(201)
  return (await response.json()).data.booking_id as string
}
const CUSTOM = (start: string, end: string, extra = '') => `preset=Custom&startDate=${start}&endDate=${end}${extra}`
const hasRow = (body: any, id: string) => body.bookingMetrics.bookingTable.some((row: any) => row.bookingId === id)

describe('Contract BKG → ADM | dashboard booking metrics (integration-contract §7)', () => {
  beforeEach(() => { demoRepository().reset(); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-07T10:00:00+07:00')) })
  afterEach(() => vi.useRealTimers())

  it('ADM FR-009 / BR-007 (normal): a Booking created through BKG is counted On hold and listed, then moves to Booked after confirmation', async () => {
    const period = CUSTOM('2026-11-01', '2026-11-08')
    const before = (await metrics('hdt', period)).body.bookingMetrics.countsByStatus
    const id = await createBooking()
    const created = (await metrics('hdt', period)).body
    expect(created.bookingMetrics.countsByStatus['On hold']).toBe(before['On hold'] + 1)
    expect(created.bookingMetrics.bookingTable.find((row: any) => row.bookingId === id)).toMatchObject({ status: 'On hold', experienceName: 'Nặn gốm thủ công', price: 2000000 })
    expect((await changeStatusRoute(json(`/api/bkg/bookings/${id}/status`, 'provider', 'POST', { target_status: 'Booked' }) as never, { params: { bookingId: id } } as never)).status).toBe(200)
    const confirmed = (await metrics('hdt', period)).body.bookingMetrics.countsByStatus
    expect(confirmed).toMatchObject({ 'On hold': before['On hold'], Booked: before.Booked + 1 })
  })

  it('consistency-contract.md:110 created_at basis (boundary): a period that ends before the creation day does not count it, even though the Booking takes place later', async () => {
    const id = await createBooking()
    expect(hasRow((await metrics('hdt', CUSTOM('2026-11-01', '2026-11-06'))).body, id)).toBe(false)
    expect(hasRow((await metrics('hdt', CUSTOM('2026-11-01', '2026-11-08'))).body, id)).toBe(true)
    expect(hasRow((await metrics('hdt', CUSTOM('2026-11-09', '2026-11-10'))).body, id)).toBe(false) // the start_at day is not the basis
  })

  it('ADM FR-005 / BR-003 / AC-ADM-SCOPE (boundary): UBND of another village cannot see the Bát Tràng Booking even when it asks for that village; HDT can', async () => {
    const id = await createBooking()
    const ubnd = await metrics('ubnd', CUSTOM('2026-11-01', '2026-11-08', `&villageId=${BAT_TRANG_VILLAGE}`))
    expect(ubnd.status).toBe(200)
    expect(ubnd.body.scope).toMatchObject({ effectiveVillageId: HA_THAI_VILLAGE, isVillageFilterLocked: true })
    expect(hasRow(ubnd.body, id)).toBe(false)
    expect(hasRow((await metrics('hdt', CUSTOM('2026-11-01', '2026-11-08', `&villageId=${BAT_TRANG_VILLAGE}`))).body, id)).toBe(true)
  })

  it('ADM BR-002 (error): Tour Agency and Local Provider are refused (403) and Guest is 401; no metrics are returned', async () => {
    await createBooking()
    for (const [account, status] of [['agency', 403], ['provider', 403], ['guest', 401]] as const) {
      const res = await metrics(account, CUSTOM('2026-11-01', '2026-11-08'))
      expect(res.status, account).toBe(status)
      expect(res.body.bookingMetrics, account).toBeUndefined()
    }
  })

  // Issue #93 (fixed): spec-ADM FR-004 Custom start_date / end_date are whole Hanoi calendar days.
  it('consistency-contract.md:58 Asia/Ho_Chi_Minh (boundary, start date, issue #93): a Booking created at 06:00 Hanoi on 2026-11-07 is inside a Custom period that starts 2026-11-07', async () => {
    vi.setSystemTime(new Date('2026-11-07T06:00:00+07:00'))
    const id = await createBooking()
    vi.setSystemTime(new Date('2026-11-07T10:00:00+07:00'))
    expect(hasRow((await metrics('hdt', CUSTOM('2026-11-07', '2026-11-08'))).body, id)).toBe(true)
  })

  it('spec-ADM FR-004 end_date includes the whole Hanoi day (boundary, issue #93): created 23:30 Hanoi on the end date counts, the next day does not', async () => {
    vi.setSystemTime(new Date('2026-11-07T23:30:00+07:00'))
    const lateOnEndDay = await createBooking()
    vi.setSystemTime(new Date('2026-11-08T00:00:00+07:00'))
    const nextDay = (await createBookingRoute(json('/api/bkg/bookings', 'provider', 'POST', { ...BOOKING, start_at: '2026-11-16T09:00:00+07:00' }) as never))
    expect(nextDay.status).toBe(201)
    const nextDayId = (await nextDay.json()).data.booking_id
    vi.setSystemTime(new Date('2026-11-08T10:00:00+07:00'))
    const body = (await metrics('hdt', CUSTOM('2026-11-01', '2026-11-07'))).body
    expect(hasRow(body, lateOnEndDay)).toBe(true)
    expect(hasRow(body, nextDayId)).toBe(false)
  })
})
