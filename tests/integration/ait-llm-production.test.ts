import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { createMatchingSession } from '@/lib/matching/session-service'
import * as messagesRoute from '@/app/api/ait/sessions/[id]/messages/route'
import { installUnavailableModel, restoreRealClients } from '../helpers/ait-fake-clients'

// Auth reads NODE_ENV on every call and only accepts the demo cookie under "test", so the agency is mocked.
const AGENCY_ID = 'agency-production-test'
// The database adapter also switches on NODE_ENV (production needs Postgres), so the production check is a mocked flag.
const production = vi.hoisted(() => ({ value: false }))
vi.mock('@/lib/ai/runtime-mode', () => ({ isProductionRuntime: () => production.value }))
vi.mock('@/lib/auth/session', () => ({
  sessionContextFromRequest: async () => ({ authenticated: true, role: 'Tour_Agency', agencyId: AGENCY_ID }),
}))

type Handler = (request: never, context?: never) => Promise<Response>
const POST_MESSAGES = (messagesRoute as unknown as { POST: Handler }).POST

async function send(id: string, text: string) {
  const request = new Request(`http://localhost:3000/api/ait/sessions/${id}/messages`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sender: 'Agency', text }),
  })
  const response = await POST_MESSAGES(request as never, { params: { id } } as never)
  return { status: response.status, json: await response.json() as Record<string, any> }
}

describe('production without AI credentials', () => {
  beforeEach(() => demoRepository().reset())
  afterEach(() => { production.value = false; vi.unstubAllEnvs(); vi.restoreAllMocks(); restoreRealClients() })

  it('NODE_ENV=production and no keys → 503 "Dịch vụ AI đang tạm gián đoạn", logged clearly, no rule-based result', async () => {
    const session = await createMatchingSession({ agencyId: AGENCY_ID })
    installUnavailableModel()
    production.value = true
    vi.stubEnv('CLOUDFLARE_API_TOKEN', 'secret-token-value')
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', '')
    const errors: string[] = []
    vi.spyOn(console, 'error').mockImplementation((...args) => { errors.push(args.map(String).join(' ')) })

    const result = await send(session.session_id, 'Đoàn 10 khách làm gốm ngày 10/12/2030 ngân sách 500k')

    expect(result.status).toBe(503)
    expect(result.json.error_code).toBe('AI_SERVICE_UNAVAILABLE')
    expect(result.json.user_message).toMatch(/Dịch vụ AI đang tạm gián đoạn/)
    expect(result.json.retry_available).toBe(true)
    expect(result.json.extraction).toBeUndefined()
    expect(result.json.tour_preference_profile ?? null).toBeNull()
    expect(errors.some(line => /AI provider credentials are not configured/.test(line))).toBe(true)
    expect(errors.join(' ')).not.toContain('secret-token-value')
  })

  it('outside production the same request still uses the existing rule-based extractor', async () => {
    const session = await createMatchingSession({ agencyId: AGENCY_ID })
    installUnavailableModel()
    const result = await send(session.session_id, 'Đoàn 10 khách làm gốm ngày 10/12/2030 ngân sách 500k')
    expect(result.status).toBe(201)
    expect(result.json.extraction.processing_status).toBe('Success')
  })
})
