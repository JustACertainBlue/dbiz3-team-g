import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CloudflareAiClient } from '@/lib/ai/cloudflare-client'
import { extractTourDate } from '@/lib/ai/tour-date'
import { QuotaManager } from '@/lib/ai/quota-manager'
import { parseExplicitBudgetAmount } from '@/lib/ait/budget'
import type { ConversationDelta } from '@/lib/ait/conversation-delta-schema'
import * as llmRouter from '@/lib/ait/llm-router'
import { demoRepository } from '@/lib/demo/json-repository'
import { detectCraftPreference } from '@/lib/matching/craft-taxonomy'
import { resolveVillageCards } from '@/lib/matching/card-resolver'
import { resolveTestVillageCards } from '@/lib/matching/test-dataset'
import * as sessionsRoute from '@/app/api/ait/sessions/route'
import * as messagesRoute from '@/app/api/ait/sessions/[id]/messages/route'

type Json = Record<string, any>
type Handler = (request: never, context?: never) => Promise<Response>

const POST_SESSIONS = (sessionsRoute as unknown as { POST: Handler }).POST
const POST_MESSAGES = (messagesRoute as unknown as { POST: Handler }).POST
const RUN_30 = process.env.RUN_AIT_30_REPLAYS === '1'
const RUN_114 = process.env.RUN_AIT_114_REPLAY === '1'
const RUN_RACE = process.env.RUN_AIT_RACE_REPLAY === '1'
let clock = 1_800_000_000_000
let activePriorTurns: string[] = []
let activeDeltaOverride: unknown

function deltaFor(text: string): ConversationDelta {
  const delta: ConversationDelta = {}
  const craft = detectCraftPreference(text)
  if (craft) delta.craft = { action: 'set', value: craft, raw_span: text }

  if (/khách nước ngoài|khach nuoc ngoai/iu.test(text)) {
    delta.interests = { action: 'set', value: ['khách nước ngoài'], raw_span: text }
  }

  const adultsAndChildren = text.match(/(\d+)\s*người lớn\s*(\d+)\s*trẻ em\b/iu)
  const groupSpan = adultsAndChildren?.[0]
    ?? text.match(/([+-]?\d+)\s*(?:khách|người|bạn|pax|people|guests?)\b/iu)?.[0]
  if (groupSpan) {
    const groupSize = adultsAndChildren
      ? Number(adultsAndChildren[1]) + Number(adultsAndChildren[2])
      : Number(groupSpan.match(/[+-]?\d+/)?.[0])
    delta.group_size = { action: 'set', value: groupSize, raw_span: groupSpan }
  }

  const radius = text.match(/(-?\d+(?:[.,]\d+)?)\s*(?:km|kilometers?|cây\s*số)(?![\p{L}])/iu)
  if (radius) {
    delta.radius = {
      action: 'set',
      value: Number(radius[1].replace(',', '.')),
      raw_span: radius[0],
    }
  }

  const amount = parseExplicitBudgetAmount(text)
  const amountSpan = text.match(/\b\d[\d.,\s]*\s*(?:k\b(?!m)|nghìn|ngàn|triệu|đồng|đ|vnd)(?![\p{L}])/iu)?.[0]
  if (amount !== undefined && amountSpan) {
    const groupTotal = /(?:cả đoàn|toàn đoàn|tổng đoàn|cho cả đoàn)/iu.test(text)
    const groupSize = adultsAndChildren
      ? Number(adultsAndChildren[1]) + Number(adultsAndChildren[2])
      : groupSpan ? Number(groupSpan.match(/\d+/)?.[0]) : undefined
    delta.budget_per_person = {
      action: 'set',
      value: groupTotal && groupSize ? Math.round(amount / groupSize) : amount,
      raw_span: amountSpan,
    }
    delta.budget_basis = {
      action: 'set',
      value: groupTotal ? 'group_total' : 'per_person',
      raw_span: text,
    }
  }

  const origin = text.match(/(?:xuất phát từ|cách|gần|từ)\s+(hoàn kiếm|hồ gươm|ba đình|trung tâm hà nội)(?=\s+(?:dưới|không quá|tối đa|\d+(?:[.,]\d+)?\s*km)|[,.;!?]|$)/iu)?.[1]
  if (origin) delta.origin = { action: 'set', value: origin, raw_span: origin }

  const date = extractTourDate(text, new Date('2026-11-18T00:00:00.000Z'))
  const dateSpan = text.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/iu)?.[0]
  if (date && dateSpan) delta.date = { action: 'set', value: date, raw_span: dateSpan }

  if (/^không có cũng được[.!? ]*$/iu.test(text.trim())
    && activePriorTurns.some(turn => /hướng dẫn tiếng Anh|english guide/iu.test(turn))) {
    delta.guide_language = { action: 'relax', raw_span: text.trim() }
  }

  return delta
}

function installMocks(): void {
  vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'ait-replay-mock-account')
  vi.stubEnv('CLOUDFLARE_API_TOKEN', 'ait-replay-mock-token')
  vi.spyOn(Date, 'now').mockImplementation(() => {
    clock += 60_001
    return clock
  })
  vi.spyOn(QuotaManager, 'checkCooldown').mockResolvedValue({
    inCooldown: false,
    provider: 'cloudflare_workers_ai',
    model: 'ait-state-replay-mock',
  })
  vi.spyOn(llmRouter, 'classifyIntent').mockResolvedValue(null)
  vi.spyOn(CloudflareAiClient.prototype, 'runChat').mockImplementation(async messages => {
    const text = [...messages].reverse().find(message => message.role === 'user')?.content ?? ''
    return {
      success: true,
      text: JSON.stringify({
        intent: 'tour_matching',
        conversational_reply: 'Đã kiểm tra dữ liệu hiện có.',
        conversation_delta: activeDeltaOverride ?? deltaFor(text),
        follow_up_questions: [],
        missing_primary: [],
      }),
      isQuotaExhausted: false,
      isNetworkError: false,
      modelUsed: 'ait-state-replay-mock',
    }
  })
}

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

async function openSession(): Promise<string> {
  const response = await call(POST_SESSIONS, '/api/ait/sessions', {})
  return response.json.session_id as string
}

async function readContext(sessionId: string): Promise<Json> {
  const row = await demoRepository().find(
    'matching_sessions',
    item => item.matching_session_id === sessionId,
  )
  if (!row) return {}
  const raw = row?.conversation_context
  if (typeof raw === 'string') return JSON.parse(raw) as Json
  return raw ? raw as Json : {}
}

function slotSnapshot(state: Json): Json {
  const slots = state.slots ?? {}
  const pick = (name: string) => {
    const value = slots[name]
    return value ? { value: value.value, source_turn: value.source_turn } : null
  }
  return {
    craft: pick('craft'),
    group_size: pick('group_size'),
    budget_per_person: pick('budget_per_person'),
    budget_basis: pick('budget_basis'),
    origin: pick('origin'),
    radius_km: pick('radius'),
    date_or_duration: pick('date') ?? pick('duration'),
    interests: pick('interests'),
  }
}

type ReplayCase = { id: string; input: string; expected: string }
type ReplayChat = { id: string; turns: ReplayCase[] }

const AUTO_FAIL_INVARIANTS = [
  'I1 fixture marker must use Fixture dataset on this turn',
  'I2 absence of fixture marker must use Seed dataset on this turn',
  'I3 a response must not mix Seed and Fixture records',
  'I4 every returned village/provider/activity record must belong to the selected dataset',
  'I5 no unsupported claim that a provider is open, accepting guests, available, or booked',
  'I6 explicit positive group, radius, and budget constraints must appear in state',
  'I7 a turn changing one criterion must preserve every untouched prior slot',
  'I8 Fixture mode must not carry over from the previous turn without a current marker',
] as const

function parse114Cases(): { singles: ReplayCase[]; chats: ReplayChat[] } {
  const markdown = readFileSync(resolve(process.cwd(), 'docs/build/ait_114_test_cases.md'), 'utf8')
  const singles: ReplayCase[] = []
  const chatMap = new Map<string, ReplayChat>()
  for (const line of markdown.split(/\r?\n/u)) {
    if (!line.startsWith('|')) continue
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim())
    const id = cells[0]?.replace(/\*/gu, '').trim()
    if (!id) continue
    if (/^CHAT\d{2}$/u.test(id) && cells.length >= 4 && /^\d+$/u.test(cells[1])) {
      const replayCase = { id, input: cells[2], expected: cells[3] }
      const chat = chatMap.get(id) ?? { id, turns: [] }
      chat.turns.push(replayCase)
      chatMap.set(id, chat)
      continue
    }
    if (/^(?:SYS|DATA|USE|LIM|BOOK|EXP|REC)\d{2}$/u.test(id) && cells.length >= 4) {
      singles.push({ id, input: cells[2], expected: cells[3] })
      continue
    }
    if (/^NAT\d{2}$/u.test(id) && cells.length >= 3) {
      singles.push({ id, input: cells[1], expected: cells[2] })
    }
  }
  return { singles, chats: [...chatMap.values()] }
}

function explicitBudgetFromText(text: string): number | undefined {
  const match = text.match(/(\d[\d.,]*)\s*(triệu|tr\b|k\b|nghìn|ngàn|đồng|đ|vnd)(?![\p{L}])/iu)
  if (!match) return undefined
  const raw = match[1]
  let numeric = raw
  if (raw.includes('.') && raw.includes(',')) {
    numeric = raw.replace(/\./gu, '').replace(',', '.')
  } else if (raw.includes('.')) {
    const tail = raw.split('.').at(-1) ?? ''
    numeric = tail.length === 3 ? raw.replace(/\./gu, '') : raw
  } else if (raw.includes(',')) {
    const tail = raw.split(',').at(-1) ?? ''
    numeric = tail.length === 3 ? raw.replace(',', '') : raw.replace(',', '.')
  }
  const value = Number(numeric)
  if (!Number.isFinite(value)) return undefined
  const unit = match[2].toLocaleLowerCase('vi')
  const multiplier = /^(?:triệu|tr)$/u.test(unit) ? 1_000_000
    : /^(?:k|nghìn|ngàn)$/u.test(unit) ? 1_000 : 1
  return Math.round(value * multiplier)
}

function getStateSlot(state: Json, name: string): unknown {
  return state.slots?.[name]?.value
}

function autoFailReasons({
  input,
  expectedDataset,
  datasetUsed,
  previousDataset,
  stateBefore,
  stateAfter,
  cards,
  text,
  seedIds,
  fixtureIds,
}: {
  input: string
  expectedDataset: 'seed' | 'fixture'
  datasetUsed: 'seed' | 'fixture' | 'not_queried'
  previousDataset?: string
  stateBefore: Json
  stateAfter: Json
  cards: Json[]
  text: string
  seedIds: Set<string>
  fixtureIds: Set<string>
}): string[] {
  const failures: string[] = []
  if (datasetUsed !== 'not_queried' && expectedDataset === 'fixture' && datasetUsed !== 'fixture') {
    failures.push(AUTO_FAIL_INVARIANTS[0])
  }
  if (datasetUsed !== 'not_queried' && expectedDataset === 'seed' && datasetUsed === 'fixture') {
    failures.push(AUTO_FAIL_INVARIANTS[1])
  }
  const cardIds = cards.map(card => String(card.village_id ?? '')).filter(Boolean)
  const hasSeed = cardIds.some(id => seedIds.has(id))
  const hasFixture = cardIds.some(id => fixtureIds.has(id))
  if (hasSeed && hasFixture) failures.push(AUTO_FAIL_INVARIANTS[2])
  const expectedIds = expectedDataset === 'fixture' ? fixtureIds : seedIds
  if (cardIds.some(id => !expectedIds.has(id))) failures.push(AUTO_FAIL_INVARIANTS[3])
  if (/(?:đang mở cửa|đang nhận khách|còn chỗ|đã xác nhận booking|booking thành công|đã đặt tour)/iu.test(text)) {
    failures.push(AUTO_FAIL_INVARIANTS[4])
  }

  const group = input.match(/\b(\d+)\s*(?:khách|người|bạn|pax|people|guests?)\b/iu)
  if (group && Number(group[1]) > 0 && getStateSlot(stateAfter, 'group_size') !== Number(group[1])) {
    failures.push(AUTO_FAIL_INVARIANTS[5])
  }
  const radius = input.match(/(?:dưới|không quá|tối đa|bán kính)\s*(\d+(?:[.,]\d+)?)\s*km\b/iu)
  if (radius) {
    const value = Number(radius[1].replace(',', '.'))
    if (value > 0 && getStateSlot(stateAfter, 'radius') !== value) failures.push(AUTO_FAIL_INVARIANTS[5])
  }
  const budget = explicitBudgetFromText(input)
  if (budget && /(?:ngân sách|tối đa|dưới|không quá|budget|chi phí)/iu.test(input)
    && !/(?:bỏ|xóa|hủy)\s+(?:ngân sách|giá)/iu.test(input)) {
    const groupTotal = /(?:cả đoàn|toàn đoàn|tổng đoàn|cho cả đoàn)/iu.test(input)
    const groupSize = group ? Number(group[1]) : undefined
    const expectedBudget = groupTotal && groupSize ? Math.round(budget / groupSize) : budget
    if (getStateSlot(stateAfter, 'budget_per_person') !== expectedBudget) failures.push(AUTO_FAIL_INVARIANTS[5])
  }

  const reset = /^(?:làm lại từ đầu|reset|bắt đầu lại)[.! ]*$/iu.test(input.trim())
  if (!reset) {
    const mentioned = {
      craft: /(?:gốm|lụa|mộc|nón|mây tre|sơn mài|thêu|đúc đồng|tranh|tò he)/iu.test(input),
      group_size: Boolean(group),
      budget_per_person: budget !== undefined || /(?:bỏ|xóa|hủy)\s+(?:ngân sách|giá)/iu.test(input),
      budget_basis: /(?:cả đoàn|toàn đoàn|tổng đoàn|cho cả đoàn|\/người|mỗi người)/iu.test(input),
      origin: /(?:xuất phát|gần|từ khu vực)/iu.test(input),
      radius: Boolean(radius),
      date: /(?:ngày\s+\d|cuối tuần|ngày mai)/iu.test(input),
      duration: /(?:nửa ngày|hai tiếng|2 tiếng|một ngày)/iu.test(input),
      interests: /(?:khách nước ngoài|khách tây|học sinh|trẻ em)/iu.test(input),
    }
    const beforeSlots = stateBefore.slots ?? {}
    for (const name of Object.keys(beforeSlots)) {
      const normalizedName = name === 'radius' ? 'radius' : name
      if (!mentioned[normalizedName as keyof typeof mentioned]
        && JSON.stringify(getStateSlot(stateAfter, name)) !== JSON.stringify(beforeSlots[name]?.value)) {
        failures.push(AUTO_FAIL_INVARIANTS[6])
        break
      }
    }
  }
  if (previousDataset === 'fixture' && expectedDataset === 'seed' && datasetUsed === 'fixture') {
    failures.push(AUTO_FAIL_INVARIANTS[7])
  }
  return [...new Set(failures)]
}

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/gu, '""')}"`
}

const profiles = [
  { phrase: 'làng gốm', craft: 'pottery', changed: 'lụa', changedCraft: 'silk', group: 10, radius: 20, budget: 300000 },
  { phrase: 'làng lụa', craft: 'silk', changed: 'nón lá', changedCraft: 'conical hat', group: 8, radius: 15, budget: 200000 },
  { phrase: 'làng nón lá', craft: 'conical hat', changed: 'gốm', changedCraft: 'pottery', group: 14, radius: 25, budget: 250000 },
  { phrase: 'làng mây tre đan', craft: 'bamboo', changed: 'sơn mài', changedCraft: 'painting', group: 12, radius: 30, budget: 400000 },
  { phrase: 'làng sơn mài', craft: 'painting', changed: 'mây tre', changedCraft: 'bamboo', group: 6, radius: 10, budget: 150000 },
  { phrase: 'làng mộc', craft: 'woodcarving', changed: 'đúc đồng', changedCraft: 'metalwork', group: 18, radius: 35, budget: 500000 },
  { phrase: 'làng thêu tay', craft: 'embroidery', changed: 'gốm', changedCraft: 'pottery', group: 9, radius: 12, budget: 180000 },
  { phrase: 'làng đúc đồng', craft: 'metalwork', changed: 'lụa', changedCraft: 'silk', group: 20, radius: 40, budget: 600000 },
  { phrase: 'lang lua', craft: 'silk', changed: 'non la', changedCraft: 'conical hat', group: 11, radius: 18, budget: 220000 },
  { phrase: 'làng gốm', craft: 'pottery', changed: 'mộc', changedCraft: 'woodcarving', group: 15, radius: 22, budget: 350000 },
] as const

function startQuery(profile: typeof profiles[number], foreignGuests = false): string {
  return `Tìm trải nghiệm ${profile.phrase} cho ${profile.group} khách dưới ${profile.radius} km, ngân sách ${profile.budget}đ/người${foreignGuests ? ', cho khách nước ngoài' : ''}.`
}

function expectedBase(profile: typeof profiles[number]): Json {
  return {
    craft: { value: profile.craft, source_turn: 1 },
    group_size: { value: profile.group, source_turn: 1 },
    budget_per_person: { value: profile.budget, source_turn: 1 },
    budget_basis: { value: 'per_person', source_turn: 1 },
    origin: null,
    radius_km: { value: profile.radius, source_turn: 1 },
    date_or_duration: null,
    interests: null,
  }
}

function fixtureSuffix(input: string, fixture: boolean): string {
  return fixture ? `${input} test` : input
}

function buildThirtyConversations() {
  return profiles.flatMap((profile, index) => {
    const base = startQuery(profile)
    const initialFixture = index % 2 === 0
    const changedCraftFixture = index % 3 === 0
    const badGroupDelta = index % 3 === 0
    const baseExpected = expectedBase(profile)
    const changedCraftExpected = {
      ...baseExpected,
      craft: { value: profile.changedCraft, source_turn: 2 },
    }
    const faqInput = 'Đặt lịch thế nào?'
    const groupInput = '30 bạn'
    const totalInput = 'Ngân sách tổng 1.500.000đ cho cả đoàn 30 người.'
    const relaxInput = 'Không có cũng được'
    const nearInput = index % 2 === 0 ? '30 bạn' : 'Gần trung tâm ấy.'
    const withForeignGuests = startQuery(profile, true)
    const baseWithInterest = {
      ...baseExpected,
      interests: { value: ['khách nước ngoài'], source_turn: 1 },
    }
    const resetExpected = {
      craft: null,
      group_size: null,
      budget_per_person: null,
      budget_basis: null,
      origin: null,
      radius_km: null,
      date_or_duration: null,
      interests: null,
    }
    const groupExpected = {
      ...baseExpected,
      group_size: {
        value: badGroupDelta ? profile.group : 30,
        source_turn: badGroupDelta ? 1 : 2,
      },
    }
    const totalExpected = {
      ...baseExpected,
      group_size: { value: 30, source_turn: badGroupDelta ? 2 : 3 },
      budget_per_person: { value: 50000, source_turn: badGroupDelta ? 2 : 3 },
      budget_basis: { value: 'group_total', source_turn: badGroupDelta ? 2 : 3 },
    }
    const relaxedExpected = {
      ...baseWithInterest,
    }
    return [
      {
        id: `NEW${String(index * 3 + 1).padStart(2, '0')}`,
        kind: 'craft-change-faq',
        steps: [
          { input: fixtureSuffix(base, initialFixture), expected: baseExpected },
          { input: fixtureSuffix(`Đổi sang ${profile.changed}.`, changedCraftFixture), expected: changedCraftExpected },
          { input: faqInput, expected: changedCraftExpected },
        ],
      },
      {
        id: `NEW${String(index * 3 + 2).padStart(2, '0')}`,
        kind: 'group-budget-reset',
        steps: [
          { input: base, expected: baseExpected },
          { input: groupInput, expected: groupExpected, ...(badGroupDelta ? { badDelta: { group_size: { action: 'set', value: '30', raw_span: '30 bạn' } } } : {}) },
          { input: totalInput, expected: totalExpected },
          { input: 'Làm lại từ đầu', expected: resetExpected },
        ],
      },
      {
        id: `NEW${String(index * 3 + 3).padStart(2, '0')}`,
        kind: 'faq-relax-short-or-near',
        steps: [
          { input: fixtureSuffix(withForeignGuests, index % 2 === 1), expected: baseWithInterest },
          { input: 'Có hướng dẫn tiếng Anh không?', expected: baseWithInterest },
          { input: relaxInput, expected: relaxedExpected },
          { input: nearInput, expected: index % 2 === 0
            ? { ...relaxedExpected, group_size: { value: 30, source_turn: 2 } }
            : relaxedExpected },
        ],
      },
    ]
  })
}

describe('AIT replay harnesses [MOCK]', () => {
  beforeEach(() => {
    demoRepository().reset()
    activePriorTurns = []
    activeDeltaOverride = undefined
    installMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it.skipIf(!RUN_30)('runs 30 new 3-4-turn conversations with literal slot oracles [MOCK]', async () => {
    const scenarios = buildThirtyConversations()
    expect(scenarios).toHaveLength(30)
    const records: Array<Record<string, unknown>> = []
    const redCases: Array<Record<string, unknown>> = []

    for (const scenario of scenarios) {
      const sessionId = await openSession()
      activePriorTurns = []
      for (const [index, step] of scenario.steps.entries()) {
        const before = await readContext(sessionId)
        const stateBefore = before.state ?? {}
        activeDeltaOverride = 'badDelta' in step ? step.badDelta : undefined
        const response = await call(
          POST_MESSAGES,
          `/api/ait/sessions/${sessionId}/messages`,
          { sender: 'Agency', text: step.input },
          { id: sessionId },
        )
        activeDeltaOverride = undefined
        const after = await readContext(sessionId)
        const stateAfter = after.state ?? {}
        const json = response.json ?? {}
        const expectedDataset = /\btest\b/iu.test(step.input) ? 'fixture' : 'seed'
        const datasetUsed = json.is_test === true ? 'fixture' : json.is_test === false ? 'seed' : 'not_queried'
        const message = String(json.turn?.message ?? '')
        const label = `${scenario.id} turn ${index + 1}: ${step.input}`
        const check = (name: string, assertion: () => void) => {
          try {
            assertion()
          } catch (error) {
            redCases.push({
              scenario: scenario.id,
              turn: index + 1,
              input: step.input,
              invariant: name,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }
        check('HTTP 201', () => expect(response.status, label).toBe(201))
        if (datasetUsed !== 'not_queried') {
          check('dataset follows current-turn marker', () => expect(datasetUsed).toBe(expectedDataset))
        }
        check('literal slot oracle', () => {
          expect(slotSnapshot(stateAfter), label).toMatchObject(step.expected)
        })
        if (/^(?:Đặt lịch thế nào\?|Có hướng dẫn tiếng Anh không\?)$/iu.test(step.input)) {
          check('FAQ/help preserves prior slots', () => {
            expect(slotSnapshot(stateAfter)).toEqual(slotSnapshot(stateBefore))
          })
        }
        if (/^Không có cũng được$/iu.test(step.input)) {
          check('guide-language relaxation is recorded', () => {
            expect(stateAfter.relaxed_fields).toContain('guide_language')
          })
        }
        if (/^Làm lại từ đầu$/iu.test(step.input)) {
          check('reset clears every tracked slot', () => {
            expect(slotSnapshot(stateAfter)).toMatchObject({
              craft: null,
              group_size: null,
              budget_per_person: null,
              budget_basis: null,
              origin: null,
              radius_km: null,
              date_or_duration: null,
              interests: null,
            })
          })
        }
        records.push({
          scenario: scenario.id,
          kind: scenario.kind,
          turn: index + 1,
          input: step.input,
          dataset_expected: expectedDataset,
          dataset_used: datasetUsed,
          slots_before: slotSnapshot(stateBefore),
          slots_after: slotSnapshot(stateAfter),
          delta_validation: json.extraction?.delta_validation ?? null,
          response_text: message,
        })
        activePriorTurns.push(step.input)
      }
    }

    const reportPath = resolve(process.cwd(), 'docs/build/ait-30-conversation-replay.json')
    mkdirSync(resolve(process.cwd(), 'docs/build'), { recursive: true })
    const transcripts = scenarios.map(scenario => ({
      id: scenario.id,
      kind: scenario.kind,
      turns: records.filter(record => record.scenario === scenario.id),
    }))
    let randomSeed = 0xA17
    const shuffled = [...transcripts]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0
      const swapIndex = randomSeed % (index + 1)
      const current = shuffled[index]
      shuffled[index] = shuffled[swapIndex]
      shuffled[swapIndex] = current
    }
    const sampledTranscripts = shuffled.slice(0, 10)
    const riskRank = (transcript: typeof transcripts[number]) =>
      transcript.kind === 'group-budget-reset' ? 3
        : transcript.kind === 'faq-relax-short-or-near' ? 2 : 1
    const fiveWorstCases = [...transcripts]
      .sort((left, right) => riskRank(right) - riskRank(left) || left.id.localeCompare(right.id))
      .slice(0, 5)
    writeFileSync(reportPath, `${JSON.stringify({
      label: '[MOCK]',
      oracle: 'Literal expected slot values and source turns are declared in buildThirtyConversations before execution; no system parse/merge helper computes expectations.',
      conversation_count: scenarios.length,
      turn_count: records.length,
      fields: ['craft', 'group_size', 'budget_per_person', 'budget_basis', 'origin', 'radius_km', 'date_or_duration', 'interests'],
      transcripts,
      seeded_random_sample_10: sampledTranscripts,
      five_highest_risk_scenarios: fiveWorstCases,
      red_cases: redCases,
    }, null, 2)}\n`, 'utf8')
    console.info('[MOCK-30-CONVERSATION-REPLAY]', JSON.stringify({
      conversations: scenarios.length,
      turns: records.length,
      red_cases: redCases.length,
      report: reportPath,
    }))
    expect(redCases, 'replay failures [MOCK]; see persisted red_cases for details').toEqual([])
  })

  it.skipIf(!RUN_RACE)('preserves independent slots across concurrent turns in one AIT session [MOCK]', async () => {
    const sessionId = await openSession()
    const initial = await call(
      POST_MESSAGES,
      `/api/ait/sessions/${sessionId}/messages`,
      { sender: 'Agency', text: 'Tìm trải nghiệm làm gốm.' },
      { id: sessionId },
    )
    expect(initial.status).toBe(201)
    const concurrent = await Promise.all([
      call(
        POST_MESSAGES,
        `/api/ait/sessions/${sessionId}/messages`,
        { sender: 'Agency', text: '20 khách' },
        { id: sessionId },
      ),
      call(
        POST_MESSAGES,
        `/api/ait/sessions/${sessionId}/messages`,
        { sender: 'Agency', text: 'dưới 10 km' },
        { id: sessionId },
      ),
    ])
    const finalState = (await readContext(sessionId)).state ?? {}
    expect(concurrent.map(response => response.status)).toEqual([201, 201])
    expect(finalState).toMatchObject({ craft: 'pottery', group_size: 20, radius_km: 10 })
  })

  it.skipIf(!RUN_114)('runs all 114 cases / 126 inputs with eight auto-FAIL invariants [MOCK]', async () => {
    const { singles, chats } = parse114Cases()
    expect(singles).toHaveLength(108)
    expect(chats).toHaveLength(6)
    expect(chats.reduce((count, chat) => count + chat.turns.length, 0)).toBe(18)

    const seedIds = new Set(resolveVillageCards('làng nghề', true).map(card => card.village_id))
    const fixtureIds = new Set(resolveTestVillageCards('', true).map(card => card.village_id))
    const records: Array<Record<string, unknown>> = []

    const runTurn = async (
      testCase: ReplayCase,
      sessionId: string,
      turn: number | 'single',
      previousDataset?: string,
    ) => {
      const stateBefore = await readContext(sessionId)
      const response = await call(
        POST_MESSAGES,
        `/api/ait/sessions/${sessionId}/messages`,
        { sender: 'Agency', text: testCase.input },
        { id: sessionId },
      )
      const stateAfter = await readContext(sessionId)
      const json = response.json ?? {}
      const turnJson = json.turn ?? {}
      const text = String(turnJson.message ?? json.conversational_reply ?? '')
      const cards = [
        ...(Array.isArray(json.village_cards) ? json.village_cards : []),
        ...(Array.isArray(turnJson.top_matches) ? turnJson.top_matches : []),
        ...(Array.isArray(turnJson.additional_suggestions) ? turnJson.additional_suggestions : []),
      ] as Json[]
      const expectedDataset: 'seed' | 'fixture' = /\btest\b/iu.test(testCase.input) ? 'fixture' : 'seed'
      const responseDataset = json.is_test ?? json.tour_preference_profile?.is_test
      let datasetUsed: 'seed' | 'fixture' | 'not_queried'
      if (responseDataset === true) datasetUsed = 'fixture'
      else if (responseDataset === false) datasetUsed = 'seed'
      else {
        const cardIds = cards.map(card => String(card.village_id ?? '')).filter(Boolean)
        const seedOnly = cardIds.length > 0 && cardIds.every(id => seedIds.has(id))
        const fixtureOnly = cardIds.length > 0 && cardIds.every(id => fixtureIds.has(id))
        datasetUsed = seedOnly && !fixtureOnly ? 'seed'
          : fixtureOnly && !seedOnly ? 'fixture' : 'not_queried'
      }
      const failures = autoFailReasons({
        input: testCase.input,
        expectedDataset,
        datasetUsed,
        previousDataset,
        stateBefore: stateBefore.state ?? {},
        stateAfter: stateAfter.state ?? {},
        cards,
        text,
        seedIds,
        fixtureIds,
      })
      const status = response.status >= 500 || !response.json ? 'BLOCKED'
        : failures.length > 0 ? 'FAIL' : 'REVIEW'
      const row = {
        test_id: testCase.id,
        test_group: testCase.id.match(/^[A-Z]+/u)?.[0] ?? '',
        turn,
        input: testCase.input,
        expected_result: testCase.expected,
        actual_result: text || JSON.stringify(json),
        dataset_expected: expectedDataset,
        dataset_used: datasetUsed,
        matched_records: JSON.stringify(cards.map(card => ({
          id: card.village_id ?? card.provider_id ?? card.experience_id,
          village_id: card.village_id ?? null,
          provider_id: card.provider_id ?? null,
          experience_id: card.experience_id ?? null,
          name: card.name ?? card.village_name ?? card.business_name,
        }))),
        score: '',
        status,
        failure_reason: failures.join('; '),
        severity: failures.length > 0 ? 'critical' : response.status >= 500 ? 'blocked' : 'not_semantically_scored',
        evidence: JSON.stringify({
          label: '[MOCK]',
          http_status: response.status,
          is_test_flag: typeof responseDataset === 'boolean' ? responseDataset : 'not_returned',
          state_before: slotSnapshot(stateBefore.state ?? {}),
          state_after: slotSnapshot(stateAfter.state ?? {}),
          auto_fail_checks: failures,
          semantic_expected_result_scored: false,
        }),
      }
      records.push(row)
      activePriorTurns.push(testCase.input)
      return { row, datasetUsed }
    }

    for (const testCase of singles) {
      const sessionId = await openSession()
      activePriorTurns = []
      await runTurn(testCase, sessionId, 'single')
    }

    const summaries: Array<Record<string, unknown>> = []
    for (const chat of chats) {
      const sessionId = await openSession()
      activePriorTurns = []
      let previousDataset: string | undefined
      const chatRows: Array<Record<string, unknown>> = []
      for (const [index, testCase] of chat.turns.entries()) {
        const result = await runTurn(testCase, sessionId, index + 1, previousDataset)
        previousDataset = result.datasetUsed
        chatRows.push(result.row)
      }
      const failures = chatRows.flatMap(row => String(row.failure_reason ?? '').split('; ').filter(Boolean))
      summaries.push({
        test_id: chat.id,
        test_group: 'conversation_summary',
        turn: 'SUMMARY',
        input: chat.turns.map(turn => turn.input).join(' → '),
        expected_result: chat.turns.map(turn => turn.expected).join(' | '),
        actual_result: chatRows.map(row => row.actual_result).join(' | '),
        dataset_expected: 'per-turn, see evidence',
        dataset_used: String(chatRows.map(row => row.dataset_used).join(' → ')),
        matched_records: String(chatRows.map(row => row.matched_records).join(' | ')),
        score: '',
        status: chatRows.some(row => row.status === 'BLOCKED') ? 'BLOCKED'
          : failures.length > 0 ? 'FAIL' : 'REVIEW',
        failure_reason: [...new Set(failures)].join('; '),
        severity: failures.length > 0 ? 'critical' : 'not_semantically_scored',
        evidence: JSON.stringify({ label: '[MOCK]', turn_count: chatRows.length, rollup_only: true }),
      })
    }

    expect(records).toHaveLength(126)
    const allRows = [...records, ...summaries]
    const columns = [
      'test_id', 'test_group', 'turn', 'input', 'expected_result', 'actual_result',
      'dataset_expected', 'dataset_used', 'matched_records', 'score', 'status',
      'failure_reason', 'severity', 'evidence',
    ]
    const csv = [
      columns.join(','),
      ...allRows.map(row => columns.map(column => csvCell(row[column])).join(',')),
    ].join('\r\n')
    const csvPath = resolve(process.cwd(), 'docs/build/ait-114-mock-results.csv')
    const jsonPath = resolve(process.cwd(), 'docs/build/ait-114-mock-invariants.json')
    mkdirSync(resolve(process.cwd(), 'docs/build'), { recursive: true })
    writeFileSync(csvPath, `${csv}\r\n`, 'utf8')
    writeFileSync(jsonPath, `${JSON.stringify({
      label: '[MOCK]',
      case_count: singles.length + chats.length,
      input_count: records.length,
      conversation_rollups: summaries.length,
      eight_auto_fail_invariants: AUTO_FAIL_INVARIANTS,
      pass_count: records.filter(row => row.status === 'PASS').length,
      fail_count: records.filter(row => row.status === 'FAIL').length,
      blocked_count: records.filter(row => row.status === 'BLOCKED').length,
      review_count: records.filter(row => row.status === 'REVIEW').length,
      semantic_scores: 'Not assigned; model is mocked and expected-result semantics require human review.',
      csv: csvPath,
    }, null, 2)}\n`, 'utf8')
    console.info('[MOCK-114-REPLAY]', JSON.stringify({
      case_count: singles.length + chats.length,
      input_count: records.length,
      auto_fail: records.filter(row => row.status === 'FAIL').length,
      blocked: records.filter(row => row.status === 'BLOCKED').length,
      report: csvPath,
      invariants: AUTO_FAIL_INVARIANTS,
    }))
  })
})
