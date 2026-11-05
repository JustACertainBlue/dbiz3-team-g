// T017: /api/iac/chats… through the route handlers (contracts/chat-api.md; FR-001..003, BR-005, SC-004, #27).
import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as listRoute, POST as openRoute } from '@/app/api/iac/chats/route'
import { GET as historyRoute, POST as sendRoute } from '@/app/api/iac/chats/[id]/messages/route'
import { AGENCY_BOOKING, AGENCY_CHAT, PROVIDER_CHAT, PROVIDER_USER, closeChat, repo, writeSnapshot } from '../unit/iac-fixtures'

type Handler = (request: never, context: never) => Promise<Response> | Response

async function call(handler: Handler, url: string, account: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}, params?: Record<string, string>) {
  const request = new NextRequest(`http://localhost:3000${url}`, {
    method: init.method ?? 'GET',
    headers: { 'content-type': 'application/json', cookie: `hab_demo_account=${account}`, ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const response = await handler(request as never, (params ? { params } : undefined) as never)
  return { status: response.status, body: await response.json() as any }
}

const history = (account: string, id: string, query = '') => call(historyRoute, `/api/iac/chats/${id}/messages${query}`, account, {}, { id })
const send = (account: string, id: string, message_text: unknown) => call(sendRoute, `/api/iac/chats/${id}/messages`, account, { method: 'POST', body: { message_text } }, { id })

describe('T017 | /api/iac/chats', () => {
  beforeEach(() => repo().reset())

  it('GET list: 200 with chat_list for the Provider; 403 for guest, ubnd, hdt (#27)', async () => {
    const ok = await call(listRoute, '/api/iac/chats', 'provider')
    expect(ok.status).toBe(200)
    expect(ok.body.data.chat_list.map((c: any) => c.chat_session_id)).toContain(PROVIDER_CHAT)
    for (const account of ['guest', 'ubnd', 'hdt']) {
      const denied = await call(listRoute, '/api/iac/chats', account)
      expect(denied).toEqual({ status: 403, body: { error: { code: 'FORBIDDEN', message: expect.any(String) } } })
    }
  })

  it('GET history: 200, then 403 non-participant, 403 unknown id, 400 bad cursor', async () => {
    const ok = await history('provider', PROVIDER_CHAT)
    expect(ok.status).toBe(200)
    expect(ok.body.data).toMatchObject({ chat_session_id: PROVIDER_CHAT, has_more_messages: false })
    expect((await history('agency', PROVIDER_CHAT)).status).toBe(403)
    expect((await history('provider', 'no-such-chat')).status).toBe(403)
    expect((await history('provider', PROVIDER_CHAT, '?before_cursor=nope')).status).toBe(400)
  })

  it('POST send: 201 and the next GET returns it (BR-005, SC-004)', async () => {
    const sent = await send('provider', PROVIDER_CHAT, 'Xưởng xác nhận **15 khách**.')
    expect(sent.status).toBe(201)
    expect(sent.body.data).toEqual({ message_id: expect.any(String), sent_at: expect.any(String), last_message_timestamp: sent.body.data.sent_at })
    const after = await history('provider', PROVIDER_CHAT)
    expect(after.body.data.message_history.at(-1)).toMatchObject({ message_id: sent.body.data.message_id, text: 'Xưởng xác nhận **15 khách**.', sender_name: 'Kiều Anh Thư' })
  })

  it('POST send: 400 empty / 4001, 409 Closed, 403 non-participant; nothing written', async () => {
    const before = writeSnapshot()
    expect((await send('provider', PROVIDER_CHAT, '   ')).body.error.code).toBe('VALIDATION_ERROR')
    expect((await send('provider', PROVIDER_CHAT, 'a'.repeat(4001))).status).toBe(400)
    expect((await send('agency', PROVIDER_CHAT, 'Xin chào')).status).toBe(403)
    expect(writeSnapshot()).toBe(before)
    closeChat(PROVIDER_CHAT, PROVIDER_USER)
    expect(await send('provider', PROVIDER_CHAT, 'Còn đó không?')).toEqual({ status: 409, body: { error: { code: 'CHAT_CLOSED', message: expect.any(String) } } })
  })

  it('POST open from a Booking: 200 for the Agency, 400 other source, 403 other Provider, 404 unknown Booking', async () => {
    const ok = await call(openRoute, '/api/iac/chats', 'agency', { method: 'POST', body: { source: 'Booking', booking_id: AGENCY_BOOKING } })
    expect(ok).toEqual({ status: 200, body: { data: { chat_session_id: AGENCY_CHAT, chat_status: 'Active', is_new_session: false } } })
    expect((await call(openRoute, '/api/iac/chats', 'agency', { method: 'POST', body: { source: 'Explore', booking_id: AGENCY_BOOKING } })).status).toBe(400)
    expect((await call(openRoute, '/api/iac/chats', 'provider', { method: 'POST', body: { source: 'Booking', booking_id: AGENCY_BOOKING } })).status).toBe(403)
    expect((await call(openRoute, '/api/iac/chats', 'agency', { method: 'POST', body: { source: 'Booking', booking_id: 'no-such' } })).status).toBe(404)
  })

  it('ignores forged identity headers (checklist §3 #30)', async () => {
    const forged = await call(listRoute, '/api/iac/chats', 'guest', { headers: { 'x-mock-user-id': PROVIDER_USER, 'x-mock-role': 'LocalProvider' } })
    expect(forged.status).toBe(403)
  })
})
