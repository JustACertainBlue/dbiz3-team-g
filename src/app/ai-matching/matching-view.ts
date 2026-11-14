// Pure helpers for screen AIT121: turn API responses into what the conversation shows.
// No fabricated results on failure (FR-003, BR-017, #27); Quote/Chat open COM048 on success (#31).

export const AI_FAILURE_TEXT = "Temporary AI Failure — we couldn't process your request right now. Your conversation is saved."
export const HANDOFF_FAILURE_TEXT = 'Could not complete the request. Nothing was created.'

export type ApiResult = { networkError: true } | { ok: boolean; status: number; body: any }

export type MessageOutcome =
  | { kind: 'guidance'; reply: string }
  | { kind: 'clarify'; questions: string[] }
  | { kind: 'match'; profile: unknown; followUps?: string[] }
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
  // Platform knowledge or general guidance questions — check extraction.intent (not top-level body.intent)
  const intent = extraction?.intent ?? result.body?.intent
  if (intent === 'platform_guidance' && typeof extraction?.conversational_reply === 'string' && extraction.conversational_reply) {
    return { kind: 'guidance', reply: extraction.conversational_reply }
  }
  if (!extraction || extraction.processing_status === 'Temporary AI Failure') return AI_FAILURE
  const questions: string[] = extraction.follow_up_questions ?? []
  if (!extraction.is_complete) {
    if (questions.length > 0) return { kind: 'clarify', questions }
    if (typeof extraction.conversational_reply === 'string' && extraction.conversational_reply.trim()) {
      return { kind: 'guidance', reply: extraction.conversational_reply.trim() }
    }
    return AI_FAILURE
  }
  const profile = result.body.tour_preference_profile
  return profile ? { kind: 'match', profile, followUps: questions.length > 0 ? questions : undefined } : AI_FAILURE
}

export function handoffOutcome(result: ApiResult): HandoffOutcome {
  const chatId = 'networkError' in result || !result.ok ? undefined : result.body?.chat_session_id
  if (!chatId) return { kind: 'failure', text: HANDOFF_FAILURE_TEXT, retry: true }
  return { kind: 'success', navigateTo: `/messages?chat_session_id=${encodeURIComponent(chatId)}` }
}

export interface RecommendationView {
  experience_id: string; provider_id: string; experience_name: string; provider_name: string; village_name: string
  rank: number; match_score: number; price_per_person: number; max_participants: number; explanation: string; image_url?: string
}

const recommendationView = (m: any): RecommendationView => ({
  experience_id: m.experience_id, provider_id: m.provider_id, experience_name: m.experience_name || m.name,
  provider_name: m.provider_name, village_name: m.village_name, rank: m.rank, match_score: m.match_score,
  price_per_person: m.price_per_person, max_participants: m.max_participants, explanation: m.explanation,
  ...(typeof m.image_url === 'string' ? { image_url: m.image_url } : {}),
})

/** FR-008 (#188): top 5 và tối đa 5 gợi ý thêm, hiển thị cùng kiểu thẻ. */
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

/** Nhóm nghề tiếng Việt cho từng nhãn nghề mà bộ máy ghép tour phát ra */
const CRAFT_FAMILY_VI: Record<string, string> = {
  'silk weaving': 'dệt – may (lụa, thêu)',
  embroidery: 'dệt – may (lụa, thêu)',
  pottery: 'gốm sứ',
  woodcarving: 'mộc – chạm khắc',
  'bamboo and rattan weaving': 'mây tre đan',
  'conical hat making': 'nón lá',
  'food and cooking': 'ẩm thực',
  metalwork: 'kim khí – đúc đồng',
  'lacquer and painting': 'sơn mài',
}

/** Dịch một nhãn nghề (kể cả nhãn tiếng Việt lạ) sang nhóm nghề tiếng Việt dễ hiểu */
function craftFamilyVi(label: string): string {
  return CRAFT_FAMILY_VI[label.trim().toLowerCase()] ?? 'thủ công truyền thống'
}

/**
 * Diễn đạt lý do phù hợp trên thẻ đề xuất bằng tiếng Việt tự nhiên, thân thiện.
 * Nhãn nghề khớp mọi nhãn (kể cả tiếng Việt) vì bộ máy chấm điểm có thể trả về nhãn bất kỳ; lý do
 * "không trực tiếp đúng nghề" được diễn đạt như một gợi ý mở rộng thay vì để lộ tiếng Anh.
 */
export function localizeExplanation(explanation: string): string {
  if (!explanation) return 'Đề xuất xưởng nghề phù hợp với tiêu chí và quy mô đoàn của bạn.'

  let text = explanation

  // 1. Điểm phù hợp
  text = text.replace(/Match score ([\d.]+)\/100\./i, (_, score) => `Độ phù hợp đạt ${score}/100 điểm.`)

  // 2. Ngành nghề thủ công — nhãn có thể là tiếng Anh hoặc tiếng Việt nên phải khớp mọi nhãn
  text = text.replace(/Matches your (.+?) preference \(([^)]+)\)\./i, (_, label) =>
    `Đúng nhóm nghề ${craftFamilyVi(label)} mà đoàn đang quan tâm.`)
  text = text.replace(/Does not match your (.+?) preference\./i, (_, label) =>
    `Chưa trực tiếp thuộc nhóm nghề ${craftFamilyVi(label)} đoàn yêu cầu, nhưng là trải nghiệm thủ công tương đồng, có thể cân nhắc khi xưởng đúng nghề chưa đáp ứng đủ quy mô đoàn.`)

  // 3. Loại hình trải nghiệm
  text = text.replace(/A Workshop\/Hands-on experience, as requested\./i, 'Xưởng có hoạt động thực hành tay nghề (workshop) trực tiếp cùng nghệ nhân bậc thầy đúng theo yêu cầu.')
  text = text.replace(/A Cultural Show experience, as requested\./i, 'Có suất diễn nghệ thuật văn hóa truyền thống đặc sắc theo yêu cầu.')
  text = text.replace(/A Sightseeing experience, as requested\./i, 'Tuyến tham quan không gian xưởng và di sản làng nghề thuận tiện.')
  text = text.replace(/A Culinary\/Tasting experience, as requested\./i, 'Trải nghiệm thưởng thức hương vị ẩm thực làng nghề truyền thống.')
  text = text.replace(/Not a ([a-zA-Z\s\/]+) experience\./i, 'Trải nghiệm văn hóa làng nghề truyền thống.')

  // 4. Quy mô đoàn & sức chứa
  text = text.replace(/Takes up to (\d+) pax for your group of (\d+)\./i, (_, max, group) => `Sức chứa xưởng tối đa ${max} khách, vừa vặn và đảm bảo chất lượng hướng dẫn cho đoàn ${group} người.`)

  // 5. Ngân sách & chi phí
  text = text.replace(/([\d,.]+) VND per person, within your ([\d,.]+) VND budget\./i, (_, price, budget) => `Mức giá ${price} đ/khách, nằm trọn trong hạn mức ngân sách (${budget} đ) của đoàn.`)

  // 6. Khoảng cách di chuyển
  text = text.replace(/About ([\d.]+) km from (.+?) \(estimated\)\./i, (_, dist, origin) => {
    const originLabel = origin === 'your starting point' ? 'điểm xuất phát của đoàn' : origin
    return `Cách ${originLabel} khoảng ${dist} km, tuyến đường thuận tiện di chuyển trong ngày.`
  })

  return text
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
