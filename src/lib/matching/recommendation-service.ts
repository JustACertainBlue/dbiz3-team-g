import { craftLabel as craftTypeLabel } from '../explore/vocabulary'
import type { MatchFactors } from '@/lib/matching/scoring-engine'
import { selectTiers } from '@/lib/ait/scoring'
import { DEFAULT_HANOI_ORIGIN_LABEL, originDisplayLabel } from '@/lib/matching/geo'

export interface RecommendationItem {
  experience_id: string
  image_url?: string
  provider_id?: string
  experience_name?: string
  provider_name?: string
  village_name?: string
  price_per_person?: number | null
  max_participants?: number | null
  distance_km?: number
  distance_source?: 'haversine'
  rank: number
  match_score: number
  explanation: string
}

export interface RecommendationOutput {
  top_matches: RecommendationItem[]
  additional_suggestions: RecommendationItem[]
}

export interface RelaxationSuggestion {
  criterion: 'Budget' | 'Distance' | 'Dates'
  suggested_value: string | number
}

export interface RelaxationOutput {
  relaxation_suggestions: RelaxationSuggestion[]
  conversation_prompt: string
}

// BR-020, #30, F.2: candidates scoring below 40 are dropped; selectTiers partitions top and additional.
export const SCORE_THRESHOLD = 40

export function applyScoreThreshold<T extends { match_score?: number }>(candidates: T[]): T[] {
  return candidates.filter(candidate => candidate.match_score === undefined || candidate.match_score >= SCORE_THRESHOLD)
}

const vnd = (amount: number) => amount.toLocaleString('vi-VN')

const CRAFT_LABELS_VI: Record<string, string> = {
  silk: 'dệt lụa',
  embroidery: 'thêu tay',
  pottery: 'làm gốm',
  woodcarving: 'điêu khắc gỗ',
  food: 'ẩm thực',
  metalwork: 'đúc đồng',
  painting: 'sơn mài',
  'conical hat': 'làm nón',
  bamboo: 'đan mây tre',
}

const EXPERIENCE_LABELS_VI: Record<string, string> = {
  'Workshop/Hands-on': 'thực hành tại xưởng',
  'Cultural Show': 'biểu diễn văn hóa',
  Sightseeing: 'tham quan',
  'Culinary/Tasting': 'ẩm thực',
  Combo: 'combo trải nghiệm',
}

// #25: only factors that the scoring actually evaluated (match_factors), never a craft the Agency did not ask for.
export function explain(item: any, _score: number | null): string {
  const f: MatchFactors = item.match_factors || {}
  const parts: string[] = []
  if (f.craft) {
    const label = (f.craft.matched ? item.craft_display : undefined)
      || (f.craft.craft_type ? craftTypeLabel(f.craft.craft_type) : '')
      || CRAFT_LABELS_VI[f.craft.preference]
      || f.craft.label
      || f.craft.preference
    parts.push(f.craft.matched
      ? `Hợp sở thích ${label} của bạn.`
      : `Gợi ý thêm, khác nghề ${label} bạn chọn.`)
  }
  if (f.experience_types) {
    const types = f.experience_types.requested
      .map(type => EXPERIENCE_LABELS_VI[type] || type)
      .join(' / ')
    parts.push(f.experience_types.matched
      ? `Đúng loại trải nghiệm ${types} theo yêu cầu.`
      : `Chưa đúng loại trải nghiệm ${types} theo yêu cầu.`)
  }
  if (typeof f.max_participants === 'number' && typeof f.group_size === 'number') {
    parts.push(`Sức chứa tối đa ${f.max_participants} khách cho đoàn ${f.group_size} khách.`)
  }
  if (typeof f.budget_per_person === 'number' && typeof f.price_per_person === 'number') {
    parts.push(`${vnd(f.price_per_person)}đ/người, trong ngân sách ${vnd(f.budget_per_person)}đ/người.`)
  }
  if (typeof f.distance_km === 'number' && Number.isFinite(f.distance_km)) {
    if (item.location_source === 'district_fallback') {
      parts.push(`Khoảng ${Math.round(f.distance_km)} km (ước tính theo huyện).`)
    } else if (item.location_source === 'approximate') {
      parts.push(`Khoảng ${Math.round(f.distance_km)} km (tọa độ xấp xỉ).`)
    } else {
      parts.push(`Cách ${originDisplayLabel(f.origin) || DEFAULT_HANOI_ORIGIN_LABEL} khoảng ${f.distance_km.toFixed(1).replace('.', ',')} km (đường chim bay).`)
    }
  }
  if (parts.length === 0) {
    return 'Trải nghiệm làng nghề đã xác minh, phù hợp với tiêu chí tour.'
  }
  return parts.join(' ')
}

export async function buildRecommendations(
  rankedCandidates: any[]
): Promise<RecommendationOutput> {
  const scoredItems = rankedCandidates.map(c => ({
    id: c.experience_id,
    score: c.match_score ?? 85,
    flags: c.flags || [],
  }))
  const { top, additional } = selectTiers(scoredItems)
  const visibleTop = top.slice(0, 3)
  const visibleAdditional = additional.slice(0, Math.max(0, 3 - visibleTop.length))
  const candMap = new Map(rankedCandidates.map(c => [c.experience_id, c]))

  const formatItem = (item: any, index: number, offset: number): RecommendationItem => {
    const expName = item.experience_name || item.name || `Experience ${item.experience_id}`
    const rank = item.rank || offset + index + 1
    const score = item.match_score ?? 85

    return {
      experience_id: item.experience_id,
      ...(typeof item.image_url === 'string' ? { image_url: item.image_url } : {}),
      provider_id: item.provider_id,
      experience_name: expName,
      provider_name: item.provider_name,
      village_name: item.village_name,
      price_per_person: item.price_per_person,
      max_participants: item.max_participants,
      ...(item.distance_source === 'haversine' && typeof item.distance_km === 'number'
        ? { distance_km: item.distance_km, distance_source: 'haversine' as const }
        : {}),
      rank,
      match_score: score,
      explanation: explain(item, score),
    }
  }

  const top_matches = visibleTop.map((id, idx) => formatItem(candMap.get(id), idx, 0))
  const additional_suggestions = visibleAdditional.map((id, idx) => formatItem(candMap.get(id), idx, visibleTop.length))

  return {
    top_matches,
    additional_suggestions,
  }
}

/**
 * FR-012 relaxation (#23, #24). `candidates` are the candidates that pass every hard constraint except
 * the budget; ranked ones carry `match_score` and only those reaching the threshold count (#30).
 */
export async function buildRelaxationSuggestions(
  candidates: any[],
  criteria: any,
  options: { largest_group_size?: number } = {}
): Promise<RelaxationOutput> {
  const suggestions: RelaxationSuggestion[] = []
  const budget = criteria?.max_budget_per_person
  const prices = applyScoreThreshold(candidates || [])
    .map(c => c.price_per_person)
    .filter((price): price is number => typeof price === 'number' && Number.isFinite(price))
  const cheapest = prices.length > 0 ? Math.min(...prices) : undefined

  if (budget !== undefined && cheapest !== undefined && cheapest > budget) {
    suggestions.push({
      criterion: 'Budget',
      suggested_value: cheapest,
    })
  }

  suggestions.push({
    criterion: 'Dates',
    suggested_value: 'Consider flexible dates (+/- 2 days)',
  })

  const groupSize = criteria?.group_size
  const largest = options.largest_group_size
  let conversation_prompt = criteria?.radius_km == null
    ? 'Chưa có trải nghiệm nào đạt đủ tiêu chí trên 60/100. Bạn có thể nới ngân sách hoặc khoảng cách di chuyển, hoặc đổi số khách để xem thêm lựa chọn.'
    : 'Hiện chưa có trải nghiệm phù hợp với toàn bộ yêu cầu. Mình giữ nguyên bán kính đã chọn; bạn có thể điều chỉnh ngân sách, ngày hoặc số khách.'
  if (groupSize !== undefined && largest !== undefined && groupSize > largest) {
    conversation_prompt = `Chưa có trải nghiệm nào nhận đoàn ${groupSize} khách: đoàn lớn nhất một trải nghiệm phù hợp nhận được là ${largest} khách. Bạn có thể chia đoàn hoặc giảm số khách.`
  } else if (suggestions[0]?.criterion === 'Budget' && cheapest !== undefined) {
    conversation_prompt = `Chưa có trải nghiệm nào có giá trong ngân sách ${vnd(budget)} ₫/khách. Giá thấp nhất đáp ứng các yêu cầu còn lại là ${vnd(cheapest)} ₫/khách.`
  }

  return {
    relaxation_suggestions: suggestions,
    conversation_prompt,
  }
}
