import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { resetAiRateLimiter } from '@/lib/ai/ai-rate-limit'
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
  return { status: response.status, headers: response.headers, json: await response.json() as Record<string, any> }
}
const newSession = async () => (await post(POST_SESSIONS, '/api/ait/sessions', {})).json.session_id as string
const send = (id: string, text: unknown) => post(POST_MESSAGES, `/api/ait/sessions/${id}/messages`, { sender: 'Agency', text }, { id })
const stored = (id: string) => demoRepository().all('matching_messages').filter(row => row.matching_session_id === id).length

describe('guard before the model is called', () => {
  beforeEach(() => { demoRepository().reset(); resetAiRateLimiter() })
  afterEach(() => { vi.restoreAllMocks(); restoreRealClients(); resetAiRateLimiter() })

  it('the 21st message within a minute is refused with 429, not stored, and the model is not called', async () => {
    const id = await newSession()
    const model = installFakeModel({ extracted_context: { group_size: 5 } })
    for (let i = 0; i < 20; i++) expect((await send(id, `Đoàn ${i + 1} khách`)).status).toBe(201)
    const calls = model.mock.calls.length
    const refused = await send(id, 'Đoàn 99 khách')
    expect(refused.status).toBe(429)
    expect(refused.json.error_code).toBe('RATE_LIMITED')
    expect(refused.json.user_message).toMatch(/quá nhanh/)
    expect(Number(refused.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(stored(id)).toBe(20)
    expect(model.mock.calls.length).toBe(calls)
  })

  it('an empty or over-long message is refused with 400 and not stored', async () => {
    const id = await newSession()
    installFakeModel({})
    const empty = await send(id, '​  ')
    expect(empty.status).toBe(400)
    expect(empty.json.error_code).toBe('INVALID_MESSAGE')
    const long = await send(id, 'a'.repeat(2001))
    expect(long.status).toBe(400)
    expect(stored(id)).toBe(0)
  })

  it('invisible characters are removed from what is stored and sent to the model', async () => {
    const id = await newSession()
    installFakeModel({ extracted_context: { group_size: 10 } })
    await send(id, 'Đoàn​ 10 khách')
    expect(demoRepository().all('matching_messages').find(row => row.matching_session_id === id)?.text).toBe('Đoàn 10 khách')
  })

  it('no message content is logged: accepted, refused or rate-limited', async () => {
    const id = await newSession()
    installFakeModel({ extracted_context: { group_size: 5 } })
    const lines: string[] = []
    for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(console, level).mockImplementation((...args) => { lines.push(args.map(String).join(' ')) })
    }
    const marker = 'MARKER-NOI-DUNG-RIENG-TU'
    for (let i = 0; i < 21; i++) await send(id, `${marker} ${i}`)
    await send(id, `${'x'.repeat(2001)} ${marker}`)
    expect(lines.filter(line => line.includes(marker))).toEqual([])
  })
})
