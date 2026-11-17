import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { QuotaManager } from '@/lib/ai/quota-manager'
import { CloudflareAiClient } from '@/lib/ai/cloudflare-client'
import * as llmRouter from '@/lib/ait/llm-router'
import * as sessionsRoute from '@/app/api/ait/sessions/route'
import * as messagesRoute from '@/app/api/ait/sessions/[id]/messages/route'

type Handler = (request: never, context?: never) => Promise<Response>
type Json = Record<string, any>

const POST_SESSIONS = (sessionsRoute as unknown as { POST: Handler }).POST
const POST_MESSAGES = (messagesRoute as unknown as { POST: Handler }).POST
let rateWindowStart = 1_800_000_000_000

async function call(handler: Handler, path: string, body: unknown, params?: Json) {
  const request = new Request(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { cookie: 'hab_demo_account=agency', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const response = await handler(request as never, (params ? { params } : undefined) as never)
  let json: Json | null = null
  try { json = await response.json() } catch { json = null }
  return { status: response.status, json: json as Json }
}

async function openSession() {
  const result = await call(POST_SESSIONS, '/api/ait/sessions', {})
  return result.json.session_id as string
}

async function send(sessionId: string, text: string, isTest = false) {
  return call(
    POST_MESSAGES,
    `/api/ait/sessions/${sessionId}/messages`,
    { sender: 'Agency', text, ...(isTest ? { is_test: true } : {}) },
    { id: sessionId }
  )
}

function installLlmMock(reply: string, origin?: string) {
  vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'test-account')
  vi.stubEnv('CLOUDFLARE_API_TOKEN', 'test-token')
  vi.spyOn(CloudflareAiClient.prototype, 'runChat').mockResolvedValue({
    success: true,
    text: JSON.stringify({
      intent: 'tour_matching',
      conversational_reply: reply,
      extracted_context: {
        ...(origin ? { origin } : {}),
        budget_per_person: 5000,
      },
      follow_up_questions: [],
      missing_primary: [],
    }),
    isQuotaExhausted: false,
    isNetworkError: false,
    modelUsed: 'test-mock',
  })
  vi.spyOn(QuotaManager, 'checkCooldown').mockResolvedValue({
    inCooldown: false,
    provider: 'cloudflare_workers_ai',
    model: 'test-mock',
  })
  vi.spyOn(llmRouter, 'classifyIntent').mockResolvedValue({
    intent: 'catalog_query',
    confidence: 1,
    source: 'llm',
  })
}

describe('AIT geography pipeline through the real extractor', () => {
  beforeEach(() => {
    demoRepository().reset()
    vi.spyOn(Date, 'now').mockReturnValue(rateWindowStart)
    rateWindowStart += 60001
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it.each([
    ['seed', false],
    ['fixture', true],
  ] as const)('uses the shared radius filter for village cards from %s data', async (_source, isTest) => {
    installLlmMock('Bát Tràng cách 4 km.')
    const sessionId = await openSession()

    const response = await send(sessionId, 'làng nghề cách Hồ Gươm dưới 5 km', isTest)
    const villageCards = response.json.village_cards as Json[]
    const villageNames = villageCards.map(card => String(card.name).toLowerCase())

    expect(response.status).toBe(201)
    expect(response.json.extraction.usedLlm).toBe(true)
    expect(villageCards).toBeDefined()
    for (const forbidden of ['bát tràng', 'vạn phúc', 'bá dương nội', 'đào thục', 'phùng xá']) {
      expect(villageNames.some(name => name.includes(forbidden))).toBe(false)
    }
    expect(response.json.turn.message).not.toContain('Bát Tràng cách 4 km')
    for (const card of villageCards) {
      expect(card.distance_km).toEqual(expect.any(Number))
      expect(card.distance_source).toBe('haversine')
    }
  })
})
