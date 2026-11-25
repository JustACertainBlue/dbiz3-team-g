import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { loadConversationState } from '@/lib/ai/conversation-store'
import { withMatchingSessionWriteLock } from '@/lib/matching/session-service'
import { ConversationalAiService } from '@/lib/ai/llm-service'
import type { CloudflareAiClient } from '@/lib/ai/cloudflare-client'
import type { OpenRouterClient } from '@/lib/ai/openrouter-client'
import * as sessionsRoute from '@/app/api/ait/sessions/route'
import * as messagesRoute from '@/app/api/ait/sessions/[id]/messages/route'
import { restoreRealClients } from '../helpers/ait-fake-clients'

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

describe('messages of one session are handled one at a time', () => {
  beforeEach(() => demoRepository().reset())
  afterEach(() => restoreRealClients())

  it('the write lock runs operations of the same session in order, and other sessions in parallel', async () => {
    const order: string[] = []
    const slow = (name: string, ms: number) => async () => {
      order.push(`${name}:start`)
      await new Promise(resolve => setTimeout(resolve, ms))
      order.push(`${name}:end`)
    }
    await Promise.all([
      withMatchingSessionWriteLock('s1', slow('a', 30)),
      withMatchingSessionWriteLock('s1', slow('b', 1)),
      withMatchingSessionWriteLock('s2', slow('c', 1)),
    ])
    expect(order.indexOf('b:start')).toBeGreaterThan(order.indexOf('a:end'))
    expect(order.indexOf('c:start')).toBeLessThan(order.indexOf('a:end'))
  })

  it('two messages sent together both reach the conversation state (no lost update)', async () => {
    const id = (await post(POST_SESSIONS, '/api/ait/sessions', {})).json.session_id as string
    // A slow model makes the two requests overlap if nothing serializes them.
    ConversationalAiService.setClients(
      {
        isConfigured: () => true,
        fallbackModel: 'f',
        runChat: async (messages: Array<{ role: string; content: string }>) => {
          await new Promise(resolve => setTimeout(resolve, 40))
          const latest = messages.filter(m => m.role === 'user').at(-1)?.content ?? ''
          const conversation_delta = latest.includes('khách')
            ? { group_size: { action: 'set', value: 10, raw_span: '10 khách' } }
            : { craft: { action: 'set', value: 'pottery', raw_span: 'gốm' } }
          return { success: true, modelUsed: 'fake', text: JSON.stringify({ intent: 'tour_matching', conversational_reply: 'Đã ghi nhận.', conversation_delta, follow_up_questions: [] }) }
        },
      } as unknown as CloudflareAiClient,
      { isConfigured: () => false } as unknown as OpenRouterClient,
    )
    const send = (text: string) => post(POST_MESSAGES, `/api/ait/sessions/${id}/messages`, { sender: 'Agency', text }, { id })
    const [a, b] = await Promise.all([send('Đoàn 10 khách'), send('Muốn làm gốm')])
    expect([a.status, b.status]).toEqual([201, 201])
    const state = await loadConversationState(id)
    expect(state.group_size).toBe(10)
    expect(state.craft).toBe('pottery')
  })
})
