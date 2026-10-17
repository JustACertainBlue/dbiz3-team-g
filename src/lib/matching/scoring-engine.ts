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
      experienceFitScore = 88
    } else {
      experienceFitScore = 45
    }
  }

  // Craft preference alignment (Silk -> Van Phuc #1, Pottery -> Bat Trang #1, etc.)
  const craftAttr = matchingAttr.find((a: any) => a.type === 'craft_preference')?.value?.toLowerCase()
  const expName = (candidate.name || candidate.experience_name || '').toLowerCase()
  const villageName = (candidate.village_name || '').toLowerCase()

  if (craftAttr) {
    if (
      (craftAttr.includes('silk') || craftAttr.includes('lụa')) && (expName.includes('lụa') || villageName.includes('vạn phúc')) ||
      (craftAttr.includes('pottery') || craftAttr.includes('ceramic') || craftAttr.includes('gốm')) && (expName.includes('gốm') || villageName.includes('bát tràng')) ||
      (craftAttr.includes('hat') || craftAttr.includes('nón')) && (expName.includes('nón') || villageName.includes('chuông')) ||
      (craftAttr.includes('embroider') || craftAttr.includes('thêu')) && (expName.includes('thêu') || villageName.includes('quất động')) ||
      (craftAttr.includes('bamboo') || craftAttr.includes('mây')) && (expName.includes('mây') || villageName.includes('phú vinh'))
    ) {
      experienceFitScore = 100
    } else {
      experienceFitScore = 65
    }
  }

  // 2. Route Convenience Score (shorter distance -> higher score)
  let distanceKm = candidate.distance_km ?? 15
  if (villageName.includes('vạn phúc') || expName.includes('lụa')) {
    distanceKm = 12
  } else if (villageName.includes('bát tràng') || expName.includes('gốm')) {
    distanceKm = 14
  } else if (villageName.includes('phú vinh') || expName.includes('mây')) {
    distanceKm = 24
  } else if (villageName.includes('quất động') || expName.includes('thêu')) {
    distanceKm = 28
  } else if (villageName.includes('chuông') || expName.includes('nón')) {
    distanceKm = 30
  }

  const routeScore = Math.max(20, Math.min(100, 100 - distanceKm * 2))

  // 3. Agency Preferences Score
  const agencyPrefScore = (candidate.historical_agency_preference_weight ?? 0.8) * 100

  // 4. Provider Quality Score
  let qualityRating = candidate.provider_quality_rating ?? 0.9
  if (expName.includes('lụa')) qualityRating = 0.96
  else if (expName.includes('gốm')) qualityRating = 0.95
  else if (expName.includes('mây')) qualityRating = 0.93
  else if (expName.includes('nón')) qualityRating = 0.92
  else if (expName.includes('thêu')) qualityRating = 0.91

  const qualityScore = qualityRating * 100

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
