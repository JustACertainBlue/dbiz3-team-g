export interface ScoredCandidate {
  experience_id: string
  provider_id: string
  village_id?: string
  name?: string
  experience_name?: string
  provider_name?: string
  category?: string
  experience_type?: string
  price_per_person?: number
  distance_km?: number
  travel_time_minutes?: number
  match_score: number
  experience_fit_score: number
  rank?: number
  [key: string]: any
}

export async function scoreCandidate(
  candidate: any,
  profile: any
): Promise<ScoredCandidate> {
  const weights = profile?.preference_weights || {
    experience_fit: 0.4,
    route_convenience: 0.25,
    agency_preferences: 0.2,
    provider_quality: 0.15,
  }

  // 1. Experience Fit Score
  const matchingAttr = profile?.matching_attributes || []
  const requestedTypes = matchingAttr
    .filter((a: any) => a.type === 'experience_type')
    .map((a: any) => a.value)

  const candidateType = candidate.experience_type || candidate.category || ''
  let experienceFitScore = 70
  if (requestedTypes.length > 0) {
    if (requestedTypes.includes(candidateType)) {
      experienceFitScore = 95
    } else {
      experienceFitScore = 45
    }
  }

  // 2. Route Convenience Score (shorter distance -> higher score)
  const distanceKm = candidate.distance_km ?? 15
  const routeScore = Math.max(20, Math.min(100, 100 - distanceKm * 2))

  // 3. Agency Preferences Score
  const agencyPrefScore = (candidate.historical_agency_preference_weight ?? 0.8) * 100

  // 4. Provider Quality Score
  const qualityScore = (candidate.provider_quality_rating ?? 0.9) * 100

  // Weighted total match score
  const totalScore =
    experienceFitScore * (weights.experience_fit ?? 0.4) +
    routeScore * (weights.route_convenience ?? 0.25) +
    agencyPrefScore * (weights.agency_preferences ?? 0.2) +
    qualityScore * (weights.provider_quality ?? 0.15)

  const normalizedScore = Math.round(Math.max(0, Math.min(100, totalScore)) * 10) / 10

  return {
    ...candidate,
    match_score: normalizedScore,
    experience_fit_score: experienceFitScore,
  }
}

export async function rankCandidates(
  candidates: any[],
  profile: any
): Promise<ScoredCandidate[]> {
  const scored = await Promise.all(candidates.map(c => scoreCandidate(c, profile)))

  scored.sort((a, b) => b.match_score - a.match_score)

  return scored.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
  }))
}

export const scoreAndRankCandidates = rankCandidates
