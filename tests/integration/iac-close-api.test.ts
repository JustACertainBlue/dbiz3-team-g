// T007: POST /api/iac/chats/{id}/close (contracts/close-api.md; FR-004, #29–#32, #34).
import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as closeRoute } from '@/app/api/iac/chats/[id]/close/route'
import { GET as historyRoute, POST as sendRoute } from '@/app/api/iac/chats/[id]/messages/route'
import { AGENCY_CHAT, AGENCY_USER, PROVIDER_CHAT, repo } from '../unit/iac-fixtures'

type Handler = (request: never, context: never) => Promise<Response> | Response
async function call(handler: Handler, url: string, account: string, id: string, body?: unknown) {
  const request = new NextRequest(`http://localhost:3000${url}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', cookie: `hab_demo_account=${account}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const response = await handler(request as never, { params: { id } } as never)
  return { status: response.status, body: await response.json() as any }
}
const close = (account: string, id: string, body: unknown = {}) => call(closeRoute, `/api/iac/chats/${id}/close`, account, id, body)

describe('T007 | close API', () => {
  beforeEach(() => repo().reset())

  it('200 with the FR-004 output, then 409 on a second close', async () => {
    const ok = await close('agency', AGENCY_CHAT, { close_reason: 'Đã chốt lịch' })
    expect(ok).toEqual({ status: 200, body: { data: {
      chat_session_id: AGENCY_CHAT, chat_status: 'Closed', closed_at: expect.any(String), closed_by: AGENCY_USER,
      success_message: 'Đã đóng hội thoại. Lịch sử vẫn được lưu; lần trao đổi sau sẽ mở hội thoại mới.',
    } } })
    expect(await close('agency', AGENCY_CHAT)).toEqual({ status: 409, body: { error: { code: 'CHAT_CLOSED', message: expect.any(String) } } })
  })

  it('400 for a 501-character reason; 403 for a non-participant, an unknown id, guest, ubnd, hdt', async () => {
    expect((await close('provider', PROVIDER_CHAT, { close_reason: 'a'.repeat(501) })).status).toBe(400)
    expect((await close('agency', PROVIDER_CHAT)).status).toBe(403)
    expect((await close('provider', 'no-such-chat')).status).toBe(403)
    for (const account of ['guest', 'ubnd', 'hdt']) expect((await close(account, PROVIDER_CHAT)).status).toBe(403)
  })

  it('after close: send 409, history 200 with closed_at and closed_by_name', async () => {
    const closed = await close('provider', PROVIDER_CHAT)
    expect((await call(sendRoute, `/api/iac/chats/${PROVIDER_CHAT}/messages`, 'provider', PROVIDER_CHAT, { message_text: 'x' })).status).toBe(409)
    const history = await call(historyRoute, `/api/iac/chats/${PROVIDER_CHAT}/messages`, 'provider', PROVIDER_CHAT)
    expect(history.status).toBe(200)
    expect(history.body.data).toMatchObject({ chat_status: 'Closed', closed_at: closed.body.data.closed_at, closed_by_name: 'Kiều Anh Thư' })
  })
})
