import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import * as scheduleRoute from '@/app/api/bkg/providers/[providerId]/schedule/route'

// T013: GET /api/bkg/providers/{providerId}/schedule (F-SCHED-01); contract
// specs/013-bkg-schedule/contracts/schedule-api.md. Wall clock; explicit October 2026 range.
type Handler = (request: never, context: { params: { providerId: string } }) => Promise<Response>
type Body = { data?: { calendar_blocks: Record<string, unknown>[]; operating_hours: Record<string, unknown> }; error?: { code: string } }
const GET = (scheduleRoute as unknown as { GET: Handler }).GET
const PROVIDER = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const OCT = '?date_from=2026-10-01&date_to=2026-10-31'

async function get(account: string, providerId: string, query = OCT) {
  const request = new Request(`http://localhost:3000/api/bkg/providers/${providerId}/schedule${query}`, { headers: { cookie: `hab_demo_account=${account}` } })
  const response = await GET(request as never, { params: { providerId } })
  return { status: response.status, json: await response.json() as Body }
}

describe('T013 | GET provider schedule', () => {
  beforeEach(() => demoRepository().reset())

  it('provider → 200 with blocks and operating_hours', async () => {
    const result = await get('provider', PROVIDER)
    expect(result.status).toBe(200)
    expect(result.json.data!.calendar_blocks.length).toBeGreaterThan(0)
    expect(Object.keys(result.json.data!.operating_hours)).toHaveLength(7)
  })

  it('agency → 200, every block has exactly start_at, end_at, status (#73)', async () => {
    const result = await get('agency', PROVIDER)
    expect(result.status).toBe(200)
    for (const block of result.json.data!.calendar_blocks) expect(Object.keys(block).sort()).toEqual(['end_at', 'start_at', 'status'])
  })

  it('a 46-day range → 400', async () => {
    const result = await get('provider', PROVIDER, '?date_from=2026-10-01&date_to=2026-11-15')
    expect(result.status).toBe(400)
    expect(result.json.error?.code).toBe('VALIDATION_ERROR')
  })

  it('ubnd, hdt, guest and another Provider → 403; non-Verified or unknown for an Agency → 404', async () => {
    for (const account of ['ubnd', 'hdt', 'guest']) expect((await get(account, PROVIDER)).status).toBe(403)
    expect((await get('provider', '70efa801-a908-5e16-8510-fd094fbdc020')).status).toBe(403)
    expect((await get('agency', '3a5d2ffc-79fa-5b75-a1e6-82beea3bed59')).status).toBe(404)
    expect((await get('agency', 'no-such-provider')).status).toBe(404)
  })
})
