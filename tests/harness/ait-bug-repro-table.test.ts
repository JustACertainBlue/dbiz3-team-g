import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { CloudflareAiClient } from '@/lib/ai/cloudflare-client'
import { extractTourDate } from '@/lib/ai/tour-date'
import { parseExplicitBudgetAmount } from '@/lib/ait/budget'
import { QuotaManager } from '@/lib/ai/quota-manager'
import * as llmRouter from '@/lib/ait/llm-router'
import * as sessionsRoute from '@/app/api/ait/sessions/route'
import * as messagesRoute from '@/app/api/ait/sessions/[id]/messages/route'
import { detectCraftPreference } from '@/lib/matching/craft-taxonomy'
import * as geo from '@/lib/matching/geo'
import type { ConversationDelta } from '@/lib/ait/conversation-delta-schema'

type Handler = (request: never, context?: never) => Promise<Response>
type Json = Record<string, any>
type BugRow = { id: string; sourceText: string; routeInput: string }

const POST_SESSIONS = (sessionsRoute as unknown as { POST: Handler }).POST
const POST_MESSAGES = (messagesRoute as unknown as { POST: Handler }).POST
const RUN_REPROS = process.env.RUN_AIT_BUG_REPRO === '1'
let clock = 1_800_000_000_000
let activeBugId = ''

function parseBugRows(markdown: string): BugRow[] {
  const rows: BugRow[] = []
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^\|\s*\*\*BUG-(\d{2})\s*\([^|]+\|\s*(.*?)\s*\|/)
    if (!match) continue
    const id = `BUG-${match[1]}`
    const sourceText = match[2].trim()
    const routeInput = sourceText.match(/"([^"]+)"/)?.[1] ?? sourceText
    rows.push({ id, sourceText, routeInput })
  }
  return rows
}

function deltaFor(text: string): ConversationDelta {
  const delta: ConversationDelta = {}
  const craft = detectCraftPreference(text)
  if (craft) delta.craft = { action: 'set', value: craft, raw_span: text }

  const unsupportedCraft = text.match(/(?:làm|làng nghề|làng)\s*(giấy dó|bánh cuốn|tò\s*he|hương(?:\s+hay\s+tò\s*he)?)/iu)
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
  const groupSize = adultsAndChildren
    ? Number(adultsAndChildren[1]) + Number(adultsAndChildren[2])
    : groupSpan ? Number(groupSpan.match(/\d+/)?.[0]) : undefined
  if (groupSpan && groupSize !== undefined) {
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
  const amountSpan = text.match(/\b\d[\d.,\s]*\s*(?:k\b(?!m)|nghìn|ngàn|triệu|đ|vnd)(?![\p{L}])/iu)?.[0]
  if (amount !== undefined && amountSpan) {
    const groupTotal = /(?:cả đoàn|toàn đoàn|tổng đoàn|cho cả đoàn)/iu.test(text)
    const perPerson = groupTotal && groupSize ? Math.round(amount / groupSize) : amount
    delta.budget_per_person = { action: 'set', value: perPerson, raw_span: amountSpan }
    delta.budget_basis = {
      action: 'set',
      value: groupTotal ? 'group_total' : 'per_person',
      raw_span: text,
    }
  }

  const origin = text.match(/(?:xuất phát từ|cách|gần|từ)\s+(hồ gươm|hoàn kiếm|trung tâm hà nội|hà nội|ba đình|nội bài|sân bay nội bài|đà nẵng)(?=\s+(?:dưới|không quá|tối đa|\d+(?:[.,]\d+)?\s*km)|[,.;!?]|$)/iu)?.[1]
  if (origin) delta.origin = { action: 'set', value: origin, raw_span: origin }

  const date = extractTourDate(text, new Date('2026-11-18T00:00:00.000Z'))
  const dateSpan = text.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/iu)?.[0]
  if (date && dateSpan) delta.date = { action: 'set', value: date, raw_span: dateSpan }

  if (/(?:bỏ|xóa|hủy|thôi)\s+(?:giới hạn\s+)?(?:bán kính|km|kilomet)/iu.test(text)) {
    delta.radius = { action: 'clear', raw_span: text.match(/(?:bỏ|xóa|hủy|thôi)\s+(?:giới hạn\s+)?(?:bán kính|km|kilomet)/iu)![0] }
  }
  return delta
}

function classifyOutcome(
  bugId: string,
  routeInput: string,
  state: Json,
  result: Json,
): { status: string; criterion: string } {
  const text = String(result.turn?.message ?? result.conversational_reply ?? '')
  const cards = [
    ...(result.turn?.top_matches ?? []),
    ...(result.turn?.additional_suggestions ?? []),
    ...(result.village_cards ?? []),
  ]
  const radius = state.radius_km
  const budget = state.budget_per_person
  const groupSize = state.group_size
  const reproduced = (condition: boolean, criterion: string) => ({
    status: condition ? 'còn tái hiện trên [MOCK]' : 'không tái hiện trên [MOCK]',
    criterion,
  })
  const inconclusive = (criterion: string) => ({
    status: 'không kết luận được từ lượt [MOCK]',
    criterion,
  })

  switch (bugId) {
    case 'BUG-03':
      return reproduced(radius === 0 && cards.length > 0, 'Bán kính 0 tạo kết quả.')
    case 'BUG-04':
      return reproduced([10, 5].includes(Number(radius)) && cards.length > 0, 'Cụm yêu cầu khoảng cách tối thiểu/range bị dùng như bán kính tối đa.')
    case 'BUG-05':
      return reproduced(radius === undefined, 'Không nhận diện được đơn vị cây số.')
    case 'BUG-06':
    case 'BUG-26':
      return reproduced(cards.length > 0 || /\b(?:có|có thể)\b.{0,30}\b(?:wifi|homestay|bể bơi|điều hòa)\b/i.test(text), 'Yêu cầu tiện ích trả kết quả/khẳng định tiện ích thay vì từ chối dữ liệu thiếu.')
    case 'BUG-07':
      return reproduced(cards.length > 0 || !text.includes('Hiện chưa có dữ liệu'), 'Nghề ngoài dữ liệu không được báo thiếu dữ liệu.')
    case 'BUG-08':
      return reproduced(state.origin === '20 km' || radius !== 20 || groupSize !== 10, 'Câu khoảng cách bị gán sang origin hoặc mất bán kính/số khách.')
    case 'BUG-09':
      return inconclusive('Input nguồn chỉ ghi “sân bay Nội Bài”, không nói rõ đây là điểm xuất phát; delta mock không tự suy diễn origin. Kiểm tra route riêng với delta origin tường minh đã xác nhận có thông báo.')
    case 'BUG-10':
      return reproduced(/chưa có dữ liệu khoảng cách/i.test(text), 'Thông báo sai lý do loại kết quả, nêu thiếu khoảng cách.')
    case 'BUG-11':
      return inconclusive('Nguồn chỉ nêu “mọi câu hiển thị khoảng cách tọa độ thật”, không có câu truy vấn; chạy nguyên văn mô tả không kiểm tra được định dạng khoảng cách.')
    case 'BUG-12':
      return inconclusive('Nguồn chỉ nêu “mọi lượt hỏi có nghề”, không có câu truy vấn cụ thể; mock này không xác minh được taxonomy ở các lượt matching.')
    case 'BUG-13':
      return reproduced(/Hồ Gươm/.test(text), 'Text chuẩn hóa “ho guom” thành “Hồ Gươm”.')
    case 'BUG-14':
      return reproduced(Boolean(state.date) || !/(?:ngày|ngay).{0,30}(?:không hợp lệ|không tồn tại|chưa hợp lệ)/i.test(text), 'Ngày quá khứ/không hợp lệ được chấp nhận hoặc không có cảnh báo.')
    case 'BUG-15':
      return reproduced(groupSize !== 13, 'Tổng người lớn và trẻ em không bằng 13.')
    case 'BUG-16':
      return reproduced(
        groupSize === 0 || /0 khách/.test(text) || (groupSize === undefined && cards.length > 0),
        'Validator rejects group_size=0 and leaves it out of state, but the route still returns generic matches without explaining the invalid group size.',
      )
    case 'BUG-17':
      return {
        status: 'hành vi theo JQ-03; [MOCK] classifier được stub thành catalog_query',
        criterion: 'No deterministic creative-writing refusal matches this request, so classification is left to the LLM. The harness forces catalog_query; this reflects the entity-first JQ-03 decision only under the stub, not verified real-model behavior.',
      }
    case 'BUG-18':
      return reproduced(budget === 1500000 || state.budget_basis !== 'group_total', 'Tổng ngân sách không được chia theo 10 khách hoặc mất basis.')
    case 'BUG-19':
      return reproduced(radius === 3, 'Scientific notation bị parse thành 3 km.')
    case 'BUG-20':
      return reproduced(/\bNaN\b/i.test(text), 'Đã inject distance NaN vào haversine trong test route; text phản hồi không được chứa NaN.')
    case 'BUG-21':
      return reproduced(budget !== undefined, 'Delta ngân sách không có căn cứ tiền được chấp nhận.')
    case 'BUG-22':
      return reproduced(/\b\d+\.\d+\s*km\b/.test(text), 'Kiểm tra dấu chấm trong số km hiển thị sau khi radius state được làm tròn theo JQ-04.')
    case 'BUG-23':
      return reproduced(radius === 10.0001 || /10\.0001\s*km/.test(text), 'Radius/text vẫn giữ bốn chữ số thập phân.')
    case 'BUG-24':
      return reproduced(cards.length > 0 || !/(?:tiếng Việt|tiếng việt|Vietnamese)/i.test(text), 'Input tiếng Anh không được giải thích rõ hoặc vẫn trả kết quả.')
    case 'BUG-25':
      return reproduced(
        budget !== undefined || !/(?:không hỗ trợ|nhập bằng đồng|đơn vị tiền này)/i.test(text),
        'Ngoại tệ bị hiểu thành VND hoặc không có thông báo đơn vị không hỗ trợ.',
      )
    case 'BUG-27':
      return reproduced(
        cards.length > 0,
        'Mock route bỏ qua booking action; isBookingActionRequest không khớp “đặt tour luôn”, còn router không có luật cho “giảm giá 50%”/“cho xem giá tháng sau”. TẠM cho Giai đoạn B, không thêm luật ở lượt này.',
      )
    case 'BUG-28':
      return reproduced(cards.length > 0, 'Câu hỏi thống kê/GPS bị trả danh sách matching.')
    case 'BUG-29':
      return inconclusive('Replay dùng câu Persona 6 từ tests/harness/personas.test.ts và ép classifier trả null để đi nhánh fallback; delta vẫn do heuristic mock sinh, nên không kết luận về extraction của model thật.')
    default:
      return { status: 'không có oracle phân loại cho input này', criterion: routeInput }
  }
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

async function execute(row: BugRow) {
  const request = { sender: 'Agency', text: row.routeInput }
  demoRepository().reset()
  const session = await call(POST_SESSIONS, '/api/ait/sessions', {})
  const sessionId = session.json.session_id as string
  const nanDistance = row.id === 'BUG-20'
    ? vi.spyOn(geo, 'haversineDistanceKm').mockReturnValue(Number.NaN)
    : undefined
  let response: Awaited<ReturnType<typeof call>>
  try {
    response = await call(
      POST_MESSAGES,
      `/api/ait/sessions/${sessionId}/messages`,
      request,
      { id: sessionId },
    )
  } finally {
    nanDistance?.mockRestore()
  }
  const match = await demoRepository().find(
    'matching_sessions',
    item => item.matching_session_id === sessionId,
  )
  const context = typeof match?.conversation_context === 'string'
    ? JSON.parse(match.conversation_context)
    : match?.conversation_context
  const state = context?.state ?? {}
  const result = response.json ?? {}
  const conclusion = classifyOutcome(row.id, row.routeInput, state, result)
  return {
    ...row,
    dataset: /\btest\b/i.test(row.routeInput) ? 'fixture' : 'seed',
    httpStatus: response.status,
    state,
    responseText: String(result.turn?.message ?? result.conversational_reply ?? ''),
    deltaValidation: result.extraction?.delta_validation ?? null,
    conclusion,
  }
}

function renderReport(
  records: Array<Awaited<ReturnType<typeof execute>> | Record<string, unknown>>,
  generatedAt: string,
) {
  const details = records.map(record => {
    const data = record as Record<string, any>
    return [
      `### ${data.id}`,
      '',
      `- Câu gây lỗi nguyên văn từ anti report: ${data.sourceText}`,
      `- Input gửi route: ${data.routeInput ?? '—'}`,
      `- Dataset: ${data.dataset ?? '—'}`,
      `- Kết luận: ${data.conclusion?.status ?? data.status}`,
      `- Tiêu chí: ${data.conclusion?.criterion ?? data.reason ?? '—'}`,
      '- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.',
      `- HTTP: ${data.httpStatus ?? 'không chạy'}`,
      '- State:',
      '```json',
      JSON.stringify(data.state ?? null, null, 2),
      '```',
      `- Text phản hồi: ${data.responseText ? `> ${data.responseText.replace(/\r?\n/g, '\n>')}` : 'không có (không gọi route)'}`,
      '- Delta validation:',
      '```json',
      JSON.stringify(data.deltaValidation ?? null, null, 2),
      '```',
      '',
    ].join('\n')
  }).join('\n')
  const traces = records
    .filter(record => (record as Record<string, any>).conclusion?.status === 'không tái hiện trên [MOCK]')
    .map(record => `- **${(record as Record<string, any>).id}**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.`)
    .join('\n')

  return [
    '# BUG-01..29 — tái hiện qua route [MOCK]',
    '',
    '- Lưu ý: mock tự sinh delta theo heuristic, vì vậy “không tái hiện” không chứng minh model thật đã đúng.',
    `- Generated: ${generatedAt}`,
    '- Method: read each BUG reproduction cell from `docs/build/anti-bug-report.md`; for multi-example cells use the first quoted utterance exactly, otherwise send the source cell literally.',
    '- Route: `POST /api/ait/sessions` then `POST /api/ait/sessions/[id]/messages`; each case uses a fresh in-memory demo repository and a stubbed Cloudflare client. No real model, environment file, or Supabase was used.',
    '- Mock boundary: `deltaFor` builds a heuristic delta from the input; this exercises route/state/validator behavior but does not test real-model extraction. An earlier BUG-21 special case hardcoded `budget_per_person=20000` from a km input; it has been removed because it made the replay manufacture the bug rather than observe extraction. A separate route test checks validator rejection of that malformed delta.',
    '- Dataset mode is selected by the route from the standalone `test` marker in the original input; BUG-20 injects a NaN distance through a mocked haversine result.',
    '- Supplemental [MOCK]: `filterCandidateByRadius` excludes candidate distances `NaN` and negative; the route test injects `NaN` from haversine and confirms no `NaN` appears in text. Separate route tests cover unrecognized explicit origin, BUG-10 budget rejection, and BUG-22 comma formatting.',
    '- “Không tái hiện trên [MOCK]” means only that the checked symptom was not observed on this scripted input; it is not evidence about real-model behavior.',
    '',
    details,
    '',
    '## Truy nguyên commit cho các lượt không tái hiện',
    '',
    '- Chỉ được ghi “đã sửa bởi commit X” nếu có test đỏ trước và xanh sau commit. Chưa có bằng chứng cặp test này cho các mã bên dưới, nên tất cả đều không quy được.',
    traces,
  ].join('\n')
}

describe('AIT anti-bug replay report generator', () => {
  afterEach(() => vi.restoreAllMocks())

  it.skipIf(!RUN_REPROS)('reads BUG-01..29 and records one route result per reproducible row', async () => {
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'mock-account')
    vi.stubEnv('CLOUDFLARE_API_TOKEN', 'mock-token')
    vi.spyOn(Date, 'now').mockImplementation(() => {
      clock += 60_001
      return clock
    })
    vi.spyOn(QuotaManager, 'checkCooldown').mockResolvedValue({
      inCooldown: false,
      provider: 'cloudflare_workers_ai',
      model: 'ait-bug-table-mock',
    })
    vi.spyOn(llmRouter, 'classifyIntent').mockImplementation(async () => {
      if (activeBugId === 'BUG-29') return null
      return {
        intent: 'catalog_query',
        confidence: 1,
        source: 'llm',
      }
    })
    vi.spyOn(CloudflareAiClient.prototype, 'runChat').mockImplementation(async messages => {
      const text = [...messages].reverse().find(message => message.role === 'user')?.content ?? ''
      const delta = deltaFor(text)
      return {
        success: true,
        text: JSON.stringify({
          intent: 'tour_matching',
          conversational_reply: 'Đã kiểm tra dữ liệu hiện có.',
          conversation_delta: delta,
          follow_up_questions: [],
          missing_primary: [],
        }),
        isQuotaExhausted: false,
        isNetworkError: false,
        modelUsed: 'ait-bug-table-mock',
      }
    })

    const reportPath = resolve(process.cwd(), 'docs/build/anti-bug-report.md')
    const outputPath = resolve(process.cwd(), 'docs/build/bug-repro-table.md')
    const generatedAt = new Date().toISOString()
    const rows = parseBugRows(readFileSync(reportPath, 'utf8'))
    expect(rows.map(row => row.id)).toEqual(Array.from({ length: 29 }, (_, index) =>
      `BUG-${String(index + 1).padStart(2, '0')}`
    ))
    const persona6Input =
      'làng mây tre đan hoặc thêu tay, không quá 30km, 15-20 người, ngân sách tổng không quá 5 triệu'
    const bug29 = rows.find(row => row.id === 'BUG-29')
    if (bug29) {
      bug29.sourceText = `Persona 6 transcript: "${persona6Input}"`
      bug29.routeInput = persona6Input
    }

    const records: Array<Awaited<ReturnType<typeof execute>> | Record<string, unknown>> = []
    for (const row of rows) {
      if (row.id === 'BUG-01' || row.id === 'BUG-02') {
        records.push({
          ...row,
          status: 'không tái hiện trên [MOCK] ở mức hàm; không chạy qua route',
          reason: 'tests/ait/ait-geo-distance.test.ts gọi filterCandidateByRadius trực tiếp với distance NaN và distance âm; BUG-02 cũng có test route riêng cho radius âm.',
        })
        continue
      }
      activeBugId = row.id
      records.push(await execute(row))
    }

    writeFileSync(outputPath, renderReport(records, generatedAt), 'utf8')
    console.info('[MOCK-AIT-BUG-REPRO]', JSON.stringify(records.map(record => ({
      id: record.id,
      routeInput: record.routeInput,
      status: (record as any).conclusion?.status ?? (record as any).status,
    }))))
    expect(records).toHaveLength(29)
  })
})
