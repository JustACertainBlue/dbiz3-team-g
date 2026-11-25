import { describe, expect, it } from 'vitest'
import { AI_FAILURE_TEXT, messageOutcome } from '@/app/ai-matching/matching-view'

const UNAVAILABLE = 'Dịch vụ AI đang tạm gián đoạn. Cuộc trò chuyện của bạn đã được lưu, bạn bấm Thử lại sau ít phút.'

describe('screen 22 outcomes for the language-model route', () => {
  it('503 with a user_message shows "Dịch vụ AI đang tạm gián đoạn" with a re-analyze Retry', () => {
    const outcome = messageOutcome({ ok: false, status: 503, body: { error_code: 'AI_SERVICE_UNAVAILABLE', user_message: UNAVAILABLE, retry_available: true } })
    expect(outcome).toEqual({ kind: 'failure', text: UNAVAILABLE, retry: 'reanalyze' })
  })

  it('503 without a user_message keeps the existing wording', () => {
    const outcome = messageOutcome({ ok: false, status: 503, body: { error_code: 'AI_SERVICE_UNAVAILABLE' } })
    expect(outcome).toEqual({ kind: 'failure', text: AI_FAILURE_TEXT, retry: 'reanalyze' })
  })

  it('several crafts → one match target per craft, in order', () => {
    const profiles = [
      { craft: 'pottery', label: 'làm gốm', profile: { p: 1 } },
      { craft: 'silk', label: 'dệt lụa', profile: { p: 2 } },
    ]
    const outcome = messageOutcome({ ok: true, status: 201, body: { extraction: { is_complete: true, follow_up_questions: [] }, tour_preference_profile: { p: 1 }, tour_preference_profiles: profiles } })
    expect(outcome).toEqual({ kind: 'match', profile: { p: 1 }, profiles })
  })

  it('a single profile keeps the existing match outcome shape', () => {
    const outcome = messageOutcome({ ok: true, status: 201, body: { extraction: { is_complete: true, follow_up_questions: [] }, tour_preference_profile: { p: 1 } } })
    expect(outcome).toEqual({ kind: 'match', profile: { p: 1 } })
  })

  it('the model reply is shown with the clarifying questions when the route sends one', () => {
    const outcome = messageOutcome({ ok: true, status: 201, body: { extraction: { is_complete: false, follow_up_questions: ['Bạn muốn đi ngày nào?'], conversational_reply: 'Ngày 10/10/2026 đã qua.' } } })
    expect(outcome).toEqual({ kind: 'clarify', questions: ['Bạn muốn đi ngày nào?'], reply: 'Ngày 10/10/2026 đã qua.' })
  })
})
