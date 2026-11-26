import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { loadConversationState } from '@/lib/ai/conversation-store'
import * as sessionsRoute from '@/app/api/ait/sessions/route'
import * as messagesRoute from '@/app/api/ait/sessions/[id]/messages/route'
import { messageOutcome } from '@/app/ai-matching/matching-view'
import { installFakeModel, restoreRealClients } from '../helpers/ait-fake-clients'

type Handler = (request: never, context?: never) => Promise<Response>
const POST_SESSIONS = (sessionsRoute as unknown as { POST: Handler }).POST
const POST_MESSAGES = (messagesRoute as unknown as { POST: Handler }).POST

async function post(handler: Handler, path: string, body: unknown, params?: Record<string, string>) {
  const request = new Request(`http://localhost:3000${path}`, {
    method: 'POST', headers: { cookie: 'hab_demo_account=agency', 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
  const response = await handler(request as never, (params ? { params } : undefined) as never)
  return { status: response.status, json: await response.json() as Record<string, any> }
}
const newSession = async () => (await post(POST_SESSIONS, '/api/ait/sessions', {})).json.session_id as string
const send = (id: string, text: string) => post(POST_MESSAGES, `/api/ait/sessions/${id}/messages`, { sender: 'Agency', text }, { id })

describe('a platform-guidance question after the tour is complete', () => {
  beforeEach(() => demoRepository().reset())
  afterEach(() => restoreRealClients())

  it('answers the question, keeps the criteria, and does not run matching again', async () => {
    const id = await newSession()
    installFakeModel({ extracted_context: { group_size: 10, craft_preference: 'pottery', target_date: '2030-12-10' } })
    const first = await send(id, 'Đoàn 10 khách làm gốm ngày 10/12/2030 ngân sách 500k')
    expect(first.json.extraction.is_complete).toBe(true)
    const before = await loadConversationState(id)

    installFakeModel({ intent: 'platform_guidance', conversational_reply: 'Điểm phù hợp tính từ 4 thành phần.', extracted_context: {} })
    const faq = await send(id, 'Điểm phù hợp được tính như thế nào?')

    expect(faq.status).toBe(201)
    expect(faq.json.extraction.intent).toBe('platform_guidance')
    expect(faq.json.extraction.conversational_reply).toBe('Điểm phù hợp tính từ 4 thành phần.')
    expect(faq.json.extraction.is_complete).toBe(false)
    expect(faq.json.tour_preference_profile ?? null).toBeNull()
    expect(faq.json.tour_preference_profiles).toEqual([])
    expect(await loadConversationState(id)).toEqual(before)
  })

  it('the screen shows the answer, not the failure text', () => {
    const outcome = messageOutcome({ ok: true, status: 201, body: { extraction: { intent: 'platform_guidance', is_complete: false, follow_up_questions: [], conversational_reply: 'Điểm phù hợp tính từ 4 thành phần.' } } } as never)
    expect(outcome).toEqual({ kind: 'answer', text: 'Điểm phù hợp tính từ 4 thành phần.' })
  })
})

describe('exclusions typed in the conversation', () => {
  beforeEach(() => demoRepository().reset())
  afterEach(() => restoreRealClients())

  it('"không muốn thêu" ends up in the matching profile', async () => {
    const id = await newSession()
    installFakeModel({ extracted_context: { group_size: 10, craft_preference: 'pottery', target_date: '2030-12-10' } })
    const result = await send(id, 'Đoàn 10 khách muốn làm gốm và dệt lụa, không muốn thêu, ngày 10/12/2030 ngân sách 500k')
    expect(result.json.extraction.is_complete).toBe(true)
    for (const item of result.json.tour_preference_profiles) {
      expect(item.profile.hard_constraints.excluded_crafts).toEqual(['embroidery'])
    }
  })
})
