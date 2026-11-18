import {
  AIT_DISTRICT_FALLBACK_SCORE_FACTOR,
  AIT_RANKING_TIE_EPSILON,
  AIT_RANKING_WEIGHTS,
} from './ranking-config'

export type AitRankingCriterion = keyof typeof AIT_RANKING_WEIGHTS

export interface AitRankingRequest {
  distance?: boolean
  group_size?: boolean
  budget?: boolean
  date?: boolean
  nearest?: boolean
  cheapest?: boolean
  radius_km?: number
  group_size_value?: number
  budget_per_person?: number
  price_sort_without_budget?: boolean
  price_sort_direction?: 'asc' | 'desc'
}

export interface AitRankingResult<T> {
  ranked: Array<T & {
    ranking_score: number | null
    score_components: Partial<Record<AitRankingCriterion, number>>
    normalized_weights: Partial<Record<AitRankingCriterion, number>>
    omitted_components: AitRankingCriterion[]
    match_score: number | null
    rank: number
  }>
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function capacityScore(capacity: number, groupSize: number): number {
  const ratio = capacity / groupSize
  if (ratio <= 1.5) return 1
  if (ratio >= 3) return 0.5
  return 1 - ((ratio - 1.5) / 1.5) * 0.5
}

function distanceScore(candidate: Record<string, unknown>, request: AitRankingRequest, maxDistance: number): number | undefined {
  if (!finiteNonNegative(candidate.distance_km)) return undefined

  const referenceDistance = typeof request.radius_km === 'number' && request.radius_km > 0
    ? request.radius_km
    : maxDistance
  const score = referenceDistance > 0
    ? Math.max(0, 1 - candidate.distance_km / referenceDistance)
    : 1
  return candidate.location_source === 'district_fallback'
    ? score * AIT_DISTRICT_FALLBACK_SCORE_FACTOR
    : score
}

function criteriaWeights(request: AitRankingRequest): Partial<Record<AitRankingCriterion, number>> {
  const active: Partial<Record<AitRankingCriterion, number>> = {}
  for (const criterion of Object.keys(AIT_RANKING_WEIGHTS) as AitRankingCriterion[]) {
    if (request[criterion]) {
      active[criterion] = AIT_RANKING_WEIGHTS[criterion]
        * ((criterion === 'distance' && request.nearest)
          || (criterion === 'budget' && request.cheapest)
          ? 2
          : 1)
    }
  }
  return active
}

export function rankAitCandidates<T extends Record<string, unknown>>(
  candidates: T[],
  request: AitRankingRequest,
): AitRankingResult<T> {
  const maxDistance = candidates.reduce((max, candidate) =>
    finiteNonNegative(candidate.distance_km) ? Math.max(max, candidate.distance_km) : max, 0)
  const configuredWeights = criteriaWeights(request)
  const scored = candidates.map((candidate, index) => {
    const components: Partial<Record<AitRankingCriterion, number>> = {}
    const omitted: AitRankingCriterion[] = []

    if (configuredWeights.distance !== undefined) {
      const score = distanceScore(candidate, request, maxDistance)
      if (score !== undefined) components.distance = score
      else omitted.push('distance')
    }
    if (configuredWeights.group_size !== undefined) {
      const capacity = candidate.max_participants ?? candidate.max_capacity
      if (typeof request.group_size_value === 'number' && request.group_size_value > 0
        && finiteNonNegative(capacity) && capacity > 0) {
        components.group_size = capacityScore(capacity, request.group_size_value)
      } else omitted.push('group_size')
    }
    if (configuredWeights.budget !== undefined) {
      if (typeof request.budget_per_person === 'number' && request.budget_per_person > 0
        && finiteNonNegative(candidate.price_per_person)) {
        components.budget = Math.max(0.2, 1 - candidate.price_per_person / request.budget_per_person)
      } else omitted.push('budget')
    }
    if (configuredWeights.date !== undefined) {
      if (candidate.date_available === true) components.date = 1
      else omitted.push('date')
    }

    const totalWeight = (Object.keys(components) as AitRankingCriterion[])
      .reduce((sum, criterion) => sum + (configuredWeights[criterion] ?? 0), 0)
    const normalizedWeights: Partial<Record<AitRankingCriterion, number>> = {}
    let totalScore: number | null = null
    if (totalWeight > 0) {
      for (const criterion of Object.keys(components) as AitRankingCriterion[]) {
        normalizedWeights[criterion] = (configuredWeights[criterion] ?? 0) / totalWeight
      }
      totalScore = (Object.keys(components) as AitRankingCriterion[])
        .reduce((sum, criterion) =>
          sum + components[criterion]! * normalizedWeights[criterion]!, 0)
    }

    return {
      candidate,
      index,
      score: totalScore,
      components,
      normalizedWeights,
      omitted,
    }
  })

  scored.sort((left, right) => {
    if (request.price_sort_without_budget || request.price_sort_direction) {
      const leftPrice = finiteNonNegative(left.candidate.price_per_person)
        ? left.candidate.price_per_person
        : Number.POSITIVE_INFINITY
      const rightPrice = finiteNonNegative(right.candidate.price_per_person)
        ? right.candidate.price_per_person
        : Number.POSITIVE_INFINITY
      if (leftPrice !== rightPrice) {
        return request.price_sort_direction === 'desc'
          ? rightPrice - leftPrice
          : leftPrice - rightPrice
      }
    }

    if (left.score === null || right.score === null) {
      if (left.score === null && right.score === null) return left.index - right.index
      return left.score === null ? 1 : -1
    }

    const scoreDifference = right.score - left.score
    if (Math.abs(scoreDifference) >= AIT_RANKING_TIE_EPSILON) return scoreDifference

    const leftFallback = left.candidate.location_source === 'district_fallback'
    const rightFallback = right.candidate.location_source === 'district_fallback'
    if (leftFallback !== rightFallback) return leftFallback ? 1 : -1
    return String(left.candidate.experience_id ?? left.candidate.village_id ?? left.index)
      .localeCompare(String(right.candidate.experience_id ?? right.candidate.village_id ?? right.index))
  })

  return {
    ranked: scored.map(({ candidate, score, components, normalizedWeights, omitted }, index) => ({
      ...candidate,
      ranking_score: score,
      score_components: components,
      normalized_weights: normalizedWeights,
      omitted_components: omitted,
      match_score: score === null ? null : Math.round(score * 1000) / 10,
      rank: index + 1,
    })),
  }
}
