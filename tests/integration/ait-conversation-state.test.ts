import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import * as extractor from '@/lib/ai/extractor'
import * as llmRouter from '@/lib/ait/llm-router'
import { updateMatchingSessionContext } from '@/lib/matching/session-service'
import { normalizeConversationState } from '@/lib/ait/conversation-state'
import { loadExperiences } from '@/lib/db/seed-loader'
import * as sessionsRoute from '@/app/api/ait/sessions/route'
import * as messagesRoute from '@/app/api/ait/sessions/[id]/messages/route'
import * as matchingRoute from '@/app/api/ait/matching/route'

type Handler = (request: never, context?: never) => Promise<Response>
type Json = Record<string, any>

const POST_SESSIONS = (sessionsRoute as unknown as { POST: Handler }).POST
const POST_MESSAGES = (messagesRoute as unknown as { POST: Handler }).POST
const POST_MATCHING = (matchingRoute as unknown as { POST: Handler }).POST
const BAT_TRANG_ID = '20896522-6235-5699-aeaf-f48b8150d895'
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

async function send(sessionId: string, text: string) {
  return call(
    POST_MESSAGES,
    `/api/ait/sessions/${sessionId}/messages`,
    { sender: 'Agency', text },
    { id: sessionId }
  )
}

async function getContext(sessionId: string) {
  const row = await demoRepository().find(
    'matching_sessions',
    item => item.matching_session_id === sessionId
  )
  const raw = row?.conversation_context
  return typeof raw === 'string' ? JSON.parse(raw) : raw ?? {}
}

describe('AIT multi-turn state, pending questions and scope regressions', () => {
  beforeEach(() => {
    demoRepository().reset()
    vi.spyOn(Date, 'now').mockReturnValue(rateWindowStart)
    rateWindowStart += 60001
  })

  afterEach(() => vi.restoreAllMocks())

  it('merges updates through eight turns without losing untouched fields (T1-T4, T21)', async () => {
    const sessionId = await openSession()
    const transcript: string[] = []
    const turns = [
      'Tìm trải nghiệm làm gốm cho 10 khách, ngân sách 300000đ, ngày 20/11/2026, xuất phát từ Hoàn Kiếm',
      'Đổi sang dệt lụa',
      'Đổi ngân sách thành 450000đ',
      'Đổi sang nón lá',
      'Đổi ngày sang 25/11/2026',
      'Xuất phát từ Ba Đình',
      'Đổi sang gốm',
      'Giữ nguyên các tiêu chí còn lại',
      'Tìm trong bán kính 25 km',
    ]

    for (const text of turns) {
      transcript.push(text)
      const response = await send(sessionId, text)
      expect(response.status, `Transcript: ${JSON.stringify(transcript)}`).toBe(201)
    }

    const state = (await getContext(sessionId)).state
    expect(state, `Transcript: ${JSON.stringify(transcript)}`).toMatchObject({
      craft: 'pottery',
      group_size: 10,
      date: '2026-11-25',
      radius_km: 25,
      exclusions: { villages: [], crafts: [] },
    })
    expect(state.budget_per_person).toBeUndefined()
    expect(state.origin).toBeUndefined()
  })

  it('T17: “như lúc nãy, giữ nguyên nhé” keeps the stored profile without another question', async () => {
    const sessionId = await openSession()
    const previousState = normalizeConversationState({
      craft: 'silk',
      group_size: 10,
      budget_per_person: 200000,
      date: '2026-11-20',
      origin: 'Hoàn Kiếm',
      exclusions: { villages: [], crafts: [] },
    })
    await updateMatchingSessionContext(sessionId, { state: previousState })
    vi.spyOn(extractor, 'extractTourContext').mockResolvedValueOnce({
      is_complete: false,
      processing_status: 'Success',
      retry_available: false,
      follow_up_questions: [],
      conversational_reply: 'Mình sẽ giữ nguyên các tiêu chí đã lưu.',
      tour_context: {},
    })
    vi.spyOn(llmRouter, 'classifyIntent').mockResolvedValue({
      intent: 'refine_results',
      confidence: 1,
      source: 'llm',
    })

    const response = await send(sessionId, 'Như lúc nãy, giữ nguyên nhé')

    expect(response.status).toBe(201)
    expect(response.json.extraction.follow_up_questions).toEqual([])
    expect((await getContext(sessionId)).state).toMatchObject(previousState)
  })

  it('T2: updates the craft preference to the latest choice across repeated changes', async () => {
    const sessionId = await openSession()
    const choices = [
      ['Tìm trải nghiệm làm gốm', 'pottery', 'Nặn gốm thủ công'],
      ['Đổi sang dệt lụa', 'silk', 'Dệt lụa truyền thống'],
      ['Đổi sang nón lá', 'conical hat', 'Làm nón lá'],
      ['Đổi sang gốm', 'pottery', 'Nặn gốm thủ công'],
    ]
    const extraction = vi.spyOn(extractor, 'extractTourContext')

    for (const [text, expectedCraft, expectedExperience] of choices) {
      extraction.mockResolvedValueOnce({
        is_complete: true,
        processing_status: 'Success',
        retry_available: false,
        follow_up_questions: [],
        conversational_reply: 'Mình đã ghi nhận nghề bạn chọn.',
        tour_context: {
          craft_preference: expectedCraft,
          group_size: 10,
          target_date_or_range: { start_date: '2028-07-12' },
          origin_or_route: { origin_address: 'Hoàn Kiếm' },
        },
      })
      const response = await send(sessionId, text)
      const cards = [
        ...(response.json.turn.top_matches ?? []),
        ...(response.json.turn.additional_suggestions ?? []),
      ]

      expect(response.status).toBe(201)
      expect(response.json.extraction.tour_context.craft_preference).toBe(expectedCraft)
      expect((await getContext(sessionId)).state.craft).toBe(expectedCraft)
      expect(response.json.turn.turn_type).toBe('results')
      expect(cards.map((card: Json) => card.experience_name)).toEqual([expectedExperience])
    }
  })

  it('clears a 200,000 VND budget when a later turn does not repeat it (P1)', async () => {
    const sessionId = await openSession()
    const extraction = vi.spyOn(extractor, 'extractTourContext')
    extraction
      .mockResolvedValueOnce({
        is_complete: false,
        processing_status: 'Success',
        retry_available: false,
        follow_up_questions: [],
        conversational_reply: 'Mình đã ghi nhận ngân sách.',
        tour_context: {
          craft_preference: 'silk',
          budget: { max_per_person: 200000, currency: 'VND' },
        },
      })
      .mockResolvedValueOnce({
        is_complete: false,
        processing_status: 'Success',
        retry_available: false,
        follow_up_questions: [],
        conversational_reply: 'Mình đã ghi nhận ngày đi.',
        tour_context: {},
      })

    await send(sessionId, 'Tìm trải nghiệm dệt lụa, ngân sách 200000 VND')
    const later = await send(sessionId, 'Ngày 20/11/2026')

    expect(extraction).toHaveBeenNthCalledWith(2, expect.objectContaining({
      messages: expect.arrayContaining([expect.objectContaining({ text: 'Ngày 20/11/2026' })]),
    }))
    expect((await getContext(sessionId)).state.budget_per_person).toBeUndefined()
    expect(later.json.extraction.tour_context.budget?.max_per_person).toBeUndefined()
  })

  it.each(['ăn trưa', 'nhà hàng', 'chỗ ăn', 'khách sạn', 'xe', 'thời tiết'])(
    'replaces unsupported AI follow-up questions about "%s" with a supported missing-field question',
    async (unsupportedTopic) => {
      const sessionId = await openSession()
      await send(sessionId, 'Tìm trải nghiệm dệt lụa cho 10 khách, ngày 20/11/2026')
      vi.spyOn(extractor, 'extractTourContext').mockResolvedValueOnce({
        is_complete: false,
        processing_status: 'Success',
        retry_available: false,
        follow_up_questions: [`Quý khách cần ${unsupportedTopic} không?`],
        conversational_reply: `Quý khách cần ${unsupportedTopic} không?`,
        tour_context: { craft_preference: 'silk' },
      })

      const response = await send(sessionId, 'Tìm trải nghiệm dệt lụa')
      const answer = response.json.extraction.conversational_reply
      const pendingQuestion = (await getContext(sessionId)).pending_question

      expect(answer).not.toMatch(/ăn\s*trưa|nhà\s*hàng|chỗ\s*ăn|khách\s*sạn|\bxe\b|thời\s*tiết/i)
      expect(pendingQuestion.field).toBe('origin')
      expect(pendingQuestion.text).toMatch(/xuất phát/i)
      expect(pendingQuestion.text).not.toMatch(/\borigin\b/i)
      expect(answer).toContain(pendingQuestion.text)
      expect(answer).not.toMatch(/\borigin\b/i)
      expect(response.json.extraction.follow_up_questions).toEqual([pendingQuestion.text])
    }
  )

  it('stores the active question and maps short date/group answers to it (T10, T19)', async () => {
    const sessionId = await openSession()
    const transcript: string[] = []

    transcript.push('Tìm workshop dệt lụa')
    const first = await send(sessionId, transcript[0])
    const firstPending = (await getContext(sessionId)).pending_question
    expect(firstPending, `Transcript: ${JSON.stringify(transcript)}`).toMatchObject({
      field: 'group_size',
      text: first.json.extraction.follow_up_questions[0],
    })

    transcript.push('10 người')
    const groupReply = await send(sessionId, transcript[1])
    expect(groupReply.json.extraction.tour_context.group_size, `Transcript: ${JSON.stringify(transcript)}`).toBe(10)

    const datePending = (await getContext(sessionId)).pending_question
    expect(datePending, `Transcript: ${JSON.stringify(transcript)}`).toMatchObject({ field: 'date' })
    transcript.push('ok')
    const shortReply = await send(sessionId, transcript[2])
    expect(shortReply.json.turn.turn_type, `Transcript: ${JSON.stringify(transcript)}`).not.toBe('refusal')
    expect((await getContext(sessionId)).pending_question.field).toBe('date')
    transcript.push('thôi')
    const waiverReply = await send(sessionId, transcript[3])
    expect(waiverReply.json.turn.turn_type, `Transcript: ${JSON.stringify(transcript)}`).not.toBe('refusal')
    expect((await getContext(sessionId)).pending_question.field).toBe('date')
    transcript.push('20/11')
    const dateReply = await send(sessionId, transcript[4])
    expect(dateReply.json.extraction.tour_context.target_date_or_range.start_date, `Transcript: ${JSON.stringify(transcript)}`)
      .toMatch(/^\d{4}-11-20$/)
  })

  it('T14: returns partial matching results, invites for the date, then maps "20/11" to that pending field', async () => {
    const sessionId = await openSession()
    vi.spyOn(extractor, 'extractTourContext')
      .mockResolvedValueOnce({
        is_complete: false,
        processing_status: 'Success',
        retry_available: false,
        follow_up_questions: [],
        conversational_reply: 'Mình đã ghi nhận yêu cầu.',
        intent: 'tour_matching',
        tour_context: {
          craft_preference: 'silk',
          group_size: 10,
          origin_or_route: { origin_address: 'Hoàn Kiếm' },
        },
      })
      .mockResolvedValueOnce({
        is_complete: false,
        processing_status: 'Success',
        retry_available: false,
        follow_up_questions: [],
        conversational_reply: 'Mình đã ghi nhận ngày đi.',
        intent: 'tour_matching',
        tour_context: {},
      })

    const first = await send(sessionId, 'Tìm trải nghiệm dệt lụa cho 10 khách, xuất phát từ Hoàn Kiếm')
    const contextAfterFirst = await getContext(sessionId)
    const reply = await send(sessionId, '20/11')
    const stateAfterReply = (await getContext(sessionId)).state

    expect(first.json.tour_preference_profile).not.toBeNull()
    expect(first.json.turn.turn_type).toBe('results')
    expect(first.json.turn.top_matches.length + first.json.turn.additional_suggestions.length).toBeGreaterThan(0)
    expect(first.json.turn.message).toMatch(/Mình tìm được \d+ trải nghiệm/)
    expect(first.json.turn.message).toMatch(/Tôi có thể.*ngày đi/i)
    expect(first.json.extraction.follow_up_questions).toHaveLength(1)
    expect(contextAfterFirst.pending_question.field).toBe('date')
    expect(reply.json.extraction.tour_context.target_date_or_range.start_date).toMatch(/^\d{4}-11-20$/)
    expect(stateAfterReply.date).toMatch(/^\d{4}-11-20$/)
    expect((await getContext(sessionId)).pending_question.field).toBe('origin')
  })

  it('T14b: clears a skipped optional invitation and does not repeat it later', async () => {
    const sessionId = await openSession()
    vi.spyOn(extractor, 'extractTourContext')
      .mockResolvedValueOnce({
        is_complete: false,
        processing_status: 'Success',
        retry_available: false,
        follow_up_questions: [],
        conversational_reply: 'Mình đã ghi nhận yêu cầu.',
        intent: 'tour_matching',
        tour_context: {
          craft_preference: 'silk',
          group_size: 10,
          origin_or_route: { origin_address: 'Hoàn Kiếm' },
        },
      })
      .mockResolvedValueOnce({
        is_complete: false,
        processing_status: 'Success',
        retry_available: false,
        follow_up_questions: [],
        conversational_reply: 'Mình đã ghi nhận nghề bạn muốn đổi.',
        intent: 'tour_matching',
        tour_context: { craft_preference: 'conical hat' },
      })
      .mockResolvedValueOnce({
        is_complete: false,
        processing_status: 'Success',
        retry_available: false,
        follow_up_questions: [],
        conversational_reply: 'Mình đã ghi nhận yêu cầu.',
        intent: 'tour_matching',
        tour_context: {},
      })

    await send(sessionId, 'Tìm trải nghiệm dệt lụa cho 10 khách, xuất phát từ Hoàn Kiếm')
    const skipped = await send(sessionId, 'Đổi sang nón lá')
    const later = await send(sessionId, 'Xem thêm trải nghiệm')

    expect((await getContext(sessionId)).pending_question.field).toBe('origin')
    expect((await getContext(sessionId)).state.dismissed_questions).toContain('date')
    expect(skipped.json.extraction.follow_up_questions).toEqual([])
    expect(later.json.extraction.follow_up_questions).toHaveLength(1)
    expect(later.json.extraction.follow_up_questions[0]).toMatch(/điểm xuất phát/i)
    expect(later.json.turn.message).not.toMatch(/ngày đi|khởi hành vào ngày/i)
  })

  it('does not route a short reply as a standalone intent while a supported question is pending (T10, T19)', async () => {
    const sessionId = await openSession()
    await send(sessionId, 'Tìm workshop dệt lụa')
    const classifyIntent = vi.spyOn(llmRouter, 'classifyIntent').mockResolvedValue({
      intent: 'out_of_scope',
      confidence: 1,
      source: 'llm',
    })

    const response = await send(sessionId, 'ok')

    expect(classifyIntent).not.toHaveBeenCalled()
    expect(response.json.turn.turn_type).not.toBe('refusal')
  })

  it.each(['mai', 'cuối tuần'])('maps the short date answer "%s" to the pending date field (T19)', async (answer) => {
    const sessionId = await openSession()
    await send(sessionId, 'Tìm trải nghiệm dệt lụa cho 10 khách')

    const response = await send(sessionId, answer)
    const context = await getContext(sessionId)
    expect(context.state.date).toBe(answer)
    expect(context.pending_question.field).not.toBe('date')
    expect(response.json.turn.turn_type).not.toBe('refusal')
  })

  it('keeps state unchanged on repeated meal refusals and treats “có” as accepting the in-scope offer (T5-T8, T24, T26)', async () => {
    const sessionId = await openSession()
    const valid = await send(
      sessionId,
      'Tìm trải nghiệm dệt lụa cho 10 khách, ngày 20/11/2026, xuất phát từ Hoàn Kiếm'
    )
    expect(valid.status).toBe(201)
    expect(valid.json.extraction.conversational_reply).not.toMatch(/ăn trưa|nhà hàng|refreshment|lunch/i)
    const before = JSON.stringify((await getContext(sessionId)).state)
    const transcript = ['Tìm trải nghiệm dệt lụa cho 10 khách, ngày 20/11/2026, xuất phát từ Hoàn Kiếm']
    const refusalMessages: string[] = []

    for (const text of ['Đoàn cần chỗ ăn trưa', 'Đoàn cần chỗ ăn trưa', 'Đoàn cần chỗ ăn trưa', 'Thời tiết thế nào?', 'Tin tức chính trị mới nhất?']) {
      transcript.push(text)
      const refusal = await send(sessionId, text)
      expect(refusal.status, `Transcript: ${JSON.stringify(transcript)}; response: ${JSON.stringify(refusal.json)}`).toBe(200)
      expect(refusal.json.turn.turn_type, `Transcript: ${JSON.stringify(transcript)}`).toBe('refusal')
      expect(refusal.json.turn.message, `Transcript: ${JSON.stringify(transcript)}`).toMatch(/xin lỗi/i)
      expect(refusal.json.turn.message, `Transcript: ${JSON.stringify(transcript)}`).not.toMatch(/bận|thử lại sau|tạm thời/i)
      expect(refusal.json.turn.top_matches, `Transcript: ${JSON.stringify(transcript)}`).toEqual([])
      expect(refusal.json.turn.additional_suggestions, `Transcript: ${JSON.stringify(transcript)}`).toEqual([])
      refusalMessages.push(refusal.json.turn.message)
      expect(JSON.stringify((await getContext(sessionId)).state), `Transcript: ${JSON.stringify(transcript)}`).toBe(before)
    }
    expect(refusalMessages[0]).not.toBe(refusalMessages[1])

    transcript.push('có')
    const accepted = await send(sessionId, 'có')
    expect(accepted.json.turn.turn_type, `Transcript: ${JSON.stringify(transcript)}`).not.toBe('refusal')
    expect(accepted.json.turn.message, `Transcript: ${JSON.stringify(transcript)}`).not.toMatch(/ăn trưa|nhà hàng|chỗ ăn/i)
    expect(accepted.json.village_cards?.length, `Transcript: ${JSON.stringify(transcript)}`).toBeGreaterThan(0)
  })

  it('T26: starts with a meal refusal, then honors “có” with in-scope suggestions', async () => {
    const sessionId = await openSession()
    const refusal = await send(sessionId, 'Ăn trưa')

    expect(refusal.status).toBe(200)
    expect(refusal.json.turn.turn_type).toBe('refusal')
    expect(refusal.json.turn.message).toMatch(/xin lỗi/i)
    expect(refusal.json.turn.message).toMatch(/ngoài phạm vi/i)
    expect(refusal.json.turn.message).toMatch(/làng nghề|trải nghiệm văn hóa/i)

    const classifyIntent = vi.spyOn(llmRouter, 'classifyIntent').mockResolvedValue({
      intent: 'out_of_scope',
      confidence: 1,
      source: 'llm',
    })
    const accepted = await send(sessionId, 'có')
    const suggestions = [
      ...(accepted.json.village_cards ?? []),
      ...(accepted.json.activity_cards ?? []),
      ...(accepted.json.provider_cards ?? []),
    ]
    expect(accepted.status).toBe(201)
    expect(classifyIntent).not.toHaveBeenCalled()
    expect(accepted.json.turn.turn_type).not.toBe('refusal')
    expect(suggestions.length).toBeGreaterThan(0)
    expect(
      `${accepted.json.turn.message} ${accepted.json.conversational_reply ?? ''}`
    ).not.toMatch(/ăn trưa|nhà hàng|chỗ ăn|lunch/i)
  })

  it('processes the in-scope part of a mixed tour and lunch request (T9)', async () => {
    const sessionId = await openSession()
    const transcript = ['Tìm làng lụa 10 khách và gợi ý chỗ ăn trưa']
    const response = await send(sessionId, transcript[0])

    expect(response.json.turn.turn_type, `Transcript: ${JSON.stringify(transcript)}`).not.toBe('refusal')
    expect(response.json.extraction.tour_context.craft_preference, `Transcript: ${JSON.stringify(transcript)}`).toBe('silk')
    expect(response.json.turn.message, `Transcript: ${JSON.stringify(transcript)}`)
      .not.toMatch(/ăn trưa|chỗ ăn|chưa có dữ liệu/i)
    expect(response.json.turn.message, `Transcript: ${JSON.stringify(transcript)}`)
      .not.toContain('Chưa có dữ liệu về chỗ ăn.')
    expect(response.json.turn.message, `Transcript: ${JSON.stringify(transcript)}`)
      .not.toMatch(/ngoài phạm vi/i)
    expect(response.json.turn.message, `Transcript: ${JSON.stringify(transcript)}`).toMatch(/lụa|ghép tour/i)
  })

  it('records craft and village exclusions and excludes them from matching results (T20)', async () => {
    const sessionId = await openSession()
    const transcript = [
      'Tìm trải nghiệm làm gốm cho 10 khách, ngày 20/11/2026, xuất phát từ Hoàn Kiếm',
      'Bỏ Bát Tràng đi, không phải gốm',
    ]
    await send(sessionId, transcript[0])
    const updated = await send(sessionId, transcript[1])
    const state = (await getContext(sessionId)).state

    expect(state, `Transcript: ${JSON.stringify(transcript)}`).toMatchObject({
      exclusions: { villages: [BAT_TRANG_ID], crafts: ['pottery'] },
    })
    expect(state.craft, `Transcript: ${JSON.stringify(transcript)}`).not.toBe('pottery')
    const routeCards = [
      ...(updated.json.turn.top_matches ?? []),
      ...(updated.json.turn.additional_suggestions ?? []),
    ]
    expect(routeCards.map((card: Json) => card.village_name), `Transcript: ${JSON.stringify(transcript)}`)
      .not.toContain('Bát Tràng')
    expect(routeCards.map((card: Json) => card.experience_name), `Transcript: ${JSON.stringify(transcript)}`)
      .not.toContain('Nặn gốm thủ công')

    const matching = await call(POST_MATCHING, '/api/ait/matching', {
      session_id: sessionId,
      tour_preference_profile: updated.json.tour_preference_profile,
    })
    const cards = [
      ...(matching.json.top_matches ?? []),
      ...(matching.json.additional_suggestions ?? []),
    ]
    expect(cards.map((card: Json) => card.village_name), `Transcript: ${JSON.stringify(transcript)}`)
      .not.toContain('Bát Tràng')
    expect(cards.map((card: Json) => card.experience_name), `Transcript: ${JSON.stringify(transcript)}`)
      .not.toContain('Nặn gốm thủ công')
  })

  it('uses the same excluded, highest-price results in chat and matching routes', async () => {
    const sessionId = await openSession()
    await updateMatchingSessionContext(sessionId, {
      state: normalizeConversationState({
        craft: 'silk',
        group_size: 10,
        budget_per_person: 200000,
        date: '2028-07-12',
        origin: 'Hoàn Kiếm',
        exclusions: { villages: [BAT_TRANG_ID], crafts: [] },
      }),
    })
    vi.spyOn(extractor, 'extractTourContext').mockResolvedValueOnce({
      is_complete: true,
      processing_status: 'Success',
      retry_available: false,
      follow_up_questions: [],
      tour_context: {},
    })
    vi.spyOn(llmRouter, 'classifyIntent').mockResolvedValue({
      intent: 'provide_requirements',
      confidence: 1,
      source: 'llm',
    })

    const chat = await send(sessionId, 'Tìm tour có giá cao nhất')
    const profile = chat.json.tour_preference_profile
    const matching = await call(
      POST_MATCHING,
      '/api/ait/matching',
      { session_id: sessionId, tour_preference_profile: profile }
    )
    const chatCards = [
      ...(chat.json.turn.top_matches ?? []),
      ...(chat.json.turn.additional_suggestions ?? []),
    ]
    const matchingCards = [
      ...(matching.json.top_matches ?? []),
      ...(matching.json.additional_suggestions ?? []),
    ]
    const storedResults = await getContext(sessionId)

    expect(chat.status).toBe(201)
    expect(matching.status).toBe(200)
    expect(chatCards.length).toBeGreaterThan(0)
    expect(chatCards.map((card: Json) => card.experience_id).sort())
      .toEqual(matchingCards.map((card: Json) => card.experience_id).sort())
    const comparableCards = (cards: Json[]) => cards
      .map((card) => [card.experience_id, card.price_per_person, card.distance_km])
      .sort((left, right) => String(left[0]).localeCompare(String(right[0])))
    expect(comparableCards(chatCards)).toEqual(comparableCards(matchingCards))
    expect(storedResults.last_matching_results).toEqual(matchingCards.map((card: Json) => ({
      experience_id: card.experience_id,
      experience_name: card.experience_name,
      price_per_person: card.price_per_person,
      rank: card.rank,
    })))
    expect(storedResults.match_reasons.map((item: Json) => item.experience_id).sort())
      .toEqual(matchingCards.map((card: Json) => card.experience_id).sort())
    for (const [route, cards] of [['chat', chatCards], ['matching', matchingCards]] as const) {
      expect(cards.map((card: Json) => card.village_name)).not.toContain('Bát Tràng')
      const prices = cards.map((card: Json) => card.price_per_person).filter((price: number | null) => price !== null)
      expect(prices, `${route} prices`).toEqual([...prices].sort((a: number, b: number) => b - a))
    }
  })

  it('renders result facts from cards and state, rejecting fabricated LLM details', async () => {
    const sessionId = await openSession()
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2028-01-01T00:00:00Z'))
    await updateMatchingSessionContext(sessionId, {
      state: normalizeConversationState({
        exclusions: { villages: [BAT_TRANG_ID], crafts: [] },
      }),
    })
    vi.spyOn(extractor, 'extractTourContext').mockResolvedValueOnce({
      is_complete: true,
      processing_status: 'Success',
      retry_available: false,
      follow_up_questions: [],
      conversational_reply:
        'Dưới đây là một số lựa chọn phù hợp. Nặn gốm thủ công giá 999.000đ cho 200 khách ngày 01/01/2030 cách 999 km. Chúc đoàn có trải nghiệm vui vẻ.',
      tour_context: {
        craft_preference: 'silk',
        group_size: 10,
        budget: { max_per_person: 200000, currency: 'VND' },
        target_date_or_range: { start_date: '2028-07-12' },
        origin_or_route: { origin_address: 'Hoàn Kiếm' },
      },
    })
    vi.spyOn(llmRouter, 'classifyIntent').mockResolvedValue({
      intent: 'provide_requirements',
      confidence: 1,
      source: 'llm',
    })

    const response = await send(sessionId, 'Tìm trải nghiệm cho đoàn, giá cao nhất, ngân sách tối đa 200.000đ/người')
    const cards = [
      ...(response.json.turn.top_matches ?? []),
      ...(response.json.turn.additional_suggestions ?? []),
    ]
    const message = response.json.turn.message as string

    expect(response.status).toBe(201)
    expect(cards.length).toBeGreaterThan(0)
    expect(message.match(/Cách Hoàn Kiếm khoảng \d+\.\d km \(đường chim bay\)/g)).toHaveLength(cards.length)
    for (const card of cards) {
      expect(card.distance_source).toBe('haversine')
      expect(card.distance_km).toEqual(expect.any(Number))
    }
    expect(message).toMatch(new RegExp(`^Mình tìm được ${cards.length} trải nghiệm`))
    expect(message).toContain('Đã loại Bát Tràng và sắp xếp giá từ cao xuống thấp.')
    expect(message).toContain('nghề dệt lụa')
    expect(message).toContain('ngày 12/07/2028')
    expect(message).toContain('ngân sách tối đa 200.000đ/người')
    expect(message).toContain('Chúc đoàn có trải nghiệm vui vẻ.')
    expect(message).not.toContain('Dưới đây')
    const activityLines = message.split('\n').filter((line: string) => /^\d+\.\s/.test(line))
    expect(activityLines).toHaveLength(cards.length)
    expect(activityLines).toEqual(cards.map((card: Json, index: number) =>
      `${index + 1}. ${card.experience_name}: ${String(card.price_per_person).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ/người${card.distance_source === 'haversine' && typeof card.distance_km === 'number' ? ` (Cách Hoàn Kiếm khoảng ${card.distance_km.toFixed(1)} km (đường chim bay))` : ''}`
    ))
    const knownActivityNames = (await loadExperiences()).map((experience) => experience.name)
    expect(knownActivityNames.filter((name) => message.includes(name)).sort())
      .toEqual(cards.map((card: Json) => card.experience_name).sort())
    expect(message).toContain('nhóm 10 khách')
    expect(message).not.toContain('999')
    expect(message).not.toContain('200 khách')
    expect(message).not.toContain('01/01/2030')
    expect(message).not.toContain('Nặn gốm thủ công')
    expect(cards.map((card: Json) => card.village_name)).not.toContain('Bát Tràng')
  })

  it('stores per-result match reasons and explains the real price from the latest results (T13)', async () => {
    const sessionId = await openSession()
    vi.spyOn(extractor, 'extractTourContext').mockResolvedValueOnce({
      is_complete: true,
      processing_status: 'Success',
      retry_available: false,
      follow_up_questions: [],
      conversational_reply: 'Mình đã tìm các trải nghiệm phù hợp.',
      tour_context: {
        craft_preference: 'silk',
        group_size: 10,
        target_date_or_range: { start_date: '2028-07-12' },
        origin_or_route: { origin_address: 'Hoàn Kiếm' },
      },
    })
    vi.spyOn(llmRouter, 'classifyIntent').mockResolvedValue({
      intent: 'provide_requirements',
      confidence: 1,
      source: 'llm',
    })

    const results = await send(
      sessionId,
      'Tìm trải nghiệm dệt lụa nhẹ nhàng, hạng sang cho 10 khách ngày 12/07/2028 từ Hoàn Kiếm'
    )
    const cards = [
      ...(results.json.turn.top_matches ?? []),
      ...(results.json.turn.additional_suggestions ?? []),
    ]
    const context = await getContext(sessionId)

    expect(cards.length).toBeGreaterThan(0)
    expect(context.last_matching_results).toEqual(cards.map((card: Json) => ({
      experience_id: card.experience_id,
      experience_name: card.experience_name,
      price_per_person: card.price_per_person,
      rank: card.rank,
    })))
    const firstReasons = context.match_reasons.find(
      (item: Json) => item.experience_id === cards[0].experience_id
    ).reasons
    expect(firstReasons).toContainEqual(expect.objectContaining({ key: 'craft' }))
    expect(firstReasons).toContainEqual(expect.objectContaining({
      key: 'soft_criterion',
      text: expect.stringMatching(/hạng sang.*chưa có dữ liệu/i),
    }))
    expect(firstReasons).toContainEqual(expect.objectContaining({
      key: 'soft_criterion',
      text: expect.stringMatching(/nhẹ nhàng.*chưa có dữ liệu/i),
    }))

    const explanation = await send(sessionId, 'Tại sao đề xuất này tốt nhất?')
    expect(explanation.json.turn.turn_type).toBe('answer')
    expect(explanation.json.turn.message).toContain(cards[0].experience_name)
    expect(explanation.json.turn.message).toContain(firstReasons[0].text)
    expect(explanation.json.turn.message).toContain(
      `${String(cards[0].price_per_person).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ/người`
    )

    const priceExplanation = await send(
      sessionId,
      `Tại sao giá của ${cards[0].experience_name}?`
    )
    expect(priceExplanation.json.turn.turn_type).toBe('answer')
    expect(priceExplanation.json.turn.message).toContain(cards[0].experience_name)
    expect(priceExplanation.json.turn.message).toContain(
      `${String(cards[0].price_per_person).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ/người`
    )

    const genericPriceExplanation = await send(sessionId, 'Tại sao giá này?')
    expect(genericPriceExplanation.json.turn.turn_type).toBe('answer')
    expect(genericPriceExplanation.json.turn.message).toContain(cards[0].experience_name)
    expect(genericPriceExplanation.json.turn.message).toContain(
      `${String(cards[0].price_per_person).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ/người`
    )

    const unavailable = await send(sessionId, 'Tại sao giá của workshop làm robot?')
    expect(unavailable.json.turn.turn_type).toBe('answer')
    expect(unavailable.json.turn.message).toMatch(/chưa có dữ liệu.*robot/i)
    expect(unavailable.json.turn.message).not.toContain(cards[0].experience_name)
  })

  it('refuses to claim that the AI placed or finalized a tour and gives verified next steps (T12)', async () => {
    const sessionId = await openSession()
    const extraction = vi.spyOn(extractor, 'extractTourContext')
    const classifier = vi.spyOn(llmRouter, 'classifyIntent')

    for (const text of ['Đặt luôn cho tôi', 'Chốt tour này']) {
      const response = await send(sessionId, text)
      const message = response.json.turn.message as string

      expect(response.status).toBe(200)
      expect(response.json.turn.turn_type).toBe('answer')
      expect(response.json.turn.sources).toContainEqual({
        type: 'knowledge_base',
        ref: 'contact_and_booking',
      })
      expect(message).toMatch(/không thể tự đặt, xác nhận hoặc chốt tour/i)
      expect(message.length).toBeLessThanOrEqual(500)
      expect(message).toContain('"Xin báo giá ngay"')
      expect(message).toContain('"Chi tiết"')
      expect(message).toMatch(/TODO: Xác minh đầu mối liên hệ/i)
      expect(message).not.toMatch(/(?:đã\s+(?:đặt|xác nhận|chốt)\s+tour|tour\s+đã\s+(?:đặt|xác nhận|chốt))/i)
    }

    expect(extraction).not.toHaveBeenCalled()
    expect(classifier).not.toHaveBeenCalled()
  })

  it('replaces an LLM-generated affirmative booking claim with verified guidance', async () => {
    const sessionId = await openSession()
    vi.spyOn(extractor, 'extractTourContext').mockResolvedValueOnce({
      is_complete: false,
      processing_status: 'Success',
      retry_available: false,
      follow_up_questions: [],
      conversational_reply: 'Tour đã đặt thành công.',
      tour_context: {},
    })
    vi.spyOn(llmRouter, 'classifyIntent').mockResolvedValue({
      intent: 'provide_requirements',
      confidence: 1,
      source: 'llm',
    })

    const response = await send(sessionId, 'Tôi muốn xem thông tin')

    expect(response.json.turn.message).not.toMatch(/(?:đã\s+(?:đặt|xác nhận|chốt)\s+tour|tour\s+đã\s+(?:đặt|xác nhận|chốt))/i)
    expect(response.json.turn.turn_type).toBe('answer')
    expect(response.json.turn.message).toMatch(/không thể tự đặt, xác nhận hoặc chốt tour/i)
    expect(response.json.turn.message.length).toBeLessThanOrEqual(500)
    expect(response.json.turn.message).toContain('"Xin báo giá ngay"')
  })

  it('clears state only for an explicit reset and answers booking help without losing state (T22, T23)', async () => {
    const sessionId = await openSession()
    await send(sessionId, 'Tìm trải nghiệm dệt lụa cho 10 khách, ngày 20/11/2026, xuất phát từ Hoàn Kiếm')
    const original = (await getContext(sessionId)).state

    await send(sessionId, 'Tôi đang phân vân')
    const afterUnstatedTurn = (await getContext(sessionId)).state
    expect(afterUnstatedTurn).toMatchObject({
      craft: original.craft,
      group_size: original.group_size,
      date: original.date,
    })
    expect(afterUnstatedTurn.origin).toBeUndefined()

    const help = await send(sessionId, 'Đặt lịch thế nào?')
    expect(help.json.extraction?.intent, JSON.stringify(help.json)).toBe('platform_guidance')
    expect(help.json.turn.turn_type).toBe('answer')
    expect(help.json.turn.message).toContain('"Xin báo giá ngay"')
    expect((await getContext(sessionId)).state).toEqual(afterUnstatedTurn)

    await send(sessionId, 'Làm lại từ đầu')
    expect((await getContext(sessionId)).state).toMatchObject({
      exclusions: { villages: [], crafts: [] },
    })
    expect((await getContext(sessionId)).state.craft).toBeUndefined()
    expect((await getContext(sessionId)).state.group_size).toBeUndefined()
  })

  it('does not classify supported workshop phrases as meal-service refusals (T18)', async () => {
    const sessionId = await openSession()
    for (const text of ['workshop này ăn khách không', 'có buổi trưa không', 'ăn ý với nhóm 10 người']) {
      const response = await send(sessionId, text)
      expect(response.json.turn.turn_type, `Input: ${text}; response: ${JSON.stringify(response.json)}`).not.toBe('refusal')
    }
  })

  it('returns no cards for unrelated activity text with no catalog match (L3)', async () => {
    const sessionId = await openSession()
    const response = await send(sessionId, 'Tìm workshop làm robot')

    expect(response.json.activity_cards ?? []).toEqual([])
    expect(response.json.turn?.top_matches ?? []).toEqual([])
    expect(response.json.turn?.additional_suggestions ?? []).toEqual([])
  })

  it('keeps backend failure messages distinct from scope refusals (T25)', async () => {
    const sessionId = await openSession()
    vi.spyOn(extractor, 'extractTourContext').mockResolvedValueOnce({
      is_complete: false,
      processing_status: 'Temporary AI Failure',
      retry_available: true,
      follow_up_questions: [],
      tour_context: {},
    })

    const technical = await send(sessionId, 'Tìm workshop dệt lụa')
    const refusal = await send(sessionId, 'Đoàn cần nhà hàng để ăn trưa')

    expect(technical.status).toBe(503)
    expect(technical.json.error_code).toBe('AI_SERVICE_UNAVAILABLE')
    expect(technical.json.message).not.toMatch(/ngoài phạm vi/i)
    expect(refusal.status).toBe(200)
    expect(refusal.json.turn.turn_type).toBe('refusal')
    expect(refusal.json.turn.message).not.toBe(technical.json.message)
  })
})
