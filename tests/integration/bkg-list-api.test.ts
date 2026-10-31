import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import * as bookingsRoute from '@/app/api/bkg/bookings/route'

// T016: GET /api/bkg/bookings (F-SCHED-10) with the demo session cookie; contract
// specs/012-bkg-list/contracts/list-bookings-api.md. Routes use the wall clock.
type Handler = (request: never) => Promise<Response>
type Body = { data?: { bookings: Record<string, unknown>[]; status_counts: Record<string, unknown>; total_count: unknown }; error?: { code: string } }
const routes = bookingsRoute as unknown as Record<'GET' | 'POST', Handler>

async function get(account: string, query = '') {
  const request = new Request(`http://localhost:3000/api/bkg/bookings${query}`, { headers: { cookie: `hab_demo_account=${account}` } })
  const response = await routes.GET(request as never)
  return { status: response.status, json: await response.json() as Body }
}

describe('T016 | GET /api/bkg/bookings', () => {
  beforeEach(() => demoRepository().reset())

  it('provider → 200, own Bookings ascending, JSON numbers', async () => {
    const result = await get('provider')
    expect(result.status).toBe(200)
    const starts = result.json.data!.bookings.map(row => Date.parse(row.start_at as string))
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
    expect(typeof result.json.data!.total_count).toBe('number')
    expect(typeof result.json.data!.bookings[0].group_size).toBe('number')
  })

  it('status filter with no match → 200 and an empty list', async () => {
    const result = await get('provider', '?status=Cancelled')
    expect(result.status).toBe(200)
    expect(result.json.data!.bookings).toEqual([])
  })

  it('invalid queries → 400 VALIDATION_ERROR', async () => {
    const reversed = await get('provider', '?date_from=2026-10-06&date_to=2026-10-05')
    expect(reversed.status).toBe(400)
    expect(reversed.json.error?.code).toBe('VALIDATION_ERROR')
    expect((await get('provider', '?page_size=101')).status).toBe(400)
  })

  it('another Provider and every other actor → 403, authorization before validation', async () => {
    expect((await get('provider', '?provider_id=70efa801-a908-5e16-8510-fd094fbdc020')).status).toBe(403)
    for (const account of ['agency', 'ubnd', 'hdt', 'guest']) expect((await get(account)).status).toBe(403)
    const agencyInvalid = await get('agency', '?page_size=101')
    expect(agencyInvalid.status).toBe(403)
    expect(agencyInvalid.json.error?.code).toBe('FORBIDDEN')
  })

  it('POST create is unchanged (201)', async () => {
    const request = new Request('http://localhost:3000/api/bkg/bookings', {
      method: 'POST',
      headers: { cookie: 'hab_demo_account=provider', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
        start_at: '2027-01-04T09:00:00+07:00', duration: 60, group_size: 10, agreed_price: 2000000,
        booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
      }),
    })
    expect((await routes.POST(request as never)).status).toBe(201)
  })
})
