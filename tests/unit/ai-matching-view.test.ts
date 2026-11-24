import { describe, expect, it } from 'vitest'
import { AI_FAILURE_TEXT, HANDOFF_FAILURE_TEXT, handoffOutcome, messageOutcome, noMatchView } from '@/app/ai-matching/matching-view'

// Round 3 screen helpers for AIT121: T045 (D2), T047 (D1), T049 (D10).
describe('T047 | messageOutcome never shows fabricated results (FR-003, BR-017, #27, #33)', () => {
  it('uses the #27 wording', () => {
    expect(AI_FAILURE_TEXT).toBe('AI đang gặp sự cố tạm thời nên chưa xử lý được yêu cầu. Cuộc trò chuyện của bạn đã được lưu.')
    expect(HANDOFF_FAILURE_TEXT).toBe('Chưa hoàn tất được yêu cầu. Chưa có gì được tạo.')
  })

  it.each([
    ['503', { ok: false, status: 503, body: { error: 'AI_SERVICE_UNAVAILABLE', message: 'Dịch vụ AI đang tạm gián đoạn. Vui lòng thử lại sau ít phút.', retryable: true } }],
    ['500', { ok: false, status: 500, body: { error: 'x' } }],
    ['incomplete without follow-ups', { ok: true, status: 201, body: { extraction: { is_complete: false, follow_up_questions: [] }, tour_preference_profile: null } }],
  ])('%s → failure with a re-analyze Retry, no cards', (_label, input) => {
    const outcome = messageOutcome(input as never)
    expect(outcome).toEqual({
      kind: 'failure',
      text: _label === '503' ? 'Dịch vụ AI đang tạm gián đoạn. Vui lòng thử lại sau ít phút.' : AI_FAILURE_TEXT,
      retry: 'reanalyze',
    })
  })

  it('#36: network error → failure whose Retry resends the unsent message, no cards', () => {
    expect(messageOutcome({ networkError: true })).toEqual({ kind: 'failure', text: AI_FAILURE_TEXT, retry: 'resend' })
  })

  it('follow-up questions → clarify', () => {
    const outcome = messageOutcome({ ok: true, status: 201, body: { extraction: { is_complete: false, follow_up_questions: ['Where will the group start from?'] }, tour_preference_profile: null } } as never)
    expect(outcome).toEqual({ kind: 'clarify', questions: ['Where will the group start from?'] })
  })

  it('complete with a profile → match', () => {
    const profile = { hard_constraints: { group_size: 10 } }
    const outcome = messageOutcome({ ok: true, status: 201, body: { extraction: { is_complete: true, follow_up_questions: [] }, tour_preference_profile: profile } } as never)
    expect(outcome).toEqual({ kind: 'match', profile })
  })

  it('complete matching response preserves route notices', () => {
    const profile = { hard_constraints: { group_size: 10 } }
    const notice = 'Ngày 20/11/2026 đã qua.\n\nAI ghép từng nghề một. Đang hiển thị: làm gốm.'
    const outcome = messageOutcome({
      ok: true,
      status: 201,
      body: {
        extraction: { is_complete: true, follow_up_questions: [] },
        tour_preference_profile: profile,
        turn: { turn_type: 'no_results', message: notice },
      },
    } as never)
    expect(outcome).toEqual({ kind: 'match', profile, intro: notice })
  })

  it('partial matching with server results → match and preserves its data-rendered summary', () => {
    const profile = { hard_constraints: { group_size: 10 } }
    const summary = 'Mình tìm được 1 trải nghiệm.\n\n1. Dệt lụa: 175.000đ/người\n\nTôi có thể tư vấn cụ thể hơn nếu bạn cho biết ngày đi.'
    const outcome = messageOutcome({
      ok: true,
      status: 201,
      body: {
        extraction: { is_complete: false, follow_up_questions: ['Tôi có thể tư vấn cụ thể hơn nếu bạn cho biết ngày đi.'] },
        tour_preference_profile: profile,
        turn: { turn_type: 'results', message: summary },
      },
    } as never)

    expect(outcome).toEqual({
      kind: 'match',
      profile,
      intro: summary,
    })
  })
})

describe('T047 / T049 | handoffOutcome (FR-011, #27, #31)', () => {
  it.each([
    ['network error', { networkError: true }],
    ['403', { ok: false, status: 403, body: { error: 'denied' } }],
    ['200 without chat_session_id', { ok: true, status: 200, body: {} }],
  ])('%s → failure, no navigation', (_label, input) => {
    expect(handoffOutcome(input as never)).toEqual({ kind: 'failure', text: HANDOFF_FAILURE_TEXT, retry: true })
  })

  it('success → open Messages (COM048) with that Chat selected', () => {
    const outcome = handoffOutcome({ ok: true, status: 200, body: { quote_request_id: 'q1', chat_session_id: 'chat 1/x' } } as never)
    expect(outcome).toEqual({ kind: 'success', navigateTo: '/messages?chat_session_id=chat%201%2Fx' })
  })
})

describe('T045 | noMatchView renders every relaxation suggestion (BR-011, FR-012)', () => {
  it('returns the prompt and one line per suggestion', () => {
    const view = noMatchView({
      top_matches: [],
      relaxation_suggestions: {
        conversation_prompt: 'No Experience fits a budget of 20,000 VND per person.',
        relaxation_suggestions: [
          { criterion: 'Budget', suggested_value: 150000 },
          { criterion: 'Dates', suggested_value: 'Consider flexible dates (+/- 2 days)' },
        ],
      },
    })
    expect(view.prompt).toBe('No Experience fits a budget of 20,000 VND per person.')
    expect(view.lines).toEqual(['Ngân sách đề xuất: 150.000đ/người', 'Ngày: Có thể linh hoạt ngày đi (± 2 ngày)'])
  })
})

import { understoodChips } from '@/app/ai-matching/matching-view'
describe('understoodChips (mockup 22 "AI đã hiểu")', () => {
  const body = { extraction: { tour_context: { group_size: 25, visitor_profile: 'Học sinh lớp 6', craft_preference: 'pottery',
    target_date_or_range: { start_date: '2026-11-25' }, budget: { max_per_person: 200000 } } } }
  it('lists the criteria the AI understood', () => {
    expect(understoodChips(body)).toEqual(['25 khách', 'Học sinh lớp 6', 'Thứ Tư 25/11', '≤ 200.000 ₫/khách', 'Gốm sứ'])
  })
  it('skips what is missing', () => {
    expect(understoodChips({ extraction: { tour_context: { group_size: 10 } } })).toEqual(['10 khách'])
    expect(understoodChips(null)).toEqual([])
  })
})

describe('noMatchView maps the relaxation values shown to the Agency to Vietnamese (view layer)', () => {
  it('Distance and Dates values', () => {
    const view = noMatchView({ relaxation_suggestions: { conversation_prompt: 'x', relaxation_suggestions: [
      { criterion: 'Distance', suggested_value: 'Expand radius by 15km to include outer craft villages' },
      { criterion: 'Dates', suggested_value: 'Consider flexible dates (+/- 2 days)' },
    ] } })
    expect(view.lines).toEqual(['Khoảng cách: Mở rộng bán kính thêm 15 km để gồm các làng nghề vùng ven', 'Ngày: Có thể linh hoạt ngày đi (± 2 ngày)'])
  })
  it('unknown values pass through unchanged', () => {
    expect(noMatchView({ relaxation_suggestions: { relaxation_suggestions: [{ criterion: 'Other', suggested_value: 'abc' }] } }).lines).toEqual(['Other: abc'])
  })
})

it('understoodChips shows the craft as the Vietnamese label, never the raw value', () => {
  expect(understoodChips({ extraction: { tour_context: { craft_preference: 'silk' } } })).toEqual(['Dệt lụa'])
  expect(understoodChips({ extraction: { tour_context: { craft_preference: 'unknown thing' } } })).toEqual(['unknown thing'])
})
