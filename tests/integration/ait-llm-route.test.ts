import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import * as sessionsRoute from '@/app/api/ait/sessions/route'
import * as messagesRoute from '@/app/api/ait/sessions/[id]/messages/route'
import { installFailingModel, installFakeModel, restoreRealClients } from '../helpers/ait-fake-clients'

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

const newSession = async () => (await post(POST_SESSIONS, '/api/ait/sessions', {})).json.session_id as string
const send = (id: string, text: string) => post(POST_MESSAGES, `/api/ait/sessions/${id}/messages`, { sender: 'Agency', text }, { id })

// A date 30 days from now, written dd/mm/yyyy, so the tests never depend on the calendar day they run.
const future = (() => {
  const d = new Date(Date.now() + 30 * 86_400_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return { dmy: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`, iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
})()

describe('messages route with the language model (fake providers only)', () => {
  beforeEach(() => demoRepository().reset())
  afterEach(() => restoreRealClients())

  it('both providers failing → 503 "tạm gián đoạn", conversation kept, then Retry works without a new message', async () => {
    const id = await newSession()
    const count = () => demoRepository().all('matching_messages').filter(row => row.matching_session_id === id).length
    installFailingModel()
    const failed = await send(id, `Đoàn 10 khách làm gốm ngày ${future.dmy} ngân sách 500k`)
    expect(failed.status).toBe(503)
    expect(failed.json.error_code).toBe('AI_SERVICE_UNAVAILABLE')
    expect(failed.json.user_message).toMatch(/Dịch vụ AI đang tạm gián đoạn/)
    expect(failed.json.retry_available).toBe(true)
    expect(failed.json.tour_preference_profile ?? null).toBeNull()
    expect(count()).toBe(1)

    installFakeModel({ extracted_context: { group_size: 10, craft_preference: 'pottery', target_date: future.iso } })
    const retried = await post(POST_MESSAGES, `/api/ait/sessions/${id}/messages`, { retry: true }, { id })
    expect(retried.status).toBe(200)
    expect(retried.json.message).toBeNull()
    expect(count()).toBe(1)
  })

  it('a date already behind us is reported as past, not as "no data"', async () => {
    const id = await newSession()
    installFakeModel({ extracted_context: { group_size: 10, craft_preference: 'pottery', target_date: '2026-10-10' } })
    const result = await send(id, 'Đoàn 10 khách làm gốm ngày 10/10/2026 ngân sách 500k')
    expect(result.status).toBe(201)
    expect(result.json.extraction.conversational_reply).toContain('Ngày 10/10/2026 đã qua')
    expect(result.json.extraction.conversational_reply).not.toMatch(/chưa có dữ liệu/i)
    expect(result.json.extraction.is_complete).toBe(false)
    expect(result.json.tour_preference_profile ?? null).toBeNull()
    expect(result.json.extraction.follow_up_questions.length).toBeGreaterThan(0)
  })

  it('two crafts → one suggestion target per craft, never one merged itinerary', async () => {
    const id = await newSession()
    installFakeModel({ extracted_context: { group_size: 10, craft_preference: 'pottery', target_date: future.iso } })
    const result = await send(id, `Đoàn 10 khách muốn gốm và lụa ngày ${future.dmy} ngân sách 500k`)
    expect(result.status).toBe(201)
    expect(result.json.extraction.is_complete).toBe(true)
    const profiles = result.json.tour_preference_profiles as Array<{ craft: string; label: string; profile: any }>
    expect(profiles.map(item => item.craft)).toEqual(['pottery', 'silk'])
    expect(profiles.map(item => item.label)).toEqual(['làm gốm', 'dệt lụa'])
    for (const item of profiles) {
      const crafts = item.profile.matching_attributes.filter((a: any) => a.type === 'craft_preference')
      expect(crafts).toHaveLength(1)
      expect(crafts[0].value).toBe(item.craft)
    }
  })

  it('"từ Ý" is a nationality: no origin, even when the model returns it', async () => {
    const id = await newSession()
    installFakeModel({ extracted_context: { origin: 'Ý', group_size: 12, craft_preference: 'pottery', target_date: future.iso } })
    const result = await send(id, `Đoàn 12 khách từ Ý muốn làm gốm ngày ${future.dmy} ngân sách 500k`)
    expect(result.status).toBe(201)
    expect(result.json.extraction.tour_context.origin_or_route).toBeUndefined()
    expect(result.json.tour_preference_profile?.hard_constraints?.origin).toBeUndefined()
  })

  it('without a budget the assistant asks again and does not match; with one it matches', async () => {
    const id = await newSession()
    installFakeModel({ extracted_context: { group_size: 10, craft_preference: 'pottery', target_date: future.iso } })
    const asked = await send(id, `Đoàn 10 khách làm gốm ngày ${future.dmy}`)
    expect(asked.json.extraction.is_complete).toBe(false)
    expect(asked.json.extraction.follow_up_questions.join(' ')).toMatch(/ngân sách/i)
    expect(asked.json.tour_preference_profile ?? null).toBeNull()

    const answered = await send(id, 'Ngân sách 500k một khách')
    expect(answered.json.extraction.is_complete).toBe(true)
    expect(answered.json.tour_preference_profile).not.toBeNull()
  })
})
