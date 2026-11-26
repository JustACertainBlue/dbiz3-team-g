import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { loadConversationState } from '@/lib/ai/conversation-store'
import * as sessionsRoute from '@/app/api/ait/sessions/route'
import * as messagesRoute from '@/app/api/ait/sessions/[id]/messages/route'
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

describe('invalid or unsupported requests are answered before the model is called', () => {
  beforeEach(() => demoRepository().reset())
  afterEach(() => restoreRealClients())

  const cases: Array<[string, string, RegExp]> = [
    ['group size 0', 'Đoàn 0 khách muốn làm gốm', /Số khách không hợp lệ/],
    ['negative group size', 'Đoàn -5 người muốn làm gốm', /Số khách không hợp lệ/],
    ['radius 0', 'Làm gốm trong bán kính 0 km', /Bán kính không hợp lệ/],
    ['negative radius', 'Làm gốm trong bán kính -5km', /Bán kính không hợp lệ/],
    ['distance range', 'Làm gốm cách từ 10 đến 20 km', /chưa hỗ trợ điều kiện khoảng cách/],
    ['booking action', 'Đặt luôn tour này cho tôi', /không đặt chỗ thay bạn/],
  ]

  it.each(cases)('%s → a clear answer, the model is not called, the criteria are kept', async (_name, text, expected) => {
    const id = await newSession()
    const model = installFakeModel({ extracted_context: { group_size: 10, craft_preference: 'pottery' } })
    const result = await send(id, text)
    expect(result.status).toBe(201)
    expect(result.json.extraction.conversational_reply).toMatch(expected)
    expect(result.json.extraction.intent).toBe('platform_guidance')
    expect(result.json.extraction.is_complete).toBe(false)
    expect(result.json.tour_preference_profile ?? null).toBeNull()
    expect(model).not.toHaveBeenCalled()
    expect((await loadConversationState(id)).group_size).toBeUndefined()
  })

  it('"làm lại từ đầu" clears the criteria', async () => {
    const id = await newSession()
    installFakeModel({ extracted_context: { group_size: 10, craft_preference: 'pottery' } })
    await send(id, 'Đoàn 10 khách làm gốm')
    expect((await loadConversationState(id)).group_size).toBe(10)
    const model = installFakeModel({})
    const reset = await send(id, 'Làm lại từ đầu')
    expect(reset.json.extraction.conversational_reply).toMatch(/xoá các tiêu chí/)
    expect(model).not.toHaveBeenCalled()
    const state = await loadConversationState(id)
    expect(state.group_size).toBeUndefined()
    expect(state.craft).toBeUndefined()
  })

  it('a question about meals or hotels is removed from the reply of the model', async () => {
    const id = await newSession()
    installFakeModel({ conversational_reply: 'Mình đã ghi nhận đoàn. Bạn muốn ăn trưa ở nhà hàng nào?', extracted_context: { group_size: 10 } })
    const result = await send(id, 'Đoàn 10 khách')
    expect(result.json.extraction.conversational_reply).toBe('Mình đã ghi nhận đoàn.')
  })

  it('a valid request is not blocked', async () => {
    const id = await newSession()
    const model = installFakeModel({ extracted_context: { group_size: 10, craft_preference: 'pottery' } })
    const result = await send(id, 'Đoàn 10 khách làm gốm')
    expect(model).toHaveBeenCalled()
    expect(result.json.extraction.conversational_reply).not.toMatch(/không hợp lệ/)
  })
})
