import type { TourContext } from '@/lib/matching/types'
import { resolveCraftPreference } from '@/lib/ai/llm-service'
import { extractTourDate } from '@/lib/ai/tour-date'
import { CATALOG_VILLAGES } from '@/lib/matching/card-resolver'
import { detectCraftPreference } from '@/lib/matching/craft-taxonomy'

export interface AitConversationState {
  craft?: string
  group_size?: number
  budget_per_person?: number
  date?: string
  origin?: string
  exclusions: {
    villages: string[]
    crafts: string[]
  }
  radius_km?: number
}

export type PendingQuestionField =
  | 'craft'
  | 'group_size'
  | 'budget_per_person'
  | 'date'
  | 'origin'
  | 'radius_km'
  | 'in_scope_offer'

export interface PendingQuestion {
  text: string
  field: PendingQuestionField
}

export function normalizePendingQuestion(value: unknown): PendingQuestion | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  const fields: PendingQuestionField[] = [
    'craft',
    'group_size',
    'budget_per_person',
    'date',
    'origin',
    'radius_km',
    'in_scope_offer',
  ]
  if (typeof raw.text !== 'string' || typeof raw.field !== 'string') return null
  if (!fields.includes(raw.field as PendingQuestionField)) return null
  return { text: raw.text, field: raw.field as PendingQuestionField }
}

export function emptyConversationState(): AitConversationState {
  return { exclusions: { villages: [], crafts: [] } }
}

export function normalizeConversationState(value: unknown): AitConversationState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyConversationState()
  const raw = value as Record<string, unknown>
  const exclusions = raw.exclusions && typeof raw.exclusions === 'object'
    ? raw.exclusions as Record<string, unknown>
    : {}
  const state = emptyConversationState()

  if (typeof raw.craft === 'string') state.craft = raw.craft
  if (typeof raw.group_size === 'number' && Number.isInteger(raw.group_size) && raw.group_size > 0) {
    state.group_size = raw.group_size
  }
  if (typeof raw.budget_per_person === 'number' && raw.budget_per_person > 0) {
    state.budget_per_person = raw.budget_per_person
  }
  if (typeof raw.date === 'string') state.date = raw.date
  if (typeof raw.origin === 'string') state.origin = raw.origin
  if (typeof raw.radius_km === 'number' && Number.isFinite(raw.radius_km) && raw.radius_km > 0) {
    state.radius_km = raw.radius_km
  }
  state.exclusions = {
    villages: Array.isArray(exclusions.villages)
      ? exclusions.villages.filter((item): item is string => typeof item === 'string')
      : [],
    crafts: Array.isArray(exclusions.crafts)
      ? exclusions.crafts.filter((item): item is string => typeof item === 'string')
      : [],
  }
  return state
}

export function isExplicitConversationReset(text: string): boolean {
  return /^(?:làm lại từ đầu|reset|start over)[.!?]*$/i.test(text.trim())
}

export function isSystemHelpRequest(text: string): boolean {
  return /(?:cách\s+(?:sử dụng|dùng)\s+hệ thống|hướng dẫn\s+sử dụng|how\s+(?:to use|do i use)\s+the system)/i.test(text)
}

export function isBookingHelpRequest(text: string): boolean {
  return /(?:đặt\s+(?:tour|lịch)\s+(?:thế nào|như thế nào)|cách\s+đặt\s+tour|how\s+(?:do i|to)\s+book|book\s+now|request\s+a\s+quote)/i.test(text)
}

export function isAffirmativeReply(text: string): boolean {
  return /^(?:có|ok|okay|ừ|ừm|được|đúng|đồng ý|yes|sure|yep)[!. ]*$/i.test(text.trim())
}

export function isShortPendingReply(text: string): boolean {
  const value = text.trim()
  return value.length <= 24
    && /^(?:có|ok|okay|ừ|ừm|không|thôi|được|đúng|đồng ý|yes|no|sure|yep|đổi cái khác|mai|ngày mai|cuối tuần(?: này)?|tomorrow|this weekend|weekend|\d{1,2}(?:\/\d{1,2}){0,2}|\d+\s*(?:người|khách|pax|people|guests?))[\s!.?]*$/i.test(value)
}

export function isFalsePositiveMealPhrase(text: string): boolean {
  return /(?:ăn khách|ăn ý|buổi\s+(?:sáng|trưa|tối))/i.test(text)
}

export function splitMixedMealRequest(text: string): { inScopeText: string; hasMealRequest: boolean } {
  const mealClause = /(?:,?\s*(?:và\s*)?(?:gợi ý\s*)?(?:chỗ\s*ăn|địa điểm\s*ăn|nhà hàng|quán ăn|dịch vụ ăn uống|lunch|restaurant|place to eat)\b.*|,?\s*(?:và\s*)?(?:gợi ý\s*)?ăn\s*(?:sáng|trưa|tối)\b.*)$/iu
  const match = text.match(mealClause)
  if (!match) return { inScopeText: text, hasMealRequest: false }

  const inScopeText = text.replace(mealClause, '').trim()
  const hasTourRequest = /(?:làng|xưởng|workshop|trải nghiệm|hoạt động|ghép tour|tìm tour|gốm|lụa|nón|mây tre)/i.test(inScopeText)
  if (!hasTourRequest) return { inScopeText: text, hasMealRequest: false }
  return { inScopeText, hasMealRequest: true }
}

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
}

function excludedVillageIds(text: string): string[] {
  const normalized = normalizeText(text)
  const ids = new Set<string>()
  for (const village of CATALOG_VILLAGES) {
    const name = normalizeText(village.name).replace(/^lang(?: nghe)?\s+/, '')
    const aliases = new Set([name, name.split(/\s+/).slice(-2).join(' ')])
    for (const alias of aliases) {
      if (!alias || !normalized.includes(alias)) continue
      const index = normalized.indexOf(alias)
      const prefix = normalized.slice(Math.max(0, index - 36), index)
      if (/(?:bo|loai tru|khong chon|khong den|exclude)\s+[^.!?]*$/i.test(prefix)) {
        ids.add(village.village_id)
        break
      }
    }
  }
  return [...ids]
}

function excludedCraft(text: string): string | undefined {
  const normalized = normalizeText(text)
  if (!/(?:khong phai|bo|loai tru|khong chon|khong muon|exclude)\s+/i.test(normalized)) {
    return undefined
  }
  return detectCraftPreference(text)
}

function parseBudget(text: string): number | undefined {
  const match = text.match(
    /(?:ngân sách|budget|under|dưới|tầm|khoảng)\s*(?:thành|là|tối đa)?\s*(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(k|000)?(?:\s*(?:vnd|đ|\/người|\/khách|\/pax))?/i
  )
  if (!match) return undefined
  const amount = Number(match[1].replace(/[.,]/g, ''))
  if (!Number.isFinite(amount) || amount <= 0) return undefined
  return match[2]?.toLowerCase() === 'k' && amount < 1000 ? amount * 1000 : amount
}

export function mergeConversationState(
  current: AitConversationState,
  text: string,
  extracted: TourContext,
  now: Date,
  pendingField?: PendingQuestionField
): AitConversationState {
  const next = normalizeConversationState(current)
  const craftExclusion = excludedCraft(text)
  const newVillageExclusions = excludedVillageIds(text)

  if (craftExclusion) {
    next.exclusions.crafts = [...new Set([...next.exclusions.crafts, craftExclusion])]
    if (next.craft === craftExclusion) delete next.craft
  } else {
    const craft = resolveCraftPreference(extracted.craft_preference, [{ text }])
    if (craft) next.craft = craft
  }

  next.exclusions.villages = [...new Set([...next.exclusions.villages, ...newVillageExclusions])]
  if (extracted.group_size !== undefined) next.group_size = extracted.group_size
  const budget = parseBudget(text) ?? extracted.budget?.max_per_person
  if (budget !== undefined) next.budget_per_person = budget

  const date = extracted.target_date_or_range?.start_date ?? extractTourDate(text, now)
  if (date) next.date = date
  else if (pendingField === 'date' && /^(?:mai|ngày mai|cuối tuần|cuối tuần này|tomorrow|this weekend|weekend)[.!? ]*$/i.test(text.trim())) {
    next.date = text.trim()
  }
  if (extracted.origin_or_route?.origin_address) {
    next.origin = extracted.origin_or_route.origin_address
  }

  const radius = text.match(/(?:radius|bán kính|trong phạm vi)?\s*(\d+(?:[.,]\d+)?)\s*(?:km|kilometers?)\b/i)
  if (radius) next.radius_km = Number(radius[1].replace(',', '.'))

  return next
}

export function applyConversationState(context: TourContext, state: AitConversationState): TourContext {
  const next: TourContext = { ...context }
  if (state.craft) next.craft_preference = state.craft
  if (state.group_size !== undefined) next.group_size = state.group_size
  if (state.budget_per_person !== undefined) {
    next.budget = { max_per_person: state.budget_per_person, currency: 'VND' }
  }
  if (state.date && /^\d{4}-\d{2}-\d{2}$/.test(state.date)) {
    next.target_date_or_range = { start_date: state.date }
  }
  if (state.origin) next.origin_or_route = { origin_address: state.origin }
  return next
}

export function missingQuestions(state: AitConversationState): PendingQuestion[] {
  const questions: PendingQuestion[] = []
  if (state.group_size === undefined) {
    questions.push({ field: 'group_size', text: 'Quý khách vui lòng cho biết số lượng khách dự kiến tham gia đoàn?' })
  }
  if (state.date === undefined) {
    questions.push({ field: 'date', text: 'Đoàn dự kiến khởi hành vào ngày nào (ví dụ: 25/11 hoặc Thứ Năm tuần tới)?' })
  }
  if (state.origin === undefined) {
    questions.push({ field: 'origin', text: 'Đoàn sẽ xuất phát từ khu vực nào tại Hà Nội (origin, ví dụ: từ Hoàn Kiếm)?' })
  }
  if (state.craft === undefined && state.exclusions.crafts.length === 0) {
    questions.push({ field: 'craft', text: 'Đoàn quan tâm đến loại trải nghiệm làng nghề nào?' })
  }
  return questions
}

export function sanitizeUnsupportedFollowUpQuestions(reply: string): string {
  const unsupportedTopic = /(?:ăn\s*(?:sáng|trưa|tối)|nhà\s*hàng|chỗ\s*ăn|quán\s*ăn|khách\s*sạn|\bxe\b|thời\s*tiết|lunch|restaurant|place\s+to\s+eat|hotel|weather|transportation)/i
  const questionLead = /^(?:bạn|quý khách|anh\/chị|do you|would you|could you|what|which|how)\b/i
  const sentences = reply.match(/[^.!?？]+[.!?？]*|[.!?？]+/gu) ?? [reply]
  const hasUnsupportedQuestion = sentences.some(sentence =>
    unsupportedTopic.test(sentence)
      && (/[?？]/.test(sentence) || questionLead.test(sentence.trim()))
  )

  if (!hasUnsupportedQuestion) return reply

  const safeSentences = sentences.filter(sentence =>
    !(unsupportedTopic.test(sentence)
      && (/[?？]/.test(sentence) || questionLead.test(sentence.trim())))
  )
  return safeSentences.join(' ').trim()
}

export function nextPendingQuestion(state: AitConversationState): PendingQuestion | null {
  return missingQuestions(state)[0] ?? null
}

export function isCompleteConversationState(state: AitConversationState): boolean {
  return state.group_size !== undefined
    && state.date !== undefined
    && state.origin !== undefined
    && (state.craft !== undefined || state.exclusions.crafts.length > 0)
}
