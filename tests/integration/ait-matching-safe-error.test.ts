import { beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import * as matchingRoute from '@/app/api/ait/matching/route'

const failure = vi.hoisted(() => ({ error: null as unknown }))
vi.mock('@/lib/matching/candidate-repo', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/matching/candidate-repo')>()
  return { ...actual, getVerifiedCandidates: vi.fn(async (...args: Parameters<typeof actual.getVerifiedCandidates>) => {
    if (failure.error) throw failure.error
    return actual.getVerifiedCandidates(...args)
  }) }
})

type Handler = (request: never) => Promise<Response>
const POST = (matchingRoute as unknown as { POST: Handler }).POST

async function match(body: unknown) {
  const request = new Request('http://localhost:3000/api/ait/matching', {
    method: 'POST', headers: { cookie: 'hab_demo_account=agency', 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
  const response = await POST(request as never)
  return { status: response.status, json: await response.json() as Record<string, any> }
}

describe('/api/ait/matching does not show internal errors', () => {
  beforeEach(() => {
    demoRepository().reset()
    failure.error = null
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('an unexpected error → 500 with a generic message, no database or host detail', async () => {
    failure.error = new Error('connect ECONNREFUSED db.internal.supabase.co:5432 password authentication failed for user "hab_app"')
    const result = await match({ tour_preference_profile: { hard_constraints: { group_size: 10 }, matching_attributes: [], preference_weights: {} } })
    expect(result.status).toBe(500)
    expect(JSON.stringify(result.json)).not.toMatch(/ECONNREFUSED|supabase|hab_app|password/)
    expect(result.json.error).toMatch(/lỗi kỹ thuật/)
  })

  it('the existing refusals are unchanged: missing profile → 400, no session → 401', async () => {
    const missing = await match({})
    expect(missing.status).toBe(400)
    expect(missing.json.error).toBe('tour_preference_profile is required')

    const guest = new Request('http://localhost:3000/api/ait/matching', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    expect((await POST(guest as never)).status).toBe(401)
  })
})
