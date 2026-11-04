import { describe, expect, it } from 'vitest'
import { AI_FAILURE_TEXT, HANDOFF_FAILURE_TEXT, handoffOutcome, messageOutcome, noMatchView } from '@/app/ai-matching/matching-view'

// Round 3 screen helpers for AIT121: T045 (D2), T047 (D1), T049 (D10).
describe('T047 | messageOutcome never shows fabricated results (FR-003, BR-017, #27, #33)', () => {
  it('uses the #27 wording', () => {
    expect(AI_FAILURE_TEXT).toBe("Temporary AI Failure — we couldn't process your request right now. Your conversation is saved.")
    expect(HANDOFF_FAILURE_TEXT).toBe('Could not complete the request. Nothing was created.')
  })

  it.each([
    ['503', { ok: false, status: 503, body: { error_code: 'AI_SERVICE_UNAVAILABLE', retry_available: true } }],
    ['500', { ok: false, status: 500, body: { error: 'x' } }],
    ['incomplete without follow-ups', { ok: true, status: 201, body: { extraction: { is_complete: false, follow_up_questions: [] }, tour_preference_profile: null } }],
  ])('%s → failure with a re-analyze Retry, no cards', (_label, input) => {
    const outcome = messageOutcome(input as never)
    expect(outcome).toEqual({ kind: 'failure', text: AI_FAILURE_TEXT, retry: 'reanalyze' })
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
    expect(view.lines).toEqual(['Budget: 150,000 VND per person', 'Dates: Consider flexible dates (+/- 2 days)'])
  })
})
