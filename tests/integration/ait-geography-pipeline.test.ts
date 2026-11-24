import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { QuotaManager } from '@/lib/ai/quota-manager'
import { CloudflareAiClient } from '@/lib/ai/cloudflare-client'
import * as llmRouter from '@/lib/ait/llm-router'
import * as sessionsRoute from '@/app/api/ait/sessions/route'
import * as messagesRoute from '@/app/api/ait/sessions/[id]/messages/route'
import * as matchingRoute from '@/app/api/ait/matching/route'
import { messageOutcome } from '@/app/ai-matching/matching-view'
import { DEFAULT_HANOI_ORIGIN, resolveOriginCoordinates } from '@/lib/matching/geo'
import { resolveTestVillageCards } from '@/lib/matching/test-dataset'
import { runVillageCardPipeline } from '@/lib/ait/matching-pipeline'
import { parseExplicitBudgetAmount } from '@/lib/ait/budget'
import { detectCraftPreference } from '@/lib/matching/craft-taxonomy'
import * as geo from '@/lib/matching/geo'
import type { ConversationDelta } from '@/lib/ait/conversation-delta-schema'
import { extractTourDate } from '@/lib/ai/tour-date'
import { isBookingActionRequest } from '@/lib/ait/conversation-state'
import {
  conversationStateBytes,
  emptyConversationState,
  mergeConversationState,
  normalizeConversationState,
} from '@/lib/ait/conversation-state'

type Handler = (request: never, context?: never) => Promise<Response>
type Json = Record<string, any>

const POST_SESSIONS = (sessionsRoute as unknown as { POST: Handler }).POST
const POST_MESSAGES = (messagesRoute as unknown as { POST: Handler }).POST
const POST_MATCHING = (matchingRoute as unknown as { POST: Handler }).POST
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
    { sender: 'Agency', text: isTest ? `${text} test` : text },
    { id: sessionId }
  )
}

function installLlmMock(
  reply: string,
  origin?: string,
  missingPrimary: string[] = [],
  budgetPerPerson?: number,
  deltaOverride?: unknown,
) {
  vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'test-account')
  vi.stubEnv('CLOUDFLARE_API_TOKEN', 'test-token')
  const llmCall = vi.spyOn(CloudflareAiClient.prototype, 'runChat').mockImplementation(async messages => {
      const text = messages.findLast(message => message.role === 'user')?.content ?? ''
      const delta: ConversationDelta = {}
      const craft = detectCraftPreference(text)
      if (craft) delta.craft = { action: 'set', value: craft, raw_span: text }
      if (/khách nước ngoài|khach nuoc ngoai/iu.test(text)) {
        delta.interests = { action: 'set', value: ['khách nước ngoài'], raw_span: text }
      }
      const unsupportedCraft = text.match(/(?:làm|đổi sang)\s+(hương(?:\s+hay\s+tò\s*he)?|tò\s*he)/iu)
      if (!craft && unsupportedCraft) {
        delta.craft = {
          action: 'set',
          value: unsupportedCraft[1].toLocaleLowerCase('vi'),
          raw_span: unsupportedCraft[0],
        }
      }
      const adultsAndChildren = text.match(/(\d+)\s*người lớn\s*(\d+)\s*trẻ em\b/iu)
      const groupSpan = adultsAndChildren?.[0]
        ?? text.match(/\b\d+\s*(?:khách|người|bạn|pax|people|guests?)\b/iu)?.[0]
      const parsedGroupSize = adultsAndChildren
        ? Number(adultsAndChildren[1]) + Number(adultsAndChildren[2])
        : groupSpan ? Number(groupSpan.match(/\d+/)?.[0]) : undefined
      if (groupSpan && parsedGroupSize) {
        delta.group_size = { action: 'set', value: parsedGroupSize, raw_span: groupSpan }
      }
      const radius = text.match(/(?:dưới|không quá|tối đa|bán kính|cách)?\s*(\d+(?:[.,]\d+)?)\s*(?:km|kilometers?|cây\s*số)(?![\p{L}])/iu)
      if (radius) {
        delta.radius = {
          action: 'set',
          value: Number(radius[1].replace(',', '.')),
          raw_span: radius[0],
        }
      }
      const explicitBudget = parseExplicitBudgetAmount(text)
      const budgetSpan = text.match(/\b\d[\d.,\s]*\s*(?:k\b(?!m)|nghìn|ngàn|triệu|đ|vnd)(?![\p{L}])/iu)?.[0]
      if (explicitBudget !== undefined && budgetSpan) {
        const groupTotal = /(?:cả đoàn|toàn đoàn|tổng đoàn)/iu.test(text)
        const perPerson = groupTotal && parsedGroupSize ? Math.round(explicitBudget / parsedGroupSize) : explicitBudget
        delta.budget_per_person = { action: 'set', value: perPerson, raw_span: budgetSpan }
        delta.budget_basis = {
          action: 'set',
          value: groupTotal ? 'group_total' : 'per_person',
          raw_span: text,
        }
      } else if (budgetPerPerson !== undefined) {
        delta.budget_per_person = { action: 'set', value: budgetPerPerson, raw_span: '5.000đ' }
      }
      const namedOrigin = origin && text.toLocaleLowerCase('vi').includes(origin.toLocaleLowerCase('vi'))
        ? origin
        : text.match(/(?:xuất phát từ|cách|gần|từ)\s+(hồ gươm|hoàn kiếm|trung tâm hà nội|hà nội|ba đình|sao hỏa)(?=\s+(?:dưới|không quá|tối đa|\d+(?:[.,]\d+)?\s*km)|[,.;!?]|$)/iu)?.[1]
      if (namedOrigin) delta.origin = { action: 'set', value: namedOrigin, raw_span: namedOrigin }
      const recentTurnsMessage = messages.find(message =>
        message.role === 'system' && message.content.includes('Recent user turns')
      )?.content
      const recentTurnsJson = recentTurnsMessage?.match(/Recent user turns .*?: (\[[\s\S]*\])$/)?.[1]
      const recentTurns = recentTurnsJson ? JSON.parse(recentTurnsJson) as string[] : []
      if (/^không có cũng được[.!? ]*$/iu.test(text.trim())
        && recentTurns.some(turn => /hướng dẫn tiếng Anh|english guide/iu.test(turn))) {
        delta.guide_language = { action: 'relax', raw_span: text.trim() }
      }
      const date = extractTourDate(text, new Date('2026-11-18T00:00:00.000Z'))
      const dateSpan = text.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/iu)?.[0]
      if (date && dateSpan) delta.date = { action: 'set', value: date, raw_span: dateSpan }
      for (const [slot, value, pattern] of [
        ['nearest', true, /gần nhất|nearest|closest/iu],
        ['cheapest', true, /rẻ nhất|giá thấp nhất|cheapest/iu],
      ] as const) {
        const match = text.match(pattern)
        if (match) delta[slot] = { action: 'set', value, raw_span: match[0] }
      }
      if (/(?:bỏ|xóa|hủy|thôi)\s+(?:giới hạn\s+)?(?:bán kính|km|kilomet)/iu.test(text)) {
        delta.radius = { action: 'clear', raw_span: text.match(/(?:bỏ|xóa|hủy|thôi)\s+(?:giới hạn\s+)?(?:bán kính|km|kilomet)/iu)![0] }
      }
      const responseDelta = deltaOverride ?? delta
      return {
        success: true,
        text: JSON.stringify({
          intent: 'tour_matching',
          conversational_reply: reply,
          conversation_delta: responseDelta,
          follow_up_questions: [],
          missing_primary: missingPrimary,
        }),
        isQuotaExhausted: false,
        isNetworkError: false,
        modelUsed: 'test-mock',
      }
  })
  vi.spyOn(QuotaManager, 'checkCooldown').mockResolvedValue({
    inCooldown: false,
    provider: 'cloudflare_workers_ai',
    model: 'test-mock',
  })
  const classify = vi.spyOn(llmRouter, 'classifyIntent').mockResolvedValue({
    intent: 'catalog_query',
    confidence: 1,
    source: 'llm',
  })
  return { llmCall, classify }
}

describe('booking action intent guard', () => {
  it.each(['\u0111\u1eb7t tour lu\u00f4n cho t\u00f4i', '\u0111\u1eb7t l\u1ecbch ngay gi\u00fap t\u00f4i', '\u0111\u1eb7t lu\u00f4n'])('recognizes %s as a booking action', text => {
    expect(isBookingActionRequest(text)).toBe(true)
  })
})

function addServableSeedImages(): void {
  const repository = demoRepository()
  for (const experience of repository.all('experiences')) {
    const fileId = `test-image-${experience.experience_id}`
    repository.insert('stored_files', {
      file_id: fileId,
      storage_key: `prf-media/${fileId}`,
      media_type: 'image/jpeg',
      file_size_bytes: '1024',
      width_px: '1200',
      height_px: '800',
    })
    repository.insert('profile_media', {
      profile_media_id: `test-media-${experience.experience_id}`,
      file_id: fileId,
      experience_id: experience.experience_id,
      category: 'Activity',
      display_order: '0',
    })
  }
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
    expect(response.json.turn.message).toContain('tính từ Hồ Gươm')
    expect(response.json.turn.message.match(/tính từ Hồ Gươm/g)).toHaveLength(1)
    for (const card of villageCards) {
      expect(card.distance_km).toEqual(expect.any(Number))
      expect(card.distance_source).toBe('haversine')
    }
  })

  it('uses only the current standalone test marker and strips it before parsing', async () => {
    const mocks = installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const sessionId = await openSession()

    const fixtureTurn = await send(sessionId, 'Tìm làng nghề dưới 10 km TEST:')

    expect(fixtureTurn.json.is_test).toBe(true)
    expect(fixtureTurn.json.tour_preference_profile.hard_constraints.radius_km).toBe(10)
    expect(mocks.classify).toHaveBeenCalledWith(
      'Tìm làng nghề dưới 10 km',
      expect.anything(),
    )
    expect(mocks.llmCall.mock.calls[0][0].find(message => message.role === 'user')?.content)
      .toContain('Tìm làng nghề dưới 10 km')
    expect(mocks.llmCall.mock.calls[0][0].find(message => message.role === 'user')?.content)
      .not.toMatch(/\bTEST\b/i)

    const seedTurn = await send(sessionId, 'Tìm làng Phùng Xá')

    expect(seedTurn.json.is_test).toBe(false)
    expect((seedTurn.json.village_cards as Json[]).map(card => card.name).join(' '))
      .not.toContain('Phùng Xá')
    expect(JSON.stringify(seedTurn.json.turn)).toContain('chưa có dữ liệu')
  })

  it.each([
    ['trên 10 km', false],
    ['trên 10 km', true],
    ['hơn 10 km', false],
    ['hơn 10 km', true],
    ['xa hơn 10 km', false],
    ['xa hơn 10 km', true],
    ['từ 5 đến 10 km', false],
    ['từ 5 đến 10 km', true],
    ['5-10 km', false],
    ['5-10 km', true],
    ['ít nhất 10 km', false],
    ['ít nhất 10 km', true],
    ['tối thiểu 10 km', false],
    ['tối thiểu 10 km', true],
    ['ngoài 10 km', false],
    ['ngoài 10 km', true],
  ] as const)('does not apply an unsupported minimum/range distance for %s (fixture=%s)', async (text, isFixture) => {
    const mocks = installLlmMock('Bát Tràng cách 999 km và có bể bơi.')
    const sessionId = await openSession()
    const response = await send(sessionId, text, isFixture)
    const fixedReply = 'Hiện chưa hỗ trợ lọc theo khoảng cách tối thiểu hoặc khoảng cách trong một dải. Bạn có thể nói giới hạn tối đa, ví dụ \'dưới 20 km\'.'
    const row = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const context = typeof row?.conversation_context === 'string'
      ? JSON.parse(row.conversation_context)
      : row?.conversation_context

    expect(response.status).toBe(201)
    expect(response.json.turn.message).toBe(fixedReply)
    expect(messageOutcome({ ok: true, status: response.status, body: response.json }))
      .toEqual({ kind: 'guidance', reply: fixedReply })
    expect(response.json.is_test).toBe(isFixture)
    expect(response.json.village_cards).toEqual([])
    expect(response.json.activity_cards).toEqual([])
    expect(response.json.provider_cards).toEqual([])
    expect(response.json.turn.top_matches).toEqual([])
    expect(response.json.turn.additional_suggestions).toEqual([])
    expect(context?.state.radius_km).toBeUndefined()
    expect(context?.state.slots.radius).toBeUndefined()
    expect(context?.state.budget_per_person).toBeUndefined()
    expect(mocks.llmCall).not.toHaveBeenCalled()
    expect(mocks.classify).not.toHaveBeenCalled()
  })

  it.each([
    ['seed', false],
    ['fixture', true],
  ] as const)('retains explicit craft/group slots without applying unsupported distance on %s data', async (_source, isFixture) => {
    const mocks = installLlmMock('Bát Tràng cách 999 km và có bể bơi.')
    const sessionId = await openSession()
    const response = await send(sessionId, 'gốm, trên 10 km cho 10 khách', isFixture)
    const row = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const context = typeof row?.conversation_context === 'string'
      ? JSON.parse(row.conversation_context)
      : row?.conversation_context

    expect(response.json.turn.message).toMatch(/^Hiện chưa hỗ trợ lọc theo khoảng cách tối thiểu/)
    expect(context?.state).toMatchObject({ craft: 'pottery', group_size: 10 })
    expect(context?.state.radius_km).toBeUndefined()
    expect(context?.state.budget_per_person).toBeUndefined()
    expect(response.json.village_cards).toEqual([])
    expect(mocks.llmCall).not.toHaveBeenCalled()
  })

  it.each([
    ['seed', false],
    ['fixture', true],
  ] as const)('still applies a supported maximum radius on %s data', async (_source, isFixture) => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const response = await send(await openSession(), 'làng nghề dưới 10 km', isFixture)

    expect(response.json.tour_preference_profile.hard_constraints.radius_km).toBe(10)
    expect(response.json.village_cards.length).toBeGreaterThan(0)
  })

  it.each([
    ['seed', false],
    ['fixture', true],
  ] as const)('explains that a zero-kilometer radius is invalid on %s data', async (_source, isFixture) => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const response = await send(await openSession(), 'làng nghề dưới 0 km', isFixture)

    expect(response.status).toBe(201)
    expect(response.json.turn.turn_type).toBe('answer')
    expect(response.json.turn.message).toMatch(/bán kính không hợp lệ/i)
    expect(response.json.turn.message.trim().split(/[.!?]+/).filter(Boolean)).toHaveLength(1)
    expect(response.json.village_cards).toEqual([])
    expect(response.json.activity_cards).toEqual([])
    expect(response.json.provider_cards).toEqual([])
    expect(response.json.turn.top_matches).toEqual([])
    expect(response.json.turn.additional_suggestions).toEqual([])
  })

  it.each([
    ['seed', false],
    ['fixture', true],
  ] as const)('retains explicit structured slots across three turns on %s data', async (_source, isFixture) => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const sessionId = await openSession()
    const marker = isFixture ? ' test' : ''
    const readState = async () => {
      const row = await demoRepository().find(
        'matching_sessions',
        item => item.matching_session_id === sessionId,
      )
      const context = typeof row?.conversation_context === 'string'
        ? JSON.parse(row.conversation_context)
        : row?.conversation_context
      return context?.state
    }

    await send(sessionId, `làng gốm${marker}`)
    expect(await readState()).toMatchObject({
      craft: 'pottery',
      slots: {
        craft: { value: 'pottery', raw_span: 'làng gốm', created_turn: 1, source: 'explicit' },
      },
    })

    await send(sessionId, `dưới 10 km${marker}`)
    expect(await readState()).toMatchObject({
      craft: 'pottery',
      radius_km: 10,
      slots: {
        radius: { value: 10, raw_span: 'dưới 10 km', created_turn: 2, source: 'explicit' },
      },
    })

    await send(sessionId, `14 người${marker}`)
    const state = await readState()
    expect(state).toMatchObject({
      craft: 'pottery',
      radius_km: 10,
      group_size: 14,
      slots: {
        craft: { value: 'pottery', raw_span: 'làng gốm', created_turn: 1, source: 'explicit' },
        radius: { value: 10, raw_span: 'dưới 10 km', created_turn: 2, source: 'explicit' },
        group_size: { value: 14, raw_span: '14 người', created_turn: 3, source: 'explicit' },
      },
    })
  })

  it.each([
    ['seed', false],
    ['fixture', true],
  ] as const)('retains explicit radius while changing to silk on %s data', async (_source, isFixture) => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const sessionId = await openSession()
    const marker = isFixture ? ' test' : ''

    await send(sessionId, `dưới 9 km${marker}`)
    const response = await send(sessionId, `làng dệt lụa gần Hà Nội${marker}`)
    const row = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const context = typeof row?.conversation_context === 'string'
      ? JSON.parse(row.conversation_context)
      : row?.conversation_context

    expect(context?.state).toMatchObject({ craft: 'silk', radius_km: 9 })
    expect(context?.state.budget_per_person).toBeUndefined()
    expect(response.json.turn.message).toContain('Đang áp dụng:')
    if (response.json.turn.turn_type === 'results') {
      expect(response.json.turn.message).toContain('Đang lọc:')
    }
    expect(response.json.turn.message).not.toContain('chưa xác định được')
    expect(response.json.turn.message).not.toContain('ngân sách')
  })

  it('keeps explicit nearest and cheapest preferences in structured state', async () => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const sessionId = await openSession()

    await send(sessionId, 'làng gốm gần nhất')
    await send(sessionId, 'làng gốm rẻ nhất')
    const row = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const context = typeof row?.conversation_context === 'string'
      ? JSON.parse(row.conversation_context)
      : row?.conversation_context

    expect(context?.state.ranking_preferences).toEqual({ nearest: true, cheapest: true })
    expect(context?.state.slots).toMatchObject({
      nearest: { value: true, raw_span: 'gần nhất', source: 'explicit' },
      cheapest: { value: true, raw_span: 'rẻ nhất', source: 'explicit' },
    })
  })

  it('sends structured state and at most two recent user turns, never assistant prose, to the LLM', async () => {
    const mocks = installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const sessionId = await openSession()

    await send(sessionId, 'làng gốm')
    await send(sessionId, 'dưới 10 km')

    const prompt = mocks.llmCall.mock.calls[1][0]
    expect(prompt.filter(message => message.role === 'assistant')).toEqual([])
    expect(prompt.filter(message => message.role === 'user').map(message => message.content))
      .toEqual(['dưới 10 km'])
    expect(prompt.find(message =>
      message.role === 'system' && message.content.includes('Recent user turns')
    )?.content).toContain('"làng gốm"')
    expect(prompt.find(message =>
      message.role === 'system' && message.content.includes('Current structured conversation state')
    )?.content).toContain('"craft":"pottery"')
    expect(prompt.map(message => message.content).join(' ')).not.toMatch(/Hồ Gươm|Hoàn Kiếm|Ho Guom/i)
  })

  it('validates an LLM delta before applying its search slots', async () => {
    const mocks = installLlmMock('Mình đang tìm làng nghề phù hợp.', undefined, [], undefined)
    const sessionId = await openSession()

    const response = await send(sessionId, 'Tìm làng gốm cho 10 khách, dưới 10 km')
    const state = (await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    ))
    const context = typeof state?.conversation_context === 'string'
      ? JSON.parse(state.conversation_context)
      : state?.conversation_context

    expect(response.json.extraction.delta_validation).toMatchObject({
      accepted: {
        craft: { action: 'set', value: 'pottery' },
        group_size: { action: 'set', value: 10 },
        radius: { action: 'set', value: 10 },
      },
      rejected: [],
    })
    expect(context?.state).toMatchObject({ craft: 'pottery', group_size: 10, radius_km: 10 })
    const prompt = mocks.llmCall.mock.calls[0][0]
      .map(message => message.content)
      .join('\n')
    expect(prompt).toContain('"conversation_delta"')
    expect(prompt).not.toContain('"extracted_context"')
  })

  it('keeps state unchanged and reports why an ungrounded model budget delta was rejected', async () => {
    const mocks = installLlmMock('Mình đang tìm làng nghề phù hợp.', undefined, [], 5000)
    const sessionId = await openSession()

    const response = await send(sessionId, 'Tìm làng gốm dưới 10 km')
    const row = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const context = typeof row?.conversation_context === 'string'
      ? JSON.parse(row.conversation_context)
      : row?.conversation_context

    expect(context?.state.budget_per_person).toBeUndefined()
    expect(response.json.extraction.delta_validation.rejected).toContainEqual({
      slot: 'budget_per_person',
      reason: 'raw_span_not_in_latest_user_turn',
    })
    expect(mocks.llmCall).toHaveBeenCalledTimes(1)
  })

  it('rejects a mocked budget hallucination grounded only in a kilometer span [MOCK]', async () => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.', undefined, [], undefined, {
      budget_per_person: { action: 'set', value: 20000, raw_span: '10 km' },
    })
    const sessionId = await openSession()
    const response = await send(sessionId, 'khoảng 10 km làng tò he')
    const row = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const context = typeof row?.conversation_context === 'string'
      ? JSON.parse(row.conversation_context)
      : row?.conversation_context

    expect(context?.state.budget_per_person).toBeUndefined()
    expect(response.json.extraction.delta_validation.rejected).toContainEqual({
      slot: 'budget_per_person',
      reason: 'budget_not_explicitly_stated',
    })
  })

  it('accepts CHAT06 optional English-guide waiver through the validated relax delta', async () => {
    installLlmMock('Đã ghi nhận yêu cầu.')
    const sessionId = await openSession()

    await send(sessionId, 'Tìm chỗ cho khách nước ngoài')
    await send(sessionId, 'Có hướng dẫn tiếng Anh không?')
    const response = await send(sessionId, 'Không có cũng được')
    const row = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const context = typeof row?.conversation_context === 'string'
      ? JSON.parse(row.conversation_context)
      : row?.conversation_context

    expect(response.json.extraction.delta_validation).toMatchObject({
      accepted: {
        guide_language: { action: 'relax', raw_span: 'Không có cũng được' },
      },
      rejected: [],
    })
    expect(context?.state).toMatchObject({
      interests: ['khách nước ngoài'],
      relaxed_fields: ['guide_language'],
      turn_count: 1,
    })
  })

  it('rejects malformed, extra, wrong-clear, and out-of-range model delta fields', async () => {
    const invalidDelta = {
      craft: { action: 'set', value: 'invented-craft', raw_span: 'làng gốm' },
      group_size: { action: 'set', value: 1000, raw_span: '10 khách' },
      radius: { action: 'set', value: 999, raw_span: 'dưới 10 km' },
      budget_per_person: { action: 'set', value: 500000, raw_span: '5.000đ' },
      budget_basis: { action: 'set', value: 'per_person', raw_span: 'dưới 10 km' },
      origin: { action: 'set', value: 'Đà Nẵng', raw_span: 'làng gốm' },
      nearest: 'true',
      cheapest: { action: 'set', value: true, raw_span: 'dưới 10 km' },
      interests: { action: 'clear', raw_span: 'dưới 10 km' },
      guide_language: { action: 'relax', raw_span: 'dưới 10 km' },
      unknown_slot: { action: 'set', value: 'anything', raw_span: 'làng gốm' },
    }
    installLlmMock('Đã ghi nhận yêu cầu.', undefined, [], undefined, invalidDelta)
    const sessionId = await openSession()

    const response = await send(sessionId, 'Tìm làng gốm cho 10 khách dưới 10 km')
    const state = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const context = typeof state?.conversation_context === 'string'
      ? JSON.parse(state.conversation_context)
      : state?.conversation_context
    const rejected = response.json.extraction.delta_validation.rejected as Json[]

    expect(response.json.extraction.delta_validation.accepted).toEqual({})
    expect(context?.state.craft).toBeUndefined()
    expect(context?.state.group_size).toBeUndefined()
    expect(context?.state.radius_km).toBeUndefined()
    expect(rejected).toEqual(expect.arrayContaining([
      { slot: 'craft', reason: 'craft_not_in_catalog' },
      { slot: 'group_size', reason: 'group_size_not_supported_by_raw_span' },
      { slot: 'radius', reason: 'radius_value_does_not_match_raw_span' },
      { slot: 'budget_per_person', reason: 'raw_span_not_in_latest_user_turn' },
      { slot: 'budget_basis', reason: 'per_person_basis_not_stated' },
      { slot: 'origin', reason: 'origin_value_not_supported_by_raw_span' },
      { slot: 'nearest', reason: 'malformed_operation' },
      { slot: 'cheapest', reason: 'cheapest_not_supported_by_raw_span' },
      { slot: 'interests', reason: 'clear_not_explicitly_requested' },
      { slot: 'guide_language', reason: 'no_matching_prior_user_request' },
      { slot: 'craft', reason: 'unknown_slot:unknown_slot' },
    ]))
  })

  it('keeps geo debug logs opt-in and does not change the response', async () => {
    addServableSeedImages()
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const debugCalls = () => info.mock.calls.filter(([message]) =>
      typeof message === 'string' && message.startsWith('ref=')
    )
    const previousDebugFlag = process.env.AIT_DEBUG
    let withoutDebug: Awaited<ReturnType<typeof send>>
    try {
      delete process.env.AIT_DEBUG
      installLlmMock('Mình tìm thấy các làng nghề phù hợp.')
      withoutDebug = await send(await openSession(), 'làng nghề dưới 10 km cho 10 khách')
      expect(debugCalls()).toHaveLength(0)
    } finally {
      if (previousDebugFlag === undefined) delete process.env.AIT_DEBUG
      else process.env.AIT_DEBUG = previousDebugFlag
    }

    vi.stubEnv('AIT_DEBUG', '1')
    const debugMocks = installLlmMock('Mình tìm thấy các làng nghề phù hợp.')
    const withDebug = await send(await openSession(), 'làng nghề dưới 10 km cho 10 khách')

    expect(JSON.stringify(withDebug.json)).not.toMatch(/ref=|debug/i)
    expect(JSON.stringify(withDebug.json)).not.toMatch(/Hồ Gươm|Hoàn Kiếm|Ho Guom/i)
    expect(debugMocks.llmCall.mock.calls[0][0].map(message => message.content).join(' '))
      .not.toMatch(/ref=|AIT_DEBUG/i)
    const responseContent = (json: Json) => {
      const content = { ...json }
      delete content.message
      return content
    }
    expect(responseContent(withDebug.json)).toEqual(responseContent(withoutDebug.json))
    expect(debugCalls()).toHaveLength(1)
    expect(debugCalls()[0]).toHaveLength(2)
    expect(debugCalls()[0][0]).toContain('ref=21.0285,105.8542 (default: trung t\u00e2m H\u00e0 N\u1ed9i)')
    expect(debugCalls()[0][1]).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          precision: expect.any(String),
          score_components: expect.any(Object),
          normalized_weights: expect.any(Object),
          total_score: expect.any(Number),
          decision: expect.any(String),
          reason: expect.any(String),
        }),
      ]))
  })

  it.each([
    ['seed', false],
    ['fixture', true],
  ] as const)('clarifies ambiguous unsupported craft without changing state on %s data', async (_source, isFixture) => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const sessionId = await openSession()
    const marker = isFixture ? ' test' : ''

    await send(sessionId, `làng gốm${marker}`)
    const before = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const beforeContext = typeof before?.conversation_context === 'string'
      ? JSON.parse(before.conversation_context)
      : before?.conversation_context
    const response = await send(sessionId, `làm tò he được không${marker}`)
    const after = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const afterContext = typeof after?.conversation_context === 'string'
      ? JSON.parse(after.conversation_context)
      : after?.conversation_context

    expect(response.json.turn.turn_type).toBe('clarify')
    expect(afterContext?.state).toEqual(beforeContext?.state)
  })

  it.each([
    ['seed', false],
    ['fixture', true],
  ] as const)('treats a known outside-Hanoi origin as out of scope on %s data', async (_source, isFixture) => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.', 'Đà Nẵng')
    const sessionId = await openSession()
    const marker = isFixture ? ' test' : ''

    const response = await send(sessionId, `làng nghề cách Đà Nẵng dưới 10 km${marker}`)

    expect(response.json.turn.message).toContain('ngoài phạm vi Hà Nội')
    expect(response.json.turn.top_matches).toEqual([])
    expect(response.json.turn.message).not.toContain('Cách trung tâm Hà Nội')
  })

  it('applies CHAT06 guide-language relax through the validated delta route', async () => {
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'test-account')
    vi.stubEnv('CLOUDFLARE_API_TOKEN', 'test-token')
    vi.spyOn(QuotaManager, 'checkCooldown').mockResolvedValue({
      inCooldown: false,
      provider: 'cloudflare_workers_ai',
      model: 'delta-chat06-mock',
    })
    vi.spyOn(llmRouter, 'classifyIntent').mockResolvedValue({
      intent: 'catalog_query',
      confidence: 1,
      source: 'llm',
    })
    const responses = [
      {
        intent: 'tour_matching',
        conversational_reply: 'Đã ghi nhận nhóm khách.',
        conversation_delta: {
          interests: { action: 'set', value: ['khách nước ngoài'], raw_span: 'khách nước ngoài' },
        },
        follow_up_questions: [],
        missing_primary: [],
      },
      {
        intent: 'platform_guidance',
        conversational_reply: 'Đang kiểm tra thông tin hướng dẫn tiếng Anh.',
        conversation_delta: {},
        follow_up_questions: [],
        missing_primary: [],
      },
      {
        intent: 'platform_guidance',
        conversational_reply: 'Đã bỏ yêu cầu bắt buộc về hướng dẫn tiếng Anh.',
        conversation_delta: {
          guide_language: { action: 'relax', raw_span: 'Không có cũng được.' },
        },
        follow_up_questions: [],
        missing_primary: [],
      },
    ]
    const llmCall = vi.spyOn(CloudflareAiClient.prototype, 'runChat').mockImplementation(async () => ({
      success: true,
      text: JSON.stringify(responses.shift()),
      isQuotaExhausted: false,
      isNetworkError: false,
      modelUsed: 'delta-chat06-mock',
    }))
    const sessionId = await openSession()

    await send(sessionId, 'Tìm chỗ cho khách nước ngoài.')
    const beforeFaq = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const beforeFaqState = beforeFaq?.conversation_context
      ? JSON.parse(beforeFaq.conversation_context).state
      : undefined

    const faq = await send(sessionId, 'Có hướng dẫn tiếng Anh không?')
    const afterFaq = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const afterFaqState = afterFaq?.conversation_context
      ? JSON.parse(afterFaq.conversation_context).state
      : undefined

    const relax = await send(sessionId, 'Không có cũng được.')
    const afterRelax = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const afterRelaxState = afterRelax?.conversation_context
      ? JSON.parse(afterRelax.conversation_context).state
      : undefined

    expect(llmCall).toHaveBeenCalledTimes(3)
    expect(faq.json.extraction.usedLlm).toBe(true)
    expect(relax.json.extraction.usedLlm).toBe(true)
    expect(faq.status).toBe(201)
    expect(relax.status).toBe(201)
    expect(afterFaqState).toEqual(beforeFaqState)
    expect(relax.json.extraction.delta_validation).toMatchObject({
      accepted: {
        guide_language: { action: 'relax', raw_span: 'Không có cũng được.' },
      },
      unsupported: {},
      rejected: [],
    })
    expect(afterRelaxState).toMatchObject({
      interests: ['khách nước ngoài'],
      relaxed_fields: ['guide_language'],
      turn_count: 1,
    })
    expect(afterRelaxState.slots).toEqual(beforeFaqState.slots)
    console.info('[MOCK-CHAT06-DELTA-STATE]', JSON.stringify({
      beforeFaqState,
      afterFaqState,
      afterRelaxState,
      accepted: relax.json.extraction.delta_validation.accepted,
    }))
  })

  it('does not run direct matching for an origin outside Hanoi', async () => {
    const response = await call(POST_MATCHING, '/api/ait/matching', {
      tour_preference_profile: {
        hard_constraints: { origin: { origin_address: 'Đà Nẵng' } },
        matching_attributes: [{ type: 'craft_preference', value: 'pottery' }],
        preference_weights: {
          experience_fit: 0.4,
          route_convenience: 0.25,
          agency_preferences: 0.2,
          provider_quality: 0.15,
        },
      },
    })

    expect(response.status).toBe(200)
    expect(response.json.top_matches).toEqual([])
    expect(response.json.origin_notice).toContain('ngoài phạm vi Hà Nội')
  })

  it.each([
    ['seed', false],
    ['fixture', true],
  ] as const)('stores unsupported craft without falling back to the previous craft on %s data', async (_source, isFixture) => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.', undefined, ['hương hay tò he'])
    const sessionId = await openSession()
    const marker = isFixture ? ' test' : ''

    await send(sessionId, `làng gốm${marker}`)
    await send(sessionId, `dưới 10 km${marker}`)
    await send(sessionId, `14 người${marker}`)
    const response = await send(
      sessionId,
      `cho khách hoạt động cách 20 km, làm hương hay tò he cho 10 người${marker}`,
    )
    const row = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const context = typeof row?.conversation_context === 'string'
      ? JSON.parse(row.conversation_context)
      : row?.conversation_context

    expect(context?.state).toMatchObject({
      craft: 'hương hay tò he',
      craft_no_data: true,
      radius_km: 20,
      group_size: 10,
    })
    expect(context?.state.exclusions.villages).toEqual([])
    expect(response.json.turn.message).toContain('Hiện chưa có dữ liệu về hương hay tò he.')
    expect(response.json.turn.message).toContain('làng nghề khác đang có dữ liệu')
    expect(response.json.turn.top_matches).toEqual([])
    expect(response.json.turn.message).not.toContain('Bát Tràng có')
    expect(response.json.extraction.delta_validation.unsupported).toEqual({
      craft: { action: 'set', value: 'hương hay tò he', raw_span: 'làm hương hay tò he' },
    })

    const switchedBack = await send(sessionId, 'vậy làm gốm đi')
    const switchedContext = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const switchedState = switchedContext?.conversation_context
      ? JSON.parse(switchedContext.conversation_context).state
      : undefined
    expect(switchedState).toMatchObject({ craft: 'pottery', craft_no_data: false })
    expect(switchedBack.json.turn.message).not.toContain('Hiện chưa có dữ liệu về hương hay tò he.')
  })

  it('reparses stored raw spans and keeps only the last 20 structured turns', () => {
    const stale = normalizeConversationState({
      budget_per_person: 9000,
      slots: {
        budget_per_person: {
          value: 9000,
          raw_span: 'dưới 9 km',
          created_turn: 1,
          source: 'explicit',
        },
      },
    })
    expect(stale.budget_per_person).toBeUndefined()

    let state = emptyConversationState()
    for (let turn = 0; turn < 25; turn += 1) {
      state = mergeConversationState(state, `dưới ${turn + 1} km`, {}, new Date('2026-11-09T00:00:00Z'))
    }

    expect(state.turn_history).toHaveLength(20)
    expect(state.turn_count).toBe(25)
    expect(conversationStateBytes(state)).toBeLessThan(20000)
  })

  it('does not carry inferred slots into the next turn', () => {
    const inferred = mergeConversationState(
      emptyConversationState(),
      'tìm trải nghiệm',
      { craft_preference: 'pottery', group_size: 10 },
      new Date('2026-11-09T00:00:00Z'),
    )
    expect(inferred.slots.craft?.source).toBe('inferred')
    expect(inferred.slots.group_size?.source).toBe('inferred')

    const next = mergeConversationState(
      inferred,
      'dưới 10 km',
      {},
      new Date('2026-11-09T00:00:00Z'),
    )

    expect(next.craft).toBeUndefined()
    expect(next.group_size).toBeUndefined()
    expect(next.slots.craft).toBeUndefined()
    expect(next.slots.group_size).toBeUndefined()
    expect(next.radius_km).toBe(10)
  })

  it.each([
    ['Hồ Gươm', 'làng nghề cách Hồ Gươm dưới 5 km', false],
    ['Hồ Gươm', 'không quá 20 km từ Hồ Gươm', true],
    ['trung tâm Hà Nội', 'làng nghề cách trung tâm Hà Nội dưới 5 km', false],
    ['trung tâm Hà Nội', 'làng nghề cách trung tâm Hà Nội dưới 5 km', true],
    ['Hà Nội', 'làng nghề cách Hà Nội dưới 5 km', false],
    ['Hà Nội', 'làng nghề cách Hà Nội dưới 5 km', true],
    ['gần Hà Nội', 'làng nghề gần Hà Nội dưới 5 km', false],
    ['gần Hà Nội', 'làng nghề gần Hà Nội dưới 5 km', true],
  ] as const)('uses the default origin when the user says %s (%s)', async (_label, text, isTest) => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const sessionId = await openSession()

    const response = await send(sessionId, text, isTest)
    const origin = response.json.extraction.tour_context.origin_or_route

    expect(response.json.extraction.usedLlm).toBe(true)
    expect(origin, JSON.stringify(response.json.extraction)).toBeDefined()
    expect(resolveOriginCoordinates(origin)).toEqual(DEFAULT_HANOI_ORIGIN)
    expect(response.json.turn.message).not.toContain('Chưa xác định được điểm xuất phát')
  })

  it.each([false, true])('reports an explicitly named origin that cannot be resolved (fixture=%s)', async (isTest) => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.', 'Sao Hỏa')
    const sessionId = await openSession()

    const response = await send(sessionId, 'làng nghề cách Sao Hỏa dưới 5 km', isTest)

    expect(response.json.extraction.usedLlm).toBe(true)
    expect(response.json.turn.message).toContain('Chưa nhận ra địa điểm')
    expect(response.json.turn.message).not.toContain('Khoảng cách tính từ trung tâm Hà Nội (Hồ Gươm)')
  })

  it('reports an unrecognized airport origin and says distances use the Hanoi center', async () => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.', 'Sân bay Nội Bài')
    const response = await send(
      await openSession(),
      'làng nghề cách Sân bay Nội Bài dưới 10 km',
    )

    expect(response.json.turn.message).toContain(
      'Chưa nhận ra địa điểm Sân bay Nội Bài, tạm tính từ trung tâm Hà Nội.',
    )
  })

  it('localizes craft and renders radius and distance kilometers for BUG-11/12', async () => {
    installLlmMock('Mình tìm thấy làng lụa phù hợp.')
    const response = await send(
      await openSession(),
      'Tìm làng lụa trong bán kính 20 km.',
    )
    const text = String(response.json.turn.message)
    const appliedLine = text.split('\n').find(line => line.startsWith('Đang áp dụng:'))

    expect(text).not.toMatch(/\b\d+\.\d+\s*km\b/)
    expect(text).toContain('Đang lọc:')
    expect(appliedLine).toContain('lụa')
    expect(appliedLine).not.toMatch(/\b(?:silk|pottery|woodcarving)\b/i)
  })

  it.each([
    ['0 khách gốm', 'khách'],
    ['-5 khách gốm', 'khách'],
    ['gốm dưới 0 km', 'bán kính'],
    ['gốm dưới -5 km', 'bán kính'],
  ])('rejects nonpositive %s with one validation sentence and no generic matches', async (input, invalidField) => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const response = await send(await openSession(), input)
    const turn = response.json.turn

    expect(turn.message).toMatch(invalidField === 'khách' ? /số khách.*không hợp lệ/i : /bán kính.*không hợp lệ/i)
    expect(turn.message.trim().split(/[.!?]+/).filter(Boolean)).toHaveLength(1)
    expect(turn.top_matches).toEqual([])
    expect(turn.additional_suggestions).toEqual([])
    expect(response.json.village_cards).toEqual([])
  })

  it('routes the direct booking request to guidance before intent classification', async () => {
    const classifier = vi.spyOn(llmRouter, 'classifyIntent')
    const outcomes: Array<Awaited<ReturnType<typeof llmRouter.classifyIntent>>> = [
      null,
      { intent: 'catalog_query', confidence: 1, source: 'llm' },
    ]
    for (const outcome of outcomes) {
      demoRepository().reset()
      classifier.mockResolvedValue(outcome)
      const response = await send(await openSession(), '\u0111\u1eb7t tour lu\u00f4n cho t\u00f4i')

      expect(response.status).toBe(200)
      expect(response.json.turn.turn_type).toBe('answer')
      expect(response.json.turn.message).toContain('AI kh\u00f4ng t\u1ef1 \u0111\u1eb7t ho\u1eb7c x\u00e1c nh\u1eadn tour.')
      expect(response.json.turn.top_matches).toEqual([])
      expect(classifier).not.toHaveBeenCalled()
    }
  })

  it.each([
    ['làng nghề cách Hồ Gươm dưới 10 km', undefined, 10],
    ['làng nghề dưới 9 km', undefined, 9],
    ['làng nghề dưới 5 km', undefined, 5],
    ['làng nghề không quá 20 km', undefined, 20],
    ['làng nghề 10k/khách', 10000, undefined],
    ['làng nghề 150.000đ', 150000, undefined],
  ] as const)(
    'parses radius and explicit money separately for %s on seed and fixture',
    async (text, expectedBudget, expectedRadius) => {
      for (const isTest of [false, true]) {
        installLlmMock('Mình đang tìm làng nghề phù hợp.')
        const sessionId = await openSession()

        const response = await send(sessionId, text, isTest)
        const budget = response.json.extraction.tour_context.budget?.max_per_person

        expect(response.json.extraction.usedLlm).toBe(true)
        expect(budget).toBe(expectedBudget)
        expect(response.json.tour_preference_profile?.hard_constraints.radius_km).toBe(expectedRadius)
        expect(response.json.turn.message).not.toContain('Mức giá 0 đ')
      }
    }
  )

  it.each([
    ['seed', false],
    ['fixture', true],
  ] as const)('renders village distances from card fields on %s data', async (_source, isTest) => {
    installLlmMock('Bát Tràng cách 4 km.')
    const sessionId = await openSession()

    const response = await send(sessionId, 'làng nghề dưới 10 km', isTest)
    const villageCards = response.json.village_cards as Json[]
    const message = String(response.json.turn.message)

    expect(villageCards.some(card => String(card.name).includes('Bát Tràng'))).toBe(true)
    expect(message).not.toContain('Bát Tràng cách 4 km')
    expect(message).toContain('Khoảng cách tính từ trung tâm Hà Nội.')
    expect(message.match(/Khoảng cách tính từ trung tâm Hà Nội\./g)).toHaveLength(1)
    for (const card of villageCards) {
      const distance = card.location_source === 'district_fallback'
        ? `khoảng ${Math.round(Number(card.distance_km))} km (ước tính theo huyện)`
        : `Cách trung tâm Hà Nội khoảng ${Number(card.distance_km).toFixed(1).replace('.', ',')} km (đường chim bay)`
      expect(message).toContain(distance)
    }
  })

  it.each([
    ['seed', false],
    ['fixture', true],
  ] as const)('limits village-card results to three on %s data', async (_source, isTest) => {
    installLlmMock('Mình tìm thấy các làng nghề phù hợp.')
    const sessionId = await openSession()

    const response = await send(sessionId, 'làng nghề dưới 10 km', isTest)

    expect(response.json.extraction.usedLlm).toBe(true)
    expect(response.json.village_cards.length).toBeLessThanOrEqual(3)
  })

  it.each([
    ['seed', false, ['Làng gốm Bát Tràng', 'Làng lụa Vạn Phúc', 'Làng múa rối nước Đào Thục']],
    ['fixture', true, ['Làng đúc đồng Ngũ Xã', 'Làng giấy Dó Yên Thái', 'Làng gốm Bát Tràng']],
  ] as const)('ranks villages by explicit radius score and lists eligible overflow on %s data', async (_source, isTest, expectedNames) => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const sessionId = await openSession()

    const response = await send(sessionId, 'làng nghề dưới 10 km', isTest)
    const cards = response.json.village_cards as Json[]
    const names = cards.map(card => String(card.name))

    expect(response.status).toBe(201)
    expect(names).toEqual(expectedNames)
    expect(cards).toHaveLength(3)
    expect(response.json.turn.message).toMatch(/Còn \d+ làng khác trong bán kính:/)
  })

  it('uses fixture and reports the actual order and uncertainty labels for “test dưới 10 km”', async () => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const response = await send(await openSession(), 'test làng nghề dưới 10 km')
    const cards = response.json.village_cards as Json[]
    const allEligible = runVillageCardPipeline({
      cards: resolveTestVillageCards('làng nghề', true),
      radiusKm: 10,
      distanceRequested: true,
    })
    const expectedOverflow = allEligible.slice(3, 6).map(card =>
      `${card.name}${card.radius_status === 'unconfirmed' ? ' — chưa xác nhận bán kính' : ''}`
    ).join(', ')
    const overflowLine = String(response.json.turn.message)
      .split('\n')
      .find(line => line.startsWith('Còn '))

    expect(response.json.is_test).toBe(true)
    expect(cards.map(card => card.name)).toEqual([
      'Làng đúc đồng Ngũ Xã',
      'Làng giấy Dó Yên Thái',
      'Làng gốm Bát Tràng',
    ])
    expect(overflowLine).toBe(
      `Còn ${allEligible.length - 3} làng khác trong bán kính: ${expectedOverflow}.`
    )
  })

  it.each([
    ['seed', false, ['Làng gốm Bát Tràng']],
    ['fixture', true, ['Làng gốm Bát Tràng']],
  ] as const)('filters craft first and then ranks by distance on %s data', async (_source, isTest, expectedNames) => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const sessionId = await openSession()

    const response = await send(sessionId, 'làng gốm dưới 10 km', isTest)

    expect((response.json.village_cards as Json[]).map(card => String(card.name)))
      .toEqual(expectedNames)
  })

  it.each([
    ['seed', false, ['Làng gốm Bát Tràng']],
    ['fixture', true, ['Làng gốm Bát Tràng']],
  ] as const)('recomputes ranking after the explicit craft changes on %s data', async (_source, isTest, expectedNames) => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const sessionId = await openSession()
    await send(sessionId, 'làng nghề dưới 10 km', isTest)

    const response = await send(sessionId, 'làng gốm', isTest)
    const state = await demoRepository().find(
      'matching_sessions',
      row => row.matching_session_id === sessionId,
    )
    const context = typeof state?.conversation_context === 'string'
      ? JSON.parse(state.conversation_context)
      : state?.conversation_context

    expect(context?.state).toMatchObject({ craft: 'pottery', radius_km: 10 })
    expect((response.json.village_cards as Json[]).map(card => String(card.name)))
      .toEqual(expectedNames)
  })

  it.each([
    ['seed', false],
    ['fixture', true],
  ] as const)('removes distance from the active ranking after “thôi bỏ giới hạn km” on %s data', async (_source, isTest) => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const sessionId = await openSession()
    await send(sessionId, 'làng nghề dưới 10 km', isTest)

    const response = await send(sessionId, 'làng nghề, thôi bỏ giới hạn km', isTest)
    const state = await demoRepository().find(
      'matching_sessions',
      row => row.matching_session_id === sessionId,
    )
    const context = typeof state?.conversation_context === 'string'
      ? JSON.parse(state.conversation_context)
      : state?.conversation_context

    expect(context?.state.radius_km).toBeUndefined()
    expect(response.status).toBe(201)
    expect(response.json.village_cards.length).toBeLessThanOrEqual(3)
  })

  it.each([
    ['seed', false],
    ['fixture', true],
  ] as const)('logs normalized explicit weights for %s data without exposing debug output', async (_source, isTest) => {
    if (!isTest) addServableSeedImages()
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.stubEnv('AIT_DEBUG', '1')
    installLlmMock('Mình tìm thấy các làng nghề phù hợp.')
    const response = await send(await openSession(), 'làng nghề dưới 10 km cho 10 khách', isTest)
    const log = info.mock.calls.find(([message]) =>
      typeof message === 'string' && message.startsWith('ref=')
    )
    const rows = log?.[1] as Json[]
    const scored = rows?.find(row => Object.keys(row.score_components).length > 0)

    expect(scored).toBeDefined()
    expect(scored?.total_score).toEqual(expect.any(Number))
    expect(JSON.stringify(response.json)).not.toMatch(/ref=|score_components|normalized_weights/i)
    if (isTest) {
      expect(scored?.normalized_weights).toEqual({ distance: 1 })
      expect(scored?.omitted_components).toContain('group_size')
    } else {
      expect(scored?.normalized_weights.distance).toBeCloseTo(0.35 / 0.6)
      expect(scored?.normalized_weights.group_size).toBeCloseTo(0.25 / 0.6)
    }
  })

  it.each([
    [10, ['Bát Tràng', 'Kim Lan', 'Vạn Phúc']],
    [9, ['Bát Tràng', 'Kim Lan']],
  ] as const)('includes fixture experiences inside the %s km radius', async (radiusKm, expectedNames) => {
    installLlmMock('Mình tìm thấy các trải nghiệm phù hợp.')
    const sessionId = await openSession()

    const response = await send(sessionId, `Tìm trải nghiệm dưới ${radiusKm} km`, true)
    const matches = [
      ...(response.json.turn.top_matches ?? []),
      ...(response.json.turn.additional_suggestions ?? []),
    ] as Json[]
    const villageNames = matches.map(card => String(card.village_name))

    expect(response.json.extraction.usedLlm).toBe(true)
    for (const name of expectedNames) {
      expect(villageNames.some(villageName => villageName.includes(name))).toBe(true)
    }
    const kimLan = matches.find(card => String(card.village_name).includes('Kim Lan'))
    expect(kimLan?.distance_km).toBeCloseTo(8.850426, 5)
    if (radiusKm === 9) {
      expect(villageNames.some(villageName => villageName.includes('Vạn Phúc'))).toBe(false)
    }
  })

  it.each([
    ['seed', false],
    ['fixture', true],
  ] as const)('keeps district-fallback villages with an unconfirmed radius on %s data', async (_source, isTest) => {
    installLlmMock('Mình tìm thấy các làng nghề phù hợp.')
    const sessionId = await openSession()

    const response = await send(sessionId, 'làng nghề dưới 10 km', isTest)
    const villageCards = response.json.village_cards as Json[]

    expect(response.json.extraction.usedLlm).toBe(true)
    if (isTest) {
      for (const name of ['Ngũ Xã', 'Yên Thái']) {
        const card = villageCards.find(item => String(item.name).includes(name))
        expect(card).toMatchObject({
          location_source: 'district_fallback',
          radius_status: 'unconfirmed',
        })
        expect(Number(card?.distance_km)).toBeLessThan(10)
      }
      expect(response.json.turn.message.match(/chưa xác nhận bán kính/gi)?.length).toBeGreaterThanOrEqual(2)
    } else {
      expect(villageCards.some(card => String(card.name).includes('Ngũ Xã'))).toBe(false)
      expect(villageCards.some(card => String(card.name).includes('Yên Thái'))).toBe(false)
    }
  })

  it.each([
    ['seed', false],
    ['fixture', true],
  ] as const)('uses verified villages only when primary facilities are missing (%s)', async (_source, isTest) => {
    installLlmMock(
      'Bát Tràng có homestay. Chàng Sơn có homestay. Phú Vinh sắp xếp bể bơi gần đó.',
      undefined,
      ['homestay', 'bể bơi']
    )
    const sessionId = await openSession()

    const response = await send(
      sessionId,
      'làng nghề có homestay qua đêm, có bể bơi, ăn tối ngon',
      isTest
    )
    const message = String(response.json.turn.message)
    const villageCards = response.json.village_cards as Json[]

    expect(response.json.extraction.usedLlm).toBe(true)
    expect(message).toMatch(/^Hiện chưa có dữ liệu về homestay và bể bơi\./)
    expect(message).not.toContain('ăn tối')
    expect(message).not.toContain('có homestay')
    expect(message).not.toContain('sắp xếp bể bơi')
    expect(villageCards.length).toBeLessThanOrEqual(3)
    for (const card of villageCards) {
      expect(message).toContain(String(card.name))
    }
  })

  it.each([
    ['seed', false],
    ['fixture', true],
  ] as const)('replaces fabricated distance and facility claims on %s data', async (_source, isTest) => {
    if (!isTest) addServableSeedImages()
    installLlmMock('Bát Tràng cách 999 km và có wifi, xe lăn.', undefined, [], undefined)
    const sessionId = await openSession()

    const response = await send(
      sessionId,
      'Tìm trải nghiệm làm gốm dưới 10 km cho 10 khách ngày 12/07/2028',
      isTest
    )
    const message = String(response.json.turn.message)
    const modelReply = String(response.json.extraction.conversational_reply)
    const cards = [
      ...(response.json.turn.top_matches ?? []),
      ...(response.json.turn.additional_suggestions ?? []),
    ] as Json[]

    expect(response.status).toBe(201)
    expect(response.json.extraction.is_complete).toBe(true)
    expect(cards.length).toBeGreaterThan(0)
    expect(message).not.toMatch(/999\s*km|wifi|xe lăn/i)
    expect(modelReply).not.toMatch(/999\s*km|wifi|xe lăn/i)
    for (const card of cards) {
      if (card.distance_source !== 'haversine') continue
      const expectedDistance = card.location_source === 'district_fallback'
        ? `khoảng ${Math.round(Number(card.distance_km))} km (ước tính theo huyện)`
        : `Cách trung tâm Hà Nội khoảng ${Number(card.distance_km).toFixed(1).replace('.', ',')} km (đường chim bay)`
      expect(message).toContain(expectedDistance)
    }
  })

  it('carries an explicit radius but not an unmentioned budget into the next Vietnamese turn', async () => {
    installLlmMock('Mình tìm thấy các trải nghiệm phù hợp.')
    const sessionId = await openSession()
    await send(sessionId, 'Tìm trải nghiệm dưới 9 km', true)

    const response = await send(sessionId, 'làng dệt lụa gần Hà Nội', true)
    const constraints = response.json.tour_preference_profile.hard_constraints

    expect(response.json.extraction.usedLlm).toBe(true)
    expect(constraints.radius_km).toBe(9)
    expect(constraints.max_budget_per_person).toBeUndefined()
    expect(response.json.turn.message).toContain('bán kính 9 km')
    expect(response.json.turn.message).not.toContain('Chưa xác định được điểm xuất phát')
  })

  it('carries an explicitly stated origin into the next Vietnamese turn', async () => {
    installLlmMock('Mình tìm thấy các trải nghiệm phù hợp.')
    const sessionId = await openSession()
    await send(sessionId, 'Tìm làng nghề cách Ba Đình dưới 9 km', true)

    const response = await send(sessionId, 'làng dệt lụa', true)

    expect(response.json.extraction.usedLlm).toBe(true)
    expect(response.json.tour_preference_profile.hard_constraints.origin).toMatchObject({
      origin_address: 'Ba Đình',
    })
  })

  it.each([
    ['scientific notation', '1e3 km'],
    ['written number', 'mười km'],
    ['kilometre spelling', '10 ki-lô-mét'],
  ] as const)('rejects unsupported %s radius without changing state', async (_label, text) => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const sessionId = await openSession()
    const response = await send(sessionId, text)
    const row = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const context = typeof row?.conversation_context === 'string'
      ? JSON.parse(row.conversation_context)
      : row?.conversation_context

    expect(response.status).toBe(201)
    expect(context?.state.radius_km).toBeUndefined()
    expect(context?.state.slots.radius).toBeUndefined()
    expect(response.json.village_cards).toEqual([])
  })

  it.each([
    ['negative radius', 'dưới -5 km'],
    ['zero group', '0 khách'],
  ] as const)('rejects invalid %s before state merge', async (_label, text) => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const sessionId = await openSession()
    const response = await send(sessionId, text)
    const row = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const context = typeof row?.conversation_context === 'string'
      ? JSON.parse(row.conversation_context)
      : row?.conversation_context

    expect(response.status).toBe(201)
    expect(context?.state.radius_km).toBeUndefined()
    expect(context?.state.group_size).toBeUndefined()
  })

  it('does not treat 20 km as origin and sums adult plus child group counts', async () => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const sessionId = await openSession()
    const first = await send(sessionId, 'cho khách hoạt động cách 20 km, làm hương hay tò he cho 10 người')
    const response = await send(sessionId, '10 người lớn 3 trẻ em')
    const row = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === sessionId,
    )
    const context = typeof row?.conversation_context === 'string'
      ? JSON.parse(row.conversation_context)
      : row?.conversation_context

    expect(first.status).toBe(201)
    expect(context?.state.origin).toBeUndefined()
    expect(context?.state.radius_km).toBe(20)
    expect(context?.state.group_size).toBe(13)
    expect(response.status).toBe(201)
  })

  it('splits a total budget only when group size is known', async () => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    const withGroup = await openSession()
    const grouped = await send(withGroup, '1,5 triệu cho cả đoàn 10 người')
    expect(grouped.json.tour_preference_profile.hard_constraints.max_budget_per_person)
      .toBe(150000)

    const withoutGroup = await openSession()
    const missing = await send(withoutGroup, '1,5 triệu cho cả đoàn')
    expect(missing.json.tour_preference_profile.hard_constraints.max_budget_per_person)
      .toBeUndefined()
  })

  it.each([
    ['I want pottery villages under 15km', 'Vui lòng nhập bằng tiếng Việt'],
    ['$20 per person', 'Hiện chưa hỗ trợ đơn vị tiền này, vui lòng nhập bằng đồng'],
  ] as const)('rejects unsupported external-language or currency input: %s', async (text, expected) => {
    installLlmMock('Mình đang tìm trải nghiệm.')
    const response = await send(await openSession(), text)
    const visible = String(response.json.turn.message)

    expect(visible).toMatch(new RegExp(expected, 'iu'))
  })

  it.each([
    'SELECT * FROM villages WHERE 1=1',
    'làng có homestay bể bơi điều hòa wifi',
    'tọa độ GPS của Bát Tràng là bao nhiêu',
    'có bao nhiêu làng gốm ở Hà Nội',
  ])('does not route out-of-scope prompt "%s" into matching', async (text) => {
    installLlmMock('Mình tìm được 5 trải nghiệm.')
    const response = await send(await openSession(), text)
    const visible = String(response.json.turn.message)

    expect(response.status).toBeLessThan(400)
    expect(visible).not.toMatch(/Mình tìm được\s+\d+\s+trải nghiệm/)
    expect(response.json.village_cards ?? []).toEqual([])
  })

  it.each([
    'hôm qua',
    'ngày 31/02',
  ])('rejects invalid date "%s" instead of matching', async (text) => {
    installLlmMock('Mình đang tìm trải nghiệm.')
    const response = await send(await openSession(), text)
    const visible = String(response.json.turn.message)

    expect(visible).toMatch(/ngày|thời gian|không hợp lệ/iu)
  })

  it('formats exact distances with Vietnamese decimal separators and localizes craft state', async () => {
    installLlmMock('Mình tìm thấy làng nghề phù hợp.')
    const response = await send(await openSession(), 'làng gốm dưới 10 km')
    const text = String(response.json.turn.message)

    expect(text).not.toMatch(/\b(?:pottery|silk|woodcarving|bamboo)\b/i)
    expect(text).not.toMatch(/\b\d+\.\d+\s*km\b/)
  })

  it('uses the one-decimal displayed radius for the Bat Trang boundary', async () => {
    installLlmMock('Mình tìm thấy làng nghề phù hợp.')
    const response = await send(await openSession(), 'làng gốm dưới 8,1 km')

    expect(response.status).toBe(201)
    expect(response.json.tour_preference_profile.hard_constraints.radius_km).toBe(8.1)
    expect((response.json.village_cards as Json[]).some(card =>
      String(card.name).includes('Bát Tràng')
    )).toBe(true)
  })

  it('formats the rounded radius with a Vietnamese decimal comma in the route response', async () => {
    installLlmMock('Mình tìm thấy làng nghề phù hợp.')
    const response = await send(await openSession(), 'dưới 8.14 km')
    const text = String(response.json.turn.message)

    expect(response.json.tour_preference_profile.hard_constraints.radius_km).toBe(8.1)
    expect(text).toContain('bán kính 8,1 km')
    expect(text).not.toMatch(/\b8\.1\s*km\b/)
  })

  it('explains that budget removed every match instead of reporting missing distance', async () => {
    addServableSeedImages()
    installLlmMock('Mình đang tìm làng gốm phù hợp.')
    const response = await send(
      await openSession(),
      '10 khách, dưới 10 km, 10k',
    )
    const text = String(response.json.turn.message)

    expect(response.json.turn.turn_type).toBe('no_results')
    expect(text).toContain(
      'Không tìm thấy trải nghiệm nào phù hợp với ngân sách tối đa 10.000đ/người.',
    )
    expect(text).not.toContain('Chưa có dữ liệu khoảng cách')
  })

  it('does not expose NaN distance values when the route receives a corrupted distance result', async () => {
    installLlmMock('Mình đang tìm làng nghề phù hợp.')
    vi.spyOn(geo, 'haversineDistanceKm').mockReturnValue(Number.NaN)
    const response = await send(
      await openSession(),
      'làng nghề dưới 10 km',
    )

    expect(response.status).toBe(201)
    expect(response.json.turn.message).not.toMatch(/\bNaN\b/i)
    expect(response.json.village_cards).toEqual([])
  })

  it('rounds long decimal radius values to at most one decimal in state and text', async () => {
    installLlmMock('Mình tìm thấy làng nghề phù hợp.')
    const response = await send(await openSession(), 'dưới 10.0001 km')
    const row = await demoRepository().find(
      'matching_sessions',
      item => item.matching_session_id === (response.json.message?.session_id ?? ''),
    )

    expect(response.json.tour_preference_profile.hard_constraints.radius_km).toBe(10)
    expect(String(response.json.turn.message)).not.toMatch(/10\.0001/)
  })
  it('omits null capacity and localizes verified distance explanations', async () => {
    installLlmMock('Mình tìm thấy các trải nghiệm phù hợp.')
    const sessionId = await openSession()
    const chat = await send(sessionId, 'Tìm trải nghiệm cho 10 khách dưới 10 km', true)
    const matching = await call(POST_MATCHING, '/api/ait/matching', {
      session_id: sessionId,
      is_test: true,
      tour_preference_profile: chat.json.tour_preference_profile,
    })
    const cards = [
      ...(matching.json.top_matches ?? []),
      ...(matching.json.additional_suggestions ?? []),
    ] as Json[]

    expect(chat.json.extraction.usedLlm).toBe(true)
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      expect(String(card.explanation)).not.toContain('null')
      expect(String(card.explanation)).not.toMatch(/Takes up to|About .* km|straight-line|your starting point/i)
      if (card.distance_source === 'haversine') {
        const distance = card.location_source === 'district_fallback'
          ? `Khoảng ${Math.round(Number(card.distance_km))} km (ước tính theo huyện)`
          : `Cách trung tâm Hà Nội khoảng ${Number(card.distance_km).toFixed(1).replace('.', ',')} km (đường chim bay)`
        expect(String(card.explanation)).toContain(distance)
      }
    }
  })
})
