import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import * as agencyRoute from '@/app/api/bkg/agency/bookings/route'

// T026: GET /api/bkg/agency/bookings (F-SCHED-02); contract specs/013-bkg-schedule/contracts/schedule-api.md.
type Handler = (request: never) => Promise<Response>
type Body = { data?: { bookings: Record<string, unknown>[] }; error?: { code: string } }
const GET = (agencyRoute as unknown as { GET: Handler }).GET

async function get(account: string, query = '') {
  const request = new Request(`http://localhost:3000/api/bkg/agency/bookings${query}`, { headers: { cookie: `hab_demo_account=${account}` } })
  const response = await GET(request as never)
  return { status: response.status, json: await response.json() as Body }
}

describe('T026 | GET /api/bkg/agency/bookings', () => {
  beforeEach(() => demoRepository().reset())

  it('agency → 200 with its own Booking and JSON numbers', async () => {
    const result = await get('agency')
    expect(result.status).toBe(200)
    const row = result.json.data!.bookings[0]
    expect(String(row.booking_id).startsWith('0971a1b6')).toBe(true)
    expect(typeof row.group_size).toBe('number')
    expect(typeof row.agreed_price).toBe('number')
  })

  it('no match → 200 []; reversed range → 400', async () => {
    const empty = await get('agency', '?status=Cancelled')
    expect(empty.status).toBe(200)
    expect(empty.json.data!.bookings).toEqual([])
    const reversed = await get('agency', '?date_from=2026-10-06&date_to=2026-10-05')
    expect(reversed.status).toBe(400)
    expect(reversed.json.error?.code).toBe('VALIDATION_ERROR')
  })

  it('provider, ubnd, hdt, guest → 403', async () => {
    for (const account of ['provider', 'ubnd', 'hdt', 'guest']) expect((await get(account)).status).toBe(403)
  })
})
