// T030: handoff routes write the source of their entry point and add chat_status / is_new_session (#19, H3, Q10).
import { existsSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as handoff } from '@/app/api/demo/handoff/route'
import * as chatRoute from '@/app/api/ait/sessions/[id]/chat/route'
import * as quoteRoute from '@/app/api/ait/sessions/[id]/quote/route'
import { EXPERIENCE, repo, writeSnapshot } from '../unit/iac-fixtures'

type Handler = (request: never, context: never) => Promise<Response>
const MATCHING = 'fb8dee73-96ba-56c1-b6d1-17041b6ed031'

async function post(handler: Handler, url: string, body: unknown, params?: Record<string, string>) {
  const request = new NextRequest(`http://localhost:3000${url}`, {
    method: 'POST', headers: { cookie: 'hab_demo_account=agency', 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
  const response = await handler(request as never, (params ? { params } : undefined) as never)
  return { status: response.status, body: await response.json() as any }
}
const chatRow = (id: string) => repo().find('chat_sessions', row => row.chat_session_id === id)!

describe('T030 | handoff routes', () => {
  beforeEach(() => repo().reset())

  it('POST /api/demo/handoff with chat_source Provider Profile writes that source and returns chat_status, is_new_session', async () => {
    const res = await post(handoff as Handler, '/api/demo/handoff', { action: 'chat', experience_id: EXPERIENCE, source_context: 'Detail Page', chat_source: 'Provider Profile' })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ chat_status: 'Active', is_new_session: true })
    expect(chatRow(res.body.data.chat_session_id).source).toBe('Provider Profile')
  })

  it('POST /api/demo/handoff without chat_source writes Explore; an invalid chat_source → 400, nothing written', async () => {
    const res = await post(handoff as Handler, '/api/demo/handoff', { action: 'quote', experience_id: EXPERIENCE })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ is_new_request: true, chat_status: 'Active', is_new_session: true })
    expect(chatRow(res.body.data.chat_session_id).source).toBe('Explore')
    const before = writeSnapshot()
    expect((await post(handoff as Handler, '/api/demo/handoff', { action: 'chat', experience_id: EXPERIENCE, chat_source: 'Booking' })).status).toBe(400)
    expect(writeSnapshot()).toBe(before)
  })

  it('AIT chat and quote routes write AI Matching with the matching session and keep their fields', async () => {
    const chat = await post((chatRoute as any).POST, `/api/ait/sessions/${MATCHING}/chat`, { experience_id: EXPERIENCE }, { id: MATCHING })
    expect(chat.status).toBe(200)
    expect(chat.body).toMatchObject({ chat_session_id: expect.any(String), initial_message_id: expect.any(String), chat_status: 'Active', is_new_session: true })
    expect(chatRow(chat.body.chat_session_id)).toMatchObject({ source: 'AI Matching', matching_session_id: MATCHING })
    const quote = await post((quoteRoute as any).POST, `/api/ait/sessions/${MATCHING}/quote`, { experience_id: EXPERIENCE }, { id: MATCHING })
    expect(quote.body).toMatchObject({ quote_request_id: expect.any(String), chat_session_id: chat.body.chat_session_id, is_new_session: false })
    expect(repo().find('quote_requests', q => q.quote_request_id === quote.body.quote_request_id)).toMatchObject({ source: 'Matching', matching_session_id: MATCHING })
  })

  it('the /api/demo/conversations routes are removed (Q10)', () => {
    expect(existsSync('src/app/api/demo/conversations/route.ts')).toBe(false)
    expect(existsSync('src/app/api/demo/conversations/[id]/messages/route.ts')).toBe(false)
  })
})
