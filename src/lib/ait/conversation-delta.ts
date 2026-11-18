import { extractTourDate } from '@/lib/ai/tour-date'
import { parseExplicitBudgetAmount } from '@/lib/ait/budget'
import { craftTypeForPreference, detectCraftPreference } from '@/lib/matching/craft-taxonomy'
import {
  type AitConversationState,
  type ConversationSlotName,
} from './conversation-state'
import type {
  ConversationDelta,
  ConversationDeltaOperation,
  ConversationDeltaSlot,
  RejectedConversationDelta,
  ValidatedConversationDelta,
} from './conversation-delta-schema'

export type {
  ConversationDelta,
  ConversationDeltaOperation,
  ConversationDeltaSlot,
  RejectedConversationDelta,
  ValidatedConversationDelta,
} from './conversation-delta-schema'

const slots: ConversationDeltaSlot[] = [
  'craft', 'group_size', 'budget_per_person', 'budget_basis', 'date', 'duration',
  'interests', 'origin', 'radius', 'nearest', 'cheapest', 'guide_language',
]

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isGrounded(rawSpan: string, userText: string): boolean {
  const span = normalizeText(rawSpan).trim()
  return span.length > 0 && normalizeText(userText).includes(span)
}

function hasCue(text: string, pattern: RegExp): boolean {
  return pattern.test(normalizeText(text))
}

function clearCue(slot: ConversationDeltaSlot): RegExp {
  const field = {
    craft: /(?:bo|xoa|huy|thoi)\s+(?:nghe|trai nghiem|yeu cau nghe|tieu chi nghe)/,
    group_size: /(?:bo|xoa|huy|thoi)\s+(?:so khach|so nguoi|quy mo doan)/,
    budget_per_person: /(?:bo|xoa|huy|thoi)\s+(?:ngan sach|gioi han gia|muc gia)/,
    budget_basis: /(?:bo|xoa|huy|thoi)\s+(?:ngan sach|gioi han gia|muc gia)/,
    date: /(?:bo|xoa|huy|thoi)\s+(?:ngay|thoi gian|lich di)/,
    duration: /(?:bo|xoa|huy|thoi)\s+(?:thoi luong|thoi gian)/,
    interests: /(?:bo|xoa|huy|thoi)\s+(?:uu tien|so thich|yeu cau phu)/,
    origin: /(?:bo|xoa|huy|thoi)\s+(?:diem xuat phat|diem don|dia diem xuat phat)/,
    radius: /(?:bo|xoa|huy|thoi)\s+(?:gioi han\s+)?(?:ban kinh|km|kilomet)/,
    nearest: /(?:bo|xoa|huy|thoi)\s+(?:uu tien gan nhat|gan nhat)/,
    cheapest: /(?:bo|xoa|huy|thoi)\s+(?:uu tien re nhat|re nhat)/,
    guide_language: /(?:bo|xoa|huy|thoi)\s+(?:yeu cau )?(?:huong dan|thuyet minh) tieng anh/,
  } satisfies Record<ConversationDeltaSlot, RegExp>
  return field[slot]
}

function relaxCue(text: string): boolean {
  return /(?:khong can|khong bat buoc|khong co cung duoc|linh hoat|tuy y|sao cung duoc)/i
    .test(normalizeText(text))
}

function hasPriorEvidence(slot: ConversationDeltaSlot, recentTurns: string[]): boolean {
  const evidence = {
    craft: /(?:nghe|trải nghiệm|g[oố]m|lụa|nón|mây tre)/iu,
    group_size: /(?:khach|nguoi|pax|doan)/iu,
    budget_per_person: /(?:ngan sach|kinh phi|chi phi|gia|dong|vnd|k\b)/iu,
    budget_basis: /(?:ngan sach|kinh phi|chi phi|gia|dong|vnd|k\b)/iu,
    date: /(?:ngay|thoi gian|khoi hanh|cuoi tuan|\d{1,2}\/\d{1,2})/iu,
    duration: /(?:nua ngay|mot ngay|hai ngay|cuoi tuan)/iu,
    interests: /(?:uu tien|so thich|trai nghiem|thu cong)/iu,
    origin: /(?:xuat phat|diem don|gan|tu khu vuc)/iu,
    radius: /(?:km|cay so|ban kinh)/iu,
    nearest: /(?:gan nhat|closest|nearest)/iu,
    cheapest: /(?:re nhat|gia thap nhat|cheapest)/iu,
    guide_language: /(?:huong dan tieng anh|thuyet minh tieng anh|english guide)/iu,
  } satisfies Record<ConversationDeltaSlot, RegExp>
  return recentTurns.some(turn => evidence[slot].test(normalizeText(turn)))
}

function validateSet(
  slot: ConversationDeltaSlot,
  operation: ConversationDeltaOperation,
  userText: string,
  groupSize: number | undefined,
  budgetBasis: unknown,
): string | undefined {
  const { value, raw_span: rawSpan } = operation
  if (!isGrounded(rawSpan, userText)) return 'raw_span_not_in_latest_user_turn'

  switch (slot) {
    case 'craft':
      if (typeof value !== 'string' || !craftTypeForPreference(value)) return 'craft_not_in_catalog'
      if (detectCraftPreference(rawSpan) !== value) return 'craft_not_supported_by_raw_span'
      return
    case 'group_size': {
      if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) return 'group_size_must_be_positive_integer'
      const parsed = rawSpan.match(/\b\d+\s*(?:khách|người|bạn|pax|people|guests?)\b/iu)
      return parsed && Number(parsed[0].match(/\d+/)?.[0]) === value
        ? undefined
        : 'group_size_not_supported_by_raw_span'
    }
    case 'budget_per_person': {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'budget_must_be_positive_number'
      const amount = parseExplicitBudgetAmount(rawSpan)
      if (amount === undefined) return 'budget_not_explicitly_stated'
      if (budgetBasis === 'group_total') {
        if (!groupSize) return 'group_total_requires_group_size'
        return Math.round(amount / groupSize) === value ? undefined : 'budget_value_does_not_match_basis'
      }
      return amount === value ? undefined : 'budget_value_does_not_match_raw_span'
    }
    case 'budget_basis':
      if (value !== 'per_person' && value !== 'group_total') return 'invalid_budget_basis'
      if (value === 'group_total' && !/(?:cả đoàn|toàn đoàn|tổng đoàn|cho cả đoàn)/iu.test(rawSpan)) {
        return 'group_total_basis_not_stated'
      }
      if (value === 'per_person' && !/(?:\/\s*(?:người|khách|pax)|mỗi\s*(?:người|khách)|per person)/iu.test(rawSpan)) {
        return 'per_person_basis_not_stated'
      }
      return
    case 'date': {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'invalid_date'
      const parsed = extractTourDate(rawSpan, new Date('2026-11-18T00:00:00.000Z'))
      return parsed === value ? undefined : 'date_not_supported_by_raw_span'
    }
    case 'duration':
    case 'origin': {
      if (typeof value !== 'string' || value.trim().length === 0) return `${slot}_must_be_non_empty_text`
      return normalizeText(rawSpan).includes(normalizeText(value))
        ? undefined
        : `${slot}_value_not_supported_by_raw_span`
    }
    case 'interests':
      return Array.isArray(value) && value.length > 0
        && value.every(item => typeof item === 'string' && normalizeText(rawSpan).includes(normalizeText(item)))
        ? undefined
        : 'interests_not_supported_by_raw_span'
    case 'radius': {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'radius_must_be_positive_number'
      if (/(?:xa hơn|trên|hơn|ít nhất|tối thiểu|ngoài|từ .+ đến .+|\d+-\d+)\s*\d*.*(?:km|cây số)/iu.test(rawSpan)) {
        return 'unsupported_distance_expression'
      }
      const radius = rawSpan.match(/(\d+(?:[.,]\d+)?)\s*(?:km|kilometers?|cây\s*số)(?![\p{L}])/iu)
      if (!radius) return 'radius_not_supported_by_raw_span'
      return Math.round(Number(radius[1].replace(',', '.')) * 10) / 10 === value
        ? undefined
        : 'radius_value_does_not_match_raw_span'
    }
    case 'nearest':
    case 'cheapest':
      if (typeof value !== 'boolean') return `${slot}_must_be_boolean`
      return slot === 'nearest'
        ? /(?:gần nhất|gan nhat|nearest|closest)/iu.test(rawSpan) ? undefined : 'nearest_not_supported_by_raw_span'
        : /(?:rẻ nhất|re nhat|giá thấp nhất|cheapest|lowest price)/iu.test(rawSpan) ? undefined : 'cheapest_not_supported_by_raw_span'
    case 'guide_language':
      return 'guide_language_only_supports_relax'
  }
}

export function validateConversationDelta(
  raw: unknown,
  userText: string,
  recentUserTurns: string[],
  currentState?: AitConversationState,
): ValidatedConversationDelta {
  const accepted: ConversationDelta = {}
  const rejected: RejectedConversationDelta[] = []
  if (!isRecord(raw)) {
    return { accepted, rejected: [{ slot: 'craft', reason: 'delta_must_be_object' }] }
  }

  const rawGroup = raw.group_size
  const groupSize = isRecord(rawGroup) && rawGroup.action === 'set' && typeof rawGroup.value === 'number'
    ? rawGroup.value
    : currentState?.group_size
  const rawBasis = raw.budget_basis
  const budgetBasis = isRecord(rawBasis) && rawBasis.action === 'set'
    ? rawBasis.value
    : currentState?.budget_basis

  for (const [key, unknownOperation] of Object.entries(raw)) {
    const slot = key as ConversationDeltaSlot
    if (!slots.includes(slot)) {
      rejected.push({ slot: 'craft', reason: `unknown_slot:${key}` })
      continue
    }
    if (!isRecord(unknownOperation)
      || !['set', 'clear', 'relax'].includes(String(unknownOperation.action))
      || typeof unknownOperation.raw_span !== 'string') {
      rejected.push({ slot, reason: 'malformed_operation' })
      continue
    }
    const operation = unknownOperation as unknown as ConversationDeltaOperation
    if (!isGrounded(operation.raw_span, userText)) {
      rejected.push({ slot, reason: 'raw_span_not_in_latest_user_turn' })
      continue
    }
    if (operation.action === 'set') {
      const reason = validateSet(slot, operation, userText, groupSize, budgetBasis)
      if (reason) rejected.push({ slot, reason })
      else accepted[slot] = operation
      continue
    }
    if (operation.action === 'clear') {
      if (!hasCue(userText, clearCue(slot))) {
        rejected.push({ slot, reason: 'clear_not_explicitly_requested' })
      } else {
        accepted[slot] = operation
      }
      continue
    }
    if (!relaxCue(userText) || !hasPriorEvidence(slot, recentUserTurns)) {
      rejected.push({ slot, reason: 'no_matching_prior_user_request' })
    } else {
      accepted[slot] = operation
    }
  }

  return { accepted, rejected }
}

function clearStateSlot(state: AitConversationState, slot: ConversationDeltaSlot): void {
  switch (slot) {
    case 'craft': delete state.craft; break
    case 'group_size': delete state.group_size; break
    case 'budget_per_person': delete state.budget_per_person; break
    case 'budget_basis': delete state.budget_basis; break
    case 'date': delete state.date; break
    case 'duration': delete state.date_or_duration; break
    case 'interests': delete state.interests; break
    case 'origin': delete state.origin; break
    case 'radius': delete state.radius_km; break
    case 'nearest':
      if (state.ranking_preferences) delete state.ranking_preferences.nearest
      break
    case 'cheapest':
      if (state.ranking_preferences) delete state.ranking_preferences.cheapest
      break
    case 'guide_language': break
  }
}

export function applyConversationDelta(
  current: AitConversationState,
  validation: ValidatedConversationDelta,
  _now: Date,
): AitConversationState {
  const entries = Object.entries(validation.accepted) as Array<[ConversationDeltaSlot, ConversationDeltaOperation]>
  if (entries.length === 0) return current

  const next: AitConversationState = {
    ...current,
    dismissed_questions: [...current.dismissed_questions],
    exclusions: {
      villages: [...current.exclusions.villages],
      crafts: [...current.exclusions.crafts],
    },
    ranking_preferences: current.ranking_preferences ? { ...current.ranking_preferences } : undefined,
    relaxed_fields: [...current.relaxed_fields],
    slots: { ...current.slots },
    turn_history: [...current.turn_history],
  }
  const turn = current.turn_count + 1
  const changed: AitConversationState['slots'] = {}

  for (const [slot, operation] of entries) {
    if (operation.action === 'set') continue
    clearStateSlot(next, slot)
    delete next.slots[slot as ConversationSlotName]
    if (slot === 'budget_per_person') {
      delete next.budget_basis
      delete next.slots.budget_basis
    }
    if (operation.action === 'relax' && !next.relaxed_fields.includes(slot)) {
      next.relaxed_fields.push(slot)
    }
  }

  for (const [slot, operation] of entries) {
    if (operation.action !== 'set') continue
    const value = operation.value
    if (slot === 'budget_basis' && value !== 'group_total' && value !== 'per_person') continue
    switch (slot) {
      case 'craft': if (typeof value === 'string') next.craft = value; break
      case 'group_size': if (typeof value === 'number') next.group_size = value; break
      case 'budget_per_person': if (typeof value === 'number') next.budget_per_person = value; break
      case 'budget_basis': if (value === 'group_total' || value === 'per_person') next.budget_basis = value; break
      case 'date': if (typeof value === 'string') next.date = value; break
      case 'duration': if (typeof value === 'string') next.date_or_duration = value; break
      case 'interests': if (Array.isArray(value)) next.interests = value; break
      case 'origin': if (typeof value === 'string') next.origin = value; break
      case 'radius': if (typeof value === 'number') next.radius_km = value; break
      case 'nearest':
      case 'cheapest':
      case 'guide_language':
        break
    }
    if (slot === 'nearest' || slot === 'cheapest') {
      next.ranking_preferences = {
        ...next.ranking_preferences,
        [slot]: value as boolean,
      }
    }
    if (slot === 'guide_language') continue
    const stateSlot = slot as ConversationSlotName
    const entry = {
      value: value as string | number | boolean | string[],
      raw_span: operation.raw_span.trim(),
      created_turn: turn,
      source_turn: turn,
      source: 'explicit' as const,
    }
    next.slots[stateSlot] = entry
    changed[stateSlot] = entry
    next.relaxed_fields = next.relaxed_fields.filter(field => field !== slot)
  }

  if (validation.accepted.group_size?.action === 'set'
    && next.budget_basis === 'group_total'
    && next.slots.budget_per_person
    && typeof next.group_size === 'number') {
    const groupTotal = parseExplicitBudgetAmount(next.slots.budget_per_person.raw_span)
    if (groupTotal !== undefined) {
      const perPerson = Math.round(groupTotal / next.group_size)
      next.budget_per_person = perPerson
      next.slots.budget_per_person.value = perPerson
    }
  }

  next.turn_count = turn
  next.turn_history = [...next.turn_history, { turn, slots: changed }].slice(-20)
  return next
}
