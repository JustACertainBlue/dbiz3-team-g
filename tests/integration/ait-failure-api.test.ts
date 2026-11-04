import { beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { extractTourContext } from '@/lib/ai/extractor'
import * as sessionsRoute from '@/app/api/ait/sessions/route'
import * as messagesRoute from '@/app/api/ait/sessions/[id]/messages/route'

// T047 (D1, route level): AI failure → 503 with the conversation kept; Retry re-analyzes without a
// new message (FR-003, BR-017, AC-AIT-FAIL, #27, #33, contract §2).
vi.mock('@/lib/ai/extractor', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/ai/extractor')>()
  return { ...actual, extractTourContext: vi.fn(actual.extractTourContext) }
})

type Handler = (request: never, context?: never) => Promise<Response>
const POST_SESSIONS = (sessionsRoute as unknown as { POST: Handler }).POST
const POST_MESSAGES = (messagesRoute as unknown as { POST: Handler }).POST

async function post(handler: Handler, path: string, body: unknown, params?: Record<string, string>) {
  const request = new Request(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { cookie: 'hab_demo_account=agency', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const response = await handler(request as never, (params ? { params } : undefined) as never)
  return { status: response.status, json: await response.json() as Record<string, any> }
}

const FAILURE = {
  is_complete: false,
  processing_status: 'Temporary AI Failure' as const,
  retry_available: true,
  follow_up_questions: [],
  tour_context: {},
}

describe('T047 | D1 messages route on AI failure and Retry', () => {
  beforeEach(() => demoRepository().reset())

  it('failure → 503 AI_SERVICE_UNAVAILABLE, no profile, Agency message kept; retry → 200, no new message', async () => {
    const id = (await post(POST_SESSIONS, '/api/ait/sessions', {})).json.session_id as string
    const count = () => demoRepository().all('matching_messages').filter(row => row.matching_session_id === id).length

    vi.mocked(extractTourContext).mockResolvedValueOnce(FAILURE)
    const failed = await post(POST_MESSAGES, `/api/ait/sessions/${id}/messages`, { sender: 'Agency', text: 'Silk weaving, 10 pax on 2026-11-20 from Hoàn Kiếm' }, { id })
    expect(failed.status).toBe(503)
    expect(failed.json.error_code).toBe('AI_SERVICE_UNAVAILABLE')
    expect(failed.json.retry_available).toBe(true)
    expect(failed.json.tour_preference_profile ?? null).toBeNull()
    expect(count()).toBe(1)

    const retried = await post(POST_MESSAGES, `/api/ait/sessions/${id}/messages`, { retry: true }, { id })
    expect(retried.status).toBe(200)
    expect(retried.json.message).toBeNull()
    expect(retried.json.extraction.is_complete).toBe(true)
    expect(retried.json.tour_preference_profile).not.toBeNull()
    expect(count()).toBe(1)
  })
})
