import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { QuotaManager } from '@/lib/ai/quota-manager'
import { ConversationalAiService } from '@/lib/ai/llm-service'
import { CloudflareAiClient } from '@/lib/ai/cloudflare-client'
import { OpenRouterClient } from '@/lib/ai/openrouter-client'
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

describe('route resilience', () => {
  beforeEach(async () => { demoRepository().reset(); await QuotaManager.resetCooldown() })
  afterEach(async () => { vi.restoreAllMocks(); restoreRealClients(); await QuotaManager.resetCooldown() })

  it('a model answering with prose instead of JSON, twice, → 503 and no result', async () => {
    const id = await newSession()
    installFakeModel(() => ({}))
    ConversationalAiService.setClients(
      { isConfigured: () => true, runChat: async () => ({ success: true, text: 'Xin chào, mình sẽ giúp bạn.', modelUsed: 'fake' }), fallbackModel: 'f' } as unknown as CloudflareAiClient,
      { isConfigured: () => false } as unknown as OpenRouterClient,
    )
    const result = await send(id, 'Đoàn 10 khách làm gốm')
    expect(result.status).toBe(503)
    expect(result.json.error_code).toBe('AI_SERVICE_UNAVAILABLE')
    expect(result.json.tour_preference_profile ?? null).toBeNull()
  })

  it('the DB has no ai_quota_cooldowns table: a quota-exhausted answer is still a 503, not a 500', async () => {
    const repository = demoRepository()
    const realAll = repository.all.bind(repository)
    const missing = new Error('relation "hab_runtime.ai_quota_cooldowns" does not exist')
    vi.spyOn(repository, 'all').mockImplementation((async (table: string) => {
      if (table === 'ai_quota_cooldowns') throw missing
      return realAll(table)
    }) as never)
    vi.spyOn(repository, 'insert').mockImplementation((async (table: string, row: any) => {
      if (table === 'ai_quota_cooldowns') throw missing
      return (repository as any).constructor.prototype.insert.call(repository, table, row)
    }) as never)
    const id = await newSession()
    ConversationalAiService.setClients(
      { isConfigured: () => true, runChat: async () => ({ success: false, isQuotaExhausted: true, error: 'quota' }), fallbackModel: 'f' } as unknown as CloudflareAiClient,
      { isConfigured: () => false } as unknown as OpenRouterClient,
    )
    const first = await send(id, 'Đoàn 10 khách làm gốm')
    expect(first.status).toBe(503)
    // The next request reads the cooldown with the table missing, and still answers 503.
    const second = await send(id, 'Đoàn 10 khách làm gốm')
    expect(second.status).toBe(503)
  })

  it('the DB has no ai_quota_cooldowns table: a healthy model answer works', async () => {
    const repository = demoRepository()
    const realAll = repository.all.bind(repository)
    vi.spyOn(repository, 'all').mockImplementation((async (table: string) => {
      if (table === 'ai_quota_cooldowns') throw new Error('relation does not exist')
      return realAll(table)
    }) as never)
    const id = await newSession()
    installFakeModel({ extracted_context: { group_size: 10, craft_preference: 'pottery', target_date: '2030-12-10' } })
    const result = await send(id, 'Đoàn 10 khách làm gốm ngày 10/12/2030 ngân sách 500k')
    expect(result.status).toBe(201)
    expect(result.json.extraction.is_complete).toBe(true)
  })

  it('the prompt keeps English craft keys out of Vietnamese replies', async () => {
    const { buildSystemPrompt } = await import('@/lib/ai/prompt-templates')
    expect(buildSystemPrompt()).toMatch(/Never put the English taxonomy keys \(pottery, silk, bamboo\) in the reply text/)
  })
})
