import { beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import * as sessionsRoute from '@/app/api/ait/sessions/route'
import * as chatRoute from '@/app/api/ait/sessions/[id]/chat/route'
import * as quoteRoute from '@/app/api/ait/sessions/[id]/quote/route'
import * as messagesRoute from '@/app/api/ait/sessions/[id]/messages/route'

const failure = vi.hoisted(() => ({ error: null as unknown }))
vi.mock('@/lib/demo/commercial-handoff-service', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/demo/commercial-handoff-service')>()
  return {
    ...actual,
    createChatHandoff: vi.fn(async () => { throw failure.error }),
    createQuoteHandoff: vi.fn(async () => { throw failure.error }),
  }
})
vi.mock('@/lib/matching/session-service', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/matching/session-service')>()
  return { ...actual, getMessages: vi.fn(async (...args: Parameters<typeof actual.getMessages>) => {
    if (failure.error) throw failure.error
    return actual.getMessages(...args)
  }) }
})

type Handler = (request: never, context?: never) => Promise<Response>
async function call(handler: Handler, method: 'GET' | 'POST', path: string, body: unknown, params?: Record<string, string>) {
  const request = new Request(`http://localhost:3000${path}`, {
    method, headers: { cookie: 'hab_demo_account=agency', 'content-type': 'application/json' }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  })
  const response = await handler(request as never, (params ? { params } : undefined) as never)
  return { status: response.status, json: await response.json() as Record<string, any> }
}

const DB_ERROR = 'duplicate key value violates unique constraint "chat_sessions_pkey" (host db.internal.supabase.co)'

describe('internal errors are not shown to the browser', () => {
  let id: string
  beforeEach(async () => {
    demoRepository().reset()
    failure.error = null
    id = (await call((sessionsRoute as unknown as { POST: Handler }).POST, 'POST', '/api/ait/sessions', {})).json.session_id
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it.each([
    ['chat', (chatRoute as unknown as { POST: Handler }).POST, 'POST'],
    ['quote', (quoteRoute as unknown as { POST: Handler }).POST, 'POST'],
  ] as const)('%s: an unexpected error → 500 with a generic message', async (name, handler, method) => {
    failure.error = new Error(DB_ERROR)
    const result = await call(handler, method, `/api/ait/sessions/${id}/${name}`, { experience_id: 'exp-1' }, { id })
    expect(result.status).toBe(500)
    expect(JSON.stringify(result.json)).not.toMatch(/duplicate key|supabase|chat_sessions_pkey/)
    expect(result.json.error).toMatch(/lỗi kỹ thuật/)
  })

  it.each([
    ['chat', (chatRoute as unknown as { POST: Handler }).POST],
    ['quote', (quoteRoute as unknown as { POST: Handler }).POST],
  ] as const)('%s: a known handoff refusal keeps its own message and status', async (name, handler) => {
    const { HandoffError } = await import('@/lib/demo/commercial-handoff-service')
    failure.error = new HandoffError('Experience is not available', 409)
    const result = await call(handler, 'POST', `/api/ait/sessions/${id}/${name}`, { experience_id: 'exp-1' }, { id })
    expect(result.status).toBe(409)
    expect(result.json.error).toBe('Experience is not available')
  })

  it('messages (GET): an unexpected error → 500 with a generic message', async () => {
    failure.error = new Error(DB_ERROR)
    const result = await call((messagesRoute as unknown as { GET: Handler }).GET, 'GET', `/api/ait/sessions/${id}/messages`, null, { id })
    expect(result.status).toBe(500)
    expect(JSON.stringify(result.json)).not.toMatch(/duplicate key|supabase/)
  })

  it('messages (POST): an unexpected error → generic message, but a text validation error keeps its message', async () => {
    failure.error = new Error(DB_ERROR)
    const broken = await call((messagesRoute as unknown as { POST: Handler }).POST, 'POST', `/api/ait/sessions/${id}/messages`, { sender: 'Agency', text: 'Đoàn 10 khách' }, { id })
    expect(broken.status).toBe(500)
    expect(JSON.stringify(broken.json)).not.toMatch(/duplicate key|supabase/)

    failure.error = null
    const tooLong = await call((messagesRoute as unknown as { POST: Handler }).POST, 'POST', `/api/ait/sessions/${id}/messages`, { sender: 'Agency', text: 'a'.repeat(2001) }, { id })
    expect(tooLong.status).toBe(400)
    expect(tooLong.json.error).toMatch(/Message text invalid/)
  })
})
