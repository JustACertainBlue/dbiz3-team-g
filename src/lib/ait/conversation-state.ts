import type { TourContext } from '@/lib/matching/types'
import { isOriginGroundedInUserText, resolveCraftPreference } from '@/lib/ai/llm-service'
import { extractTourDate } from '@/lib/ai/tour-date'
import { CATALOG_VILLAGES } from '@/lib/matching/card-resolver'
import { detectCraftPreference } from '@/lib/matching/craft-taxonomy'
import { parseExplicitBudgetAmount } from './budget'

export interface AitConversationState {
  craft?: string
  group_size?: number
  budget_per_person?: number
  budget_basis?: 'per_person' | 'group_total'
  date_or_duration?: string
  interests?: string[]
  relaxed_fields: string[]
  date?: string
  origin?: string
  dismissed_questions: PendingQuestionField[]
  exclusions: {
    villages: string[]
    crafts: string[]
  }
  ranking_preferences?: {
    nearest?: boolean
    cheapest?: boolean
  }
  radius_km?: number
  turn_count: number
  slots: Partial<Record<ConversationSlotName, ConversationSlot>>
  turn_history: Array<{ turn: number; slots: Partial<Record<ConversationSlotName, ConversationSlot>> }>
}

export type ConversationSlotName =
  | 'craft'
  | 'group_size'
  | 'budget_per_person'
  | 'budget_basis'
  | 'date'
  | 'duration'
  | 'interests'
  | 'origin'
  | 'radius'
  | 'nearest'
  | 'cheapest'

export interface ConversationSlot {
  value: string | number | boolean | string[]
  raw_span: string
  created_turn: number
  source_turn: number
  source: 'explicit' | 'inferred'
}

const UNSUPPORTED_DISTANCE_EXPRESSION = String.raw`(^|[^\p{L}\d])(?:(?:xa\s+hơn|xa\s+hon|trên|tren|hơn|hon|ít\s+nhất|it\s+nhat|tối\s+thiểu|toi\s+thieu|ngoài|ngoai)\s*\d+(?:[.,]\d+)?|(?:từ|tu)\s*\d+(?:[.,]\d+)?\s*(?:đến|den|to)\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*[-–—]\s*\d+(?:[.,]\d+)?)\s*(?:km|kilometers?|cây\s*số)(?![\p{L}])`
const ZERO_RADIUS_EXPRESSION = String.raw`(^|[^\p{L}\d])(?:(?:dưới|duoi|không\s+quá|khong\s+qua|tối\s+đa|toi\s+da|bán\s*kính|ban\s*kinh|cách|cach)\s*)?0\s*(?:km|kilometers?|cây\s*số)(?![\p{L}])`

export function hasUnsupportedDistanceConstraint(text: string): boolean {
  return new RegExp(UNSUPPORTED_DISTANCE_EXPRESSION, 'iu').test(text)
}

export function stripUnsupportedDistanceConstraint(text: string): string {
  return text.replace(new RegExp(UNSUPPORTED_DISTANCE_EXPRESSION, 'giu'), '$1')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function hasZeroRadiusConstraint(text: string): boolean {
  return new RegExp(ZERO_RADIUS_EXPRESSION, 'iu').test(text)
}

export function hasInvalidRadiusConstraint(text: string): boolean {
  return /(?:^|[^\w])[-+]\s*\d+(?:[.,]\d+)?\s*(?:km|kilometers?|cây\s*số)\b|(?:^|[^\p{L}\d])(?:mười|1e\d+)\s*(?:km|kilometers?|cây\s*số)\b|10\s*ki[- ]?lô[- ]?mét\b/iu.test(text)
}

export function stripZeroRadiusConstraint(text: string): string {
  return text.replace(new RegExp(ZERO_RADIUS_EXPRESSION, 'giu'), '$1')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
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
  return {
    dismissed_questions: [],
    exclusions: { villages: [], crafts: [] },
    turn_count: 0,
    relaxed_fields: [],
    slots: {},
    turn_history: [],
  }
}

export function conversationStateBytes(state: AitConversationState): number {
  return new TextEncoder().encode(JSON.stringify(state)).byteLength
}

export function normalizeConversationState(value: unknown): AitConversationState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyConversationState()
  const raw = value as Record<string, unknown>
  const exclusions = raw.exclusions && typeof raw.exclusions === 'object'
    ? raw.exclusions as Record<string, unknown>
    : {}
  const state = emptyConversationState()
  const pendingFields: PendingQuestionField[] = [
    'craft',
    'group_size',
    'budget_per_person',
    'date',
    'origin',
    'radius_km',
    'in_scope_offer',
  ]

  if (typeof raw.craft === 'string') state.craft = raw.craft
  if (typeof raw.group_size === 'number' && Number.isInteger(raw.group_size) && raw.group_size > 0) {
    state.group_size = raw.group_size
  }
  if (typeof raw.budget_per_person === 'number' && raw.budget_per_person > 0) {
    state.budget_per_person = raw.budget_per_person
  }
  if (raw.budget_basis === 'per_person' || raw.budget_basis === 'group_total') {
    state.budget_basis = raw.budget_basis
  }
  if (typeof raw.date === 'string') state.date = raw.date
  if (typeof raw.origin === 'string') state.origin = raw.origin
  if (typeof raw.radius_km === 'number' && Number.isFinite(raw.radius_km) && raw.radius_km > 0) {
    state.radius_km = raw.radius_km
  }
  state.dismissed_questions = Array.isArray(raw.dismissed_questions)
    ? [...new Set(raw.dismissed_questions.filter(
      (field): field is PendingQuestionField => typeof field === 'string' && pendingFields.includes(field as PendingQuestionField)
    ))]
    : []
  state.exclusions = {
    villages: Array.isArray(exclusions.villages)
      ? exclusions.villages.filter((item): item is string => typeof item === 'string')
      : [],
    crafts: Array.isArray(exclusions.crafts)
      ? exclusions.crafts.filter((item): item is string => typeof item === 'string')
      : [],
  }
  const rawRankingPreferences = raw.ranking_preferences && typeof raw.ranking_preferences === 'object'
    ? raw.ranking_preferences as Record<string, unknown>
    : {}
  state.turn_count = typeof raw.turn_count === 'number' && Number.isInteger(raw.turn_count) && raw.turn_count >= 0
    ? raw.turn_count
    : 0
  const rawSlots = raw.slots && typeof raw.slots === 'object'
    ? raw.slots as Record<string, unknown>
    : {}
  const slotNames: ConversationSlotName[] = [
    'craft', 'group_size', 'budget_per_person', 'budget_basis', 'date', 'duration',
    'interests', 'origin', 'radius', 'nearest', 'cheapest',
  ]
  for (const name of slotNames) {
    const rawSlot = rawSlots[name]
    if (!rawSlot || typeof rawSlot !== 'object' || Array.isArray(rawSlot)) continue
    const slot = rawSlot as Record<string, unknown>
    if (
      (typeof slot.value !== 'string'
        && typeof slot.value !== 'number'
        && typeof slot.value !== 'boolean'
        && !(Array.isArray(slot.value) && slot.value.every(item => typeof item === 'string')))
      || typeof slot.raw_span !== 'string'
      || typeof slot.created_turn !== 'number'
      || (slot.source_turn !== undefined && typeof slot.source_turn !== 'number')
      || (slot.source !== 'explicit' && slot.source !== 'inferred')
    ) continue
    state.slots[name] = {
      value: slot.value,
      raw_span: slot.raw_span,
      created_turn: slot.created_turn,
      source_turn: typeof slot.source_turn === 'number' ? slot.source_turn : slot.created_turn,
      source: slot.source,
    }
  }
  if (typeof raw.date_or_duration === 'string') state.date_or_duration = raw.date_or_duration
  state.relaxed_fields = Array.isArray(raw.relaxed_fields)
    ? [...new Set(raw.relaxed_fields.filter((item): item is string => typeof item === 'string'))]
    : []
  if (Array.isArray(raw.interests) && raw.interests.every(item => typeof item === 'string')) {
    state.interests = raw.interests
  }
  const nearest = typeof state.slots.nearest?.value === 'boolean'
    ? state.slots.nearest.value
    : typeof rawRankingPreferences.nearest === 'boolean' ? rawRankingPreferences.nearest : undefined
  const cheapest = typeof state.slots.cheapest?.value === 'boolean'
    ? state.slots.cheapest.value
    : typeof rawRankingPreferences.cheapest === 'boolean' ? rawRankingPreferences.cheapest : undefined
  if (nearest !== undefined || cheapest !== undefined) {
    state.ranking_preferences = {
      ...(nearest !== undefined ? { nearest } : {}),
      ...(cheapest !== undefined ? { cheapest } : {}),
    }
  }
  const budgetSlot = state.slots.budget_per_person
  if (budgetSlot) {
    const rawBudget = parseExplicitBudgetAmount(budgetSlot.raw_span)
    const parsedBudget = rawBudget === undefined
      ? undefined
      : state.budget_basis === 'group_total'
        ? state.group_size ? rawBudget / state.group_size : undefined
        : rawBudget
    if (parsedBudget === undefined) {
      delete state.slots.budget_per_person
      delete state.budget_per_person
    } else {
      budgetSlot.value = parsedBudget
      state.budget_per_person = parsedBudget
    }
  }
  const radiusSlot = state.slots.radius
  if (radiusSlot) {
    if (/[-+]\s*\d|1e\d|mười|ki[- ]?lô[- ]?mét/iu.test(radiusSlot.raw_span)) {
      delete state.slots.radius
      delete state.radius_km
    } else {
    const parsedRadius = radiusSlot.raw_span.match(/(\d+(?:[.,]\d+)?)\s*(?:km|kilometers?|cây\s*số)(?![\p{L}])/iu)
    if (!parsedRadius) {
      delete state.slots.radius
      delete state.radius_km
    } else {
      radiusSlot.value = Math.round(Number(parsedRadius[1].replace(',', '.')) * 10) / 10
      state.radius_km = Number(radiusSlot.value)
    }
    }
  }
  state.turn_history = Array.isArray(raw.turn_history)
    ? raw.turn_history
      .filter((turn): turn is { turn: number; slots: Partial<Record<ConversationSlotName, ConversationSlot>> } =>
        Boolean(turn && typeof turn === 'object' && typeof (turn as Record<string, unknown>).turn === 'number')
      )
      .slice(-20)
    : []
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

export function isBookingActionRequest(text: string): boolean {
  return /(?:đặt\s+(?:luôn|ngay)(?:\s+(?:cho tôi|giúp tôi))?|(?:chốt|xác nhận)\s+(?:tour|lịch|chuyến)(?:\s+này)?|book\s+(?:it|this|now)|confirm\s+(?:this\s+)?tour)/i
    .test(text)
}

export function isAmbiguousCraftQuestion(text: string): boolean {
  return /(?:làm|thử)\s+(?:hương|tò\s*he)\s+(?:được không|có được không|được chứ)/iu.test(text)
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

export function mergeConversationState(
  current: AitConversationState,
  text: string,
  extracted: TourContext,
  now: Date,
  pendingField?: PendingQuestionField
): AitConversationState {
  const next = normalizeConversationState(current)
  if (!text.trim()) return next
  const turn = next.turn_count + 1
  const updatedSlots: AitConversationState['slots'] = {}
  const clearSlotValue = (name: ConversationSlotName) => {
    switch (name) {
      case 'craft': delete next.craft; break
      case 'group_size': delete next.group_size; break
      case 'budget_per_person':
        delete next.budget_per_person
        break
      case 'budget_basis':
        delete next.budget_basis
        break
      case 'date': delete next.date; break
      case 'duration': delete next.date_or_duration; break
      case 'interests': delete next.interests; break
      case 'origin': delete next.origin; break
      case 'radius': delete next.radius_km; break
      case 'nearest':
        if (next.ranking_preferences) delete next.ranking_preferences.nearest
        break
      case 'cheapest':
        if (next.ranking_preferences) delete next.ranking_preferences.cheapest
        break
    }
  }
  for (const name of [
    'craft', 'group_size', 'budget_per_person', 'budget_basis', 'date', 'duration',
    'interests', 'origin', 'radius', 'nearest', 'cheapest',
  ] as const) {
    if (next.slots[name]?.source === 'inferred') {
      clearSlotValue(name)
      delete next.slots[name]
    }
  }
  const setSlot = (
    name: ConversationSlotName,
    value: string | number | boolean | string[],
    rawSpan: string,
    source: ConversationSlot['source'] = 'explicit',
  ) => {
    const slotValue = name === 'radius' && typeof value === 'number'
      ? Math.round(value * 10) / 10
      : value
    const slot = {
      value: slotValue,
      raw_span: rawSpan.trim(),
      created_turn: turn,
      source_turn: turn,
      source,
    }
    next.slots[name] = slot
    updatedSlots[name] = slot
    switch (name) {
      case 'craft':
        if (typeof value === 'string') next.craft = value
        break
      case 'group_size':
        if (typeof value === 'number') next.group_size = value
        break
      case 'budget_per_person':
        if (typeof value === 'number') next.budget_per_person = value
        break
      case 'budget_basis':
        if (value === 'per_person' || value === 'group_total') next.budget_basis = value
        break
      case 'date':
        if (typeof value === 'string') next.date = value
        break
      case 'duration':
        if (typeof value === 'string') next.date_or_duration = value
        break
      case 'interests':
        if (Array.isArray(value)) next.interests = value
        break
      case 'origin':
        if (typeof value === 'string') next.origin = value
        break
      case 'radius':
        if (typeof value === 'number') next.radius_km = Math.round(value * 10) / 10
        break
      case 'nearest':
        if (typeof value === 'boolean') {
          next.ranking_preferences = { ...next.ranking_preferences, nearest: value }
        }
        break
      case 'cheapest':
        if (typeof value === 'boolean') {
          next.ranking_preferences = { ...next.ranking_preferences, cheapest: value }
        }
        break
    }
  }
  const normalized = normalizeText(text)
  const clearsRadius = /(?:bo|xoa|huy|khong can|thoi)\s+(?:gioi han\s+)?(?:ban kinh|km|kilomet)/i.test(normalized)
  if (clearsRadius) {
    delete next.radius_km
    delete next.slots.radius
  }
  const craftExclusion = excludedCraft(text)
  const newVillageExclusions = excludedVillageIds(text)

  if (craftExclusion) {
    next.exclusions.crafts = [...new Set([...next.exclusions.crafts, craftExclusion])]
    if (next.craft === craftExclusion) delete next.craft
  } else {
    const unsupportedPair = text.match(/\b(hương|tò\s*he)\s+(?:hay|hoặc)\s+(?:làm\s+)?(hương|tò\s*he)\b/iu)
    const unsupportedCraft = text.match(/(?:đổi\s+sang|hay\s+là|làm|thử)\s+(hương|tò\s*he)\b/iu)?.[1]
    const explicitCraft = detectCraftPreference(text)
      || (unsupportedPair ? `${unsupportedPair[1]}/${unsupportedPair[2]}`.toLocaleLowerCase('vi') : unsupportedCraft?.toLocaleLowerCase('vi'))
    const craft = explicitCraft || (next.craft === undefined
      ? resolveCraftPreference(extracted.craft_preference, [{ text }])
      : undefined)
    if (craft) {
      if (explicitCraft && next.craft !== explicitCraft) next.exclusions.villages = []
      setSlot('craft', craft, text.match(/(?:làng\s+(?:nghề\s+)?)?(?:gốm|lụa|dệt|mộc|gỗ|nón|mây tre|hương|tò\s*he)/iu)?.[0] ?? text,
        explicitCraft ? 'explicit' : 'inferred')
      next.dismissed_questions = next.dismissed_questions.filter(field => field !== 'craft')
    }
  }

  next.exclusions.villages = [...new Set([...next.exclusions.villages, ...newVillageExclusions])]
  const adultsAndChildren = text.match(
    /(\d+)\s*(?:người lớn|nguoi lon)\s*(\d+)\s*(?:trẻ em|tre em)\b/iu,
  )
  const rawGroup = adultsAndChildren
    ? `${adultsAndChildren[1]} người lớn ${adultsAndChildren[2]} trẻ em`
    : text.match(/\b\d+\s*(?:khách|người|bạn|pax|people|guests?)\b/iu)?.[0]
  const parsedGroupSize = adultsAndChildren
    ? Number(adultsAndChildren[1]) + Number(adultsAndChildren[2])
    : rawGroup ? Number(rawGroup.match(/\d+/)?.[0]) : undefined
  const groupSize = parsedGroupSize ?? extracted.group_size
  if (groupSize !== undefined && Number.isInteger(groupSize) && groupSize > 0 && (rawGroup || next.group_size === undefined)) {
    setSlot('group_size', groupSize, rawGroup ?? text, rawGroup ? 'explicit' : 'inferred')
    next.dismissed_questions = next.dismissed_questions.filter(field => field !== 'group_size')
  } else if (/\b0\s*(?:khách|người|pax|people|guests?)\b/iu.test(text)) {
    delete next.group_size
    delete next.slots.group_size
  }
  const budget = parseExplicitBudgetAmount(text)
  if (budget !== undefined) {
    const rawBudget = text.match(/\b\d[\d.,\s]*\s*(?:k\b(?!m)|nghìn|ngàn|triệu|đ|vnd)(?![\p{L}])/iu)?.[0] ?? text
    const groupTotal = /(?:cả\s+đoàn|cho\s+cả\s+đoàn|tổng\s+đoàn|toàn\s+đoàn)/iu.test(text)
    const explicitGroupSize = parsedGroupSize
    if (groupTotal && (!explicitGroupSize || explicitGroupSize <= 0)) {
      delete next.budget_per_person
      delete next.slots.budget_per_person
    } else {
    const budgetValue = groupTotal && explicitGroupSize && explicitGroupSize > 0
      ? budget / explicitGroupSize
      : budget
    setSlot('budget_per_person', budgetValue, rawBudget)
    next.budget_basis = groupTotal ? 'group_total' : 'per_person'
    setSlot('budget_basis', next.budget_basis, rawBudget)
    }
    next.dismissed_questions = next.dismissed_questions.filter(field => field !== 'budget_per_person')
  }

  const parsedDate = extractTourDate(text, now)
  const date = parsedDate ?? (next.date === undefined ? extracted.target_date_or_range?.start_date : undefined)
  if (date) {
    setSlot('date', date, text, parsedDate ? 'explicit' : 'inferred')
    next.dismissed_questions = next.dismissed_questions.filter(field => field !== 'date')
  }
  else if (pendingField === 'date' && /^(?:mai|ngày mai|cuối tuần|cuối tuần này|tomorrow|this weekend|weekend)[.!? ]*$/i.test(text.trim())) {
    next.date = text.trim()
    next.dismissed_questions = next.dismissed_questions.filter(field => field !== 'date')
  }
  if (extracted.origin_or_route?.origin_address
    && isOriginGroundedInUserText(extracted.origin_or_route.origin_address, text)
    && !/\b\d+(?:[.,]\d+)?\s*(?:km|kilometers?|cây\s*số)\b/iu.test(extracted.origin_or_route.origin_address)) {
    const origin = extracted.origin_or_route.origin_address
    setSlot('origin', origin, text)
    next.dismissed_questions = next.dismissed_questions.filter(field => field !== 'origin')
  }

  const radius = hasInvalidRadiusConstraint(text)
    ? null
    : text.match(/(?:radius|bán kính|trong phạm vi|dưới|không quá|tối đa|cách)?\s*(\d+(?:[.,]\d+)?)\s*(?:km|kilometers?|cây\s*số)(?![\p{L}])/iu)
  if (hasInvalidRadiusConstraint(text)) {
    delete next.radius_km
    delete next.slots.radius
  } else if (radius) {
    setSlot('radius', Number(radius[1].replace(',', '.')), radius[0])
    next.dismissed_questions = next.dismissed_questions.filter(field => field !== 'radius_km')
  }
  const nearest = text.match(/(?:gần nhất|nearest|closest)/iu)?.[0]
  if (nearest) setSlot('nearest', true, nearest)
  const cheapest = text.match(/(?:rẻ nhất|giá thấp nhất|cheapest|lowest price)/iu)?.[0]
  if (cheapest) setSlot('cheapest', true, cheapest)

  const duration = text.match(/\b(?:nửa\s+ngày|một\s+ngày|1\s+ngày|hai\s+ngày|2\s+ngày|cuối\s+tuần)\b/iu)?.[0]
  if (duration) setSlot('duration', duration.toLocaleLowerCase('vi'), duration)
  const interestMatches = [...text.matchAll(/(?:đoàn\s+học\s+sinh|khách\s+nước\s+ngoài|gần\s+trung\s+tâm|tự\s+tay\s+làm|trải\s+nghiệm|thủ\s+công|giá\s+mềm)/giu)]
    .map(match => match[0].toLocaleLowerCase('vi'))
  if (interestMatches.length > 0) {
    const interests = [...new Set([...(next.interests ?? []), ...interestMatches])]
    setSlot('interests', interests, interestMatches.join(', '))
  }

  next.turn_count = turn
  next.turn_history = [...next.turn_history, { turn, slots: updatedSlots }].slice(-20)
  return normalizeConversationState(next)
}

export function applyConversationState(context: TourContext, state: AitConversationState): TourContext {
  const next: TourContext = { ...context }
  if (state.craft) next.craft_preference = state.craft
  if (state.group_size !== undefined) next.group_size = state.group_size
  if (state.budget_per_person !== undefined) {
    next.budget = { max_per_person: state.budget_per_person, currency: 'VND' }
  } else delete next.budget
  if (state.date && /^\d{4}-\d{2}-\d{2}$/.test(state.date)) {
    next.target_date_or_range = { start_date: state.date }
  }
  if (state.origin) next.origin_or_route = { origin_address: state.origin }
  else delete next.origin_or_route
  return next
}

export function missingQuestions(state: AitConversationState): PendingQuestion[] {
  const questions: PendingQuestion[] = []
  if (state.group_size === undefined) {
    questions.push({ field: 'group_size', text: 'Tôi có thể tư vấn cụ thể hơn nếu bạn muốn chia sẻ số khách dự kiến.' })
  }
  if (state.date === undefined) {
    questions.push({ field: 'date', text: 'Tôi có thể tư vấn lịch phù hợp hơn nếu bạn cho biết ngày đi.' })
  }
  if (state.craft === undefined && state.exclusions.crafts.length === 0) {
    questions.push({ field: 'craft', text: 'Tôi có thể gợi ý sát hơn nếu bạn cho biết nghề hoặc trải nghiệm muốn thử.' })
  }
  return questions.filter(question => !state.dismissed_questions.includes(question.field))
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
    && (state.craft !== undefined || state.exclusions.crafts.length > 0)
}
