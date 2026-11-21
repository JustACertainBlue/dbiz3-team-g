import type { MatchFactors } from '@/lib/matching/scoring-engine'

export interface RecommendationItem {
  experience_id: string
  provider_id?: string
  experience_name?: string
  provider_name?: string
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

// BR-020, #30: candidates scoring below the no-match threshold are never shown.
export const SCORE_THRESHOLD = 60

export function applyScoreThreshold<T extends { match_score?: number }>(candidates: T[]): T[] {
  return candidates.filter(candidate => candidate.match_score === undefined || candidate.match_score >= SCORE_THRESHOLD)
}

const viNumber = (amount: number) => amount.toLocaleString('vi-VN')

// #25: only factors that the scoring actually evaluated (match_factors), never a craft the Agency did not ask for.
function explain(item: any, score: number): string {
  const f: MatchFactors = item.match_factors || {}
  const parts = [`Điểm phù hợp ${score}/100.`]
  if (f.craft) {
    parts.push(f.craft.matched
      ? `Hợp sở thích ${f.craft.label} của bạn (${f.craft.craft_type}).`
      : `Không hợp sở thích ${f.craft.label} của bạn.`)
  }
  if (f.experience_types) {
    const types = f.experience_types.requested.join(' / ')
    parts.push(f.experience_types.matched ? `Là trải nghiệm ${types}, đúng yêu cầu.` : `Không phải trải nghiệm ${types}.`)
  }
  if (f.max_participants !== undefined && f.group_size !== undefined) {
    parts.push(`Nhận tối đa ${f.max_participants} khách cho đoàn ${f.group_size} khách.`)
  }
  if (f.budget_per_person !== undefined && f.price_per_person !== undefined) {
    parts.push(`${viNumber(f.price_per_person)} ₫/khách, trong ngân sách ${viNumber(f.budget_per_person)} ₫/khách.`)
  }
  if (f.distance_km !== undefined) {
    parts.push(`Cách ${f.origin ?? 'điểm xuất phát của bạn'} khoảng ${f.distance_km} km (ước tính).`)
  }
  return parts.join(' ')
}

export async function buildRecommendations(
  rankedCandidates: any[]
): Promise<RecommendationOutput> {
  const shown = applyScoreThreshold(rankedCandidates)
  const topMatchesRaw = shown.slice(0, 5)
  const additionalRaw = shown.slice(5, 10)

  const formatItem = (item: any, index: number, offset: number): RecommendationItem => {
    const expName = item.experience_name || item.name || `Experience ${item.experience_id}`
    const rank = item.rank || offset + index + 1
    const score = item.match_score ?? 85

    return {
      experience_id: item.experience_id,
      provider_id: item.provider_id,
      experience_name: expName,
      provider_name: item.provider_name,
      rank,
      match_score: score,
      explanation: explain(item, score),
    }
  }

  const top_matches = topMatchesRaw.map((item, idx) => formatItem(item, idx, 0))
  const additional_suggestions = additionalRaw.map((item, idx) => formatItem(item, idx, 5))

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
  const prices = applyScoreThreshold(candidates || []).map(c => Number(c.price_per_person)).filter(price => Number.isFinite(price))
  const cheapest = prices.length > 0 ? Math.min(...prices) : undefined

  if (budget !== undefined && cheapest !== undefined && cheapest > budget) {
    suggestions.push({
      criterion: 'Budget',
      suggested_value: cheapest,
    })
  }

  suggestions.push({
    criterion: 'Distance',
    suggested_value: 'Expand radius by 15km to include outer craft villages',
  })

  suggestions.push({
    criterion: 'Dates',
    suggested_value: 'Consider flexible dates (+/- 2 days)',
  })

  const groupSize = criteria?.group_size
  const largest = options.largest_group_size
  let conversation_prompt =
    'Chưa có trải nghiệm nào đạt đủ tiêu chí trên 60/100. Bạn có thể nới ngân sách hoặc khoảng cách di chuyển, hoặc đổi số khách để xem thêm lựa chọn.'
  if (groupSize !== undefined && largest !== undefined && groupSize > largest) {
    conversation_prompt = `Chưa có trải nghiệm nào nhận đoàn ${groupSize} khách: đoàn lớn nhất một trải nghiệm phù hợp nhận được là ${largest} khách. Bạn có thể chia đoàn hoặc giảm số khách.`
  } else if (suggestions[0]?.criterion === 'Budget' && cheapest !== undefined) {
    conversation_prompt = `Chưa có trải nghiệm nào có giá trong ngân sách ${viNumber(budget)} ₫/khách. Giá thấp nhất đáp ứng các yêu cầu còn lại là ${viNumber(cheapest)} ₫/khách.`
  }

  return {
    relaxation_suggestions: suggestions,
    conversation_prompt,
  }
}
