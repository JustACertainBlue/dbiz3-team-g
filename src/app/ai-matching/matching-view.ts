// Pure helpers for screen AIT121: turn API responses into what the conversation shows.
// No fabricated results on failure (FR-003, BR-017, #27); Quote/Chat open COM048 on success (#31).

export const AI_FAILURE_TEXT = "Temporary AI Failure — we couldn't process your request right now. Your conversation is saved."
export const HANDOFF_FAILURE_TEXT = 'Could not complete the request. Nothing was created.'

export type ApiResult = { networkError: true } | { ok: boolean; status: number; body: any }

export type MessageOutcome =
  | { kind: 'clarify'; questions: string[] }
  | { kind: 'match'; profile: unknown }
  | { kind: 'failure'; text: string; retry: 'reanalyze' | 'resend' }

export type HandoffOutcome =
  | { kind: 'success'; navigateTo: string }
  | { kind: 'failure'; text: string; retry: true }

const AI_FAILURE: MessageOutcome = { kind: 'failure', text: AI_FAILURE_TEXT, retry: 'reanalyze' }

export function messageOutcome(result: ApiResult): MessageOutcome {
  // #36: a network error means the message never reached the server, so Retry resends it;
  // any server response means it was stored, so Retry re-analyzes (#33).
  if ('networkError' in result) return { kind: 'failure', text: AI_FAILURE_TEXT, retry: 'resend' }
  if (!result.ok) return AI_FAILURE
  const extraction = result.body?.extraction
  if (!extraction || extraction.processing_status === 'Temporary AI Failure') return AI_FAILURE
  const questions: string[] = extraction.follow_up_questions ?? []
  if (!extraction.is_complete) return questions.length > 0 ? { kind: 'clarify', questions } : AI_FAILURE
  const profile = result.body.tour_preference_profile
  return profile ? { kind: 'match', profile } : AI_FAILURE
}

export function handoffOutcome(result: ApiResult): HandoffOutcome {
  const chatId = 'networkError' in result || !result.ok ? undefined : result.body?.chat_session_id
  if (!chatId) return { kind: 'failure', text: HANDOFF_FAILURE_TEXT, retry: true }
  return { kind: 'success', navigateTo: `/messages?chat_session_id=${encodeURIComponent(chatId)}` }
}

export interface RecommendationView {
  experience_id: string; provider_id: string; experience_name: string; provider_name: string; village_name: string
  rank: number; match_score: number; price_per_person: number; max_participants: number; explanation: string
}

const recommendationView = (m: any): RecommendationView => ({
  experience_id: m.experience_id, provider_id: m.provider_id, experience_name: m.experience_name || m.name,
  provider_name: m.provider_name, village_name: m.village_name, rank: m.rank, match_score: m.match_score,
  price_per_person: m.price_per_person, max_participants: m.max_participants, explanation: m.explanation,
})

/** FR-008 (#188): the Top 5 and up to 5 additional suggestions, both shown with the same card. */
export function matchResultsView(body: any): { top: RecommendationView[]; additional: RecommendationView[] } {
  return {
    top: (body?.top_matches ?? []).map(recommendationView),
    additional: (body?.additional_suggestions ?? []).slice(0, 5).map(recommendationView),
  }
}

export function noMatchView(body: any): { prompt: string; lines: string[] } {
  const relaxation = body?.relaxation_suggestions ?? {}
  const lines = (relaxation.relaxation_suggestions ?? []).map((s: { criterion: string; suggested_value: string | number }) =>
    s.criterion === 'Budget' && typeof s.suggested_value === 'number'
      ? `Budget: ${s.suggested_value.toLocaleString('en-US')} VND per person`
      : `${s.criterion}: ${s.suggested_value}`)
  return { prompt: relaxation.conversation_prompt ?? '', lines }
}

// #156: show the date the assistant understood, so the Agency can correct it with a new message
// (a later message replaces it, FR-009 / BR-008).
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function understoodDateLine(body: any): string | null {
  const date = body?.extraction?.tour_context?.target_date_or_range?.start_date
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const [y, m, d] = date.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `Tour date understood: ${weekday} ${d} ${MONTH_NAMES[m - 1]} ${y}. If this is wrong, send the correct date with the year.`
}
