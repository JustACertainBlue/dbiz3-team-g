// Pure helpers for screen AIT121: turn API responses into what the conversation shows.
// No fabricated results on failure (FR-003, BR-017, #27); Quote/Chat open COM048 on success (#31).
import type { ResultView } from '@/lib/explore/v3-search'
import { craftLabel as craftTypeLabel } from '@/lib/explore/vocabulary'
import { craftTypeForPreference } from '@/lib/matching/craft-taxonomy'

export const AI_FAILURE_TEXT = 'AI đang gặp sự cố tạm thời nên chưa xử lý được yêu cầu. Cuộc trò chuyện của bạn đã được lưu.'
export const HANDOFF_FAILURE_TEXT = 'Chưa hoàn tất được yêu cầu. Chưa có gì được tạo.'

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
  card?: ResultView | null // screen 22: card data of screen 02 added by /api/ait/matching
}

const recommendationView = (m: any): RecommendationView => ({
  experience_id: m.experience_id, provider_id: m.provider_id, experience_name: m.experience_name || m.name,
  provider_name: m.provider_name, village_name: m.village_name, rank: m.rank, match_score: m.match_score,
  price_per_person: m.price_per_person, max_participants: m.max_participants, explanation: m.explanation,
  ...(m.card ? { card: m.card as ResultView } : {}),
})

/** FR-008 (#188): the Top 5 and up to 5 additional suggestions, both shown with the same card. */
export function matchResultsView(body: any): { top: RecommendationView[]; additional: RecommendationView[] } {
  return {
    top: (body?.top_matches ?? []).map(recommendationView),
    additional: (body?.additional_suggestions ?? []).slice(0, 5).map(recommendationView),
  }
}

const CRITERION_LABELS: Record<string, string> = { Budget: 'Ngân sách', Dates: 'Ngày', Date: 'Ngày', Distance: 'Khoảng cách', 'Group size': 'Số khách' }
// Relaxation values come from the server in English; shown in Vietnamese here (view layer).
const VALUE_TEXT: Record<string, string> = {
  'Expand radius by 15km to include outer craft villages': 'Mở rộng bán kính thêm 15 km để gồm các làng nghề vùng ven',
  'Consider flexible dates (+/- 2 days)': 'Có thể linh hoạt ngày đi (± 2 ngày)',
}

export function noMatchView(body: any): { prompt: string; lines: string[] } {
  const relaxation = body?.relaxation_suggestions ?? {}
  const lines = (relaxation.relaxation_suggestions ?? []).map((s: { criterion: string; suggested_value: string | number }) =>
    s.criterion === 'Budget' && typeof s.suggested_value === 'number'
      ? `Ngân sách: ${s.suggested_value.toLocaleString('vi-VN')} ₫/khách`
      : `${CRITERION_LABELS[s.criterion] ?? s.criterion}: ${typeof s.suggested_value === 'string' ? VALUE_TEXT[s.suggested_value] ?? s.suggested_value : s.suggested_value}`)
  return { prompt: relaxation.conversation_prompt ?? '', lines }
}

// #156: show the date the assistant understood, so the Agency can correct it with a new message
// (a later message replaces it, FR-009 / BR-008).
const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

function isoParts(date: unknown): { weekday: string; d: string; m: string; y: number } | null {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const [y, m, d] = date.split('-').map(Number)
  return { weekday: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], d: String(d).padStart(2, '0'), m: String(m).padStart(2, '0'), y }
}

export function understoodDateLine(body: any): string | null {
  const parts = isoParts(body?.extraction?.tour_context?.target_date_or_range?.start_date)
  if (!parts) return null
  return `AI hiểu ngày đi là ${parts.weekday} ${parts.d}/${parts.m}/${parts.y}. Nếu chưa đúng, hãy gửi lại ngày kèm năm.`
}

/** Vietnamese craft label as on the card ("Gốm sứ"); an unknown preference is shown as written. */
const craftChip = (preference: string) => { const type = craftTypeForPreference(preference.toLowerCase()); return type ? craftTypeLabel(type) : preference }

/** Mockup 22 "AI đã hiểu": chips from the criteria the AI extracted (only what is present). */
export function understoodChips(body: any): string[] {
  const ctx = body?.extraction?.tour_context
  if (!ctx) return []
  const date = isoParts(ctx.target_date_or_range?.start_date)
  const budget = ctx.budget?.max_per_person
  return [
    typeof ctx.group_size === 'number' ? `${ctx.group_size} khách` : '',
    typeof ctx.visitor_profile === 'string' ? ctx.visitor_profile : '',
    date ? `${date.weekday} ${date.d}/${date.m}` : '',
    typeof budget === 'number' ? `≤ ${budget.toLocaleString('vi-VN')} ₫/khách` : '',
    typeof ctx.craft_preference === 'string' ? craftChip(ctx.craft_preference) : '',
  ].filter(Boolean)
}
