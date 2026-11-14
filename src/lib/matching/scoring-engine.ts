import { craftLabel, craftTypeForPreference } from '@/lib/matching/craft-taxonomy'

export interface MatchFactors {
  craft?: { preference: string; label: string; craft_type?: string; matched: boolean }
  experience_types?: { requested: string[]; matched: boolean }
  group_size?: number
  max_participants?: number
  budget_per_person?: number
  price_per_person?: number
  distance_km?: number
  origin?: string
}

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

  // Craft preference alignment by the Provider's published craft_type (#26, #32)
  const craftAttr = matchingAttr.find((a: any) => a.type === 'craft_preference')?.value?.toLowerCase()
  const expName = (candidate.name || candidate.experience_name || '').toLowerCase()
  const villageName = (candidate.village_name || '').toLowerCase()
  const wantedCraftType = craftAttr ? craftTypeForPreference(craftAttr) : undefined
  const craftMatched = Boolean(wantedCraftType) && candidate.craft_type === wantedCraftType

  if (craftAttr) {
    const baseFit = craftMatched ? 100 : 65
    if (requestedTypes.length > 0) {
      if (requestedTypes.includes(candidateType)) {
        experienceFitScore = baseFit
      } else if (requestedTypes.includes('Workshop/Hands-on') && candidateType === 'Sightseeing') {
        experienceFitScore = Math.min(baseFit - 45, 50)
      } else {
        experienceFitScore = Math.min(baseFit - 25, 65)
      }
    } else {
      experienceFitScore = baseFit
    }
  } else if (requestedTypes.length > 0) {
    if (requestedTypes.includes(candidateType)) {
      experienceFitScore = 88
    } else if (requestedTypes.includes('Workshop/Hands-on') && candidateType === 'Sightseeing') {
      experienceFitScore = 35
    } else {
      experienceFitScore = 45
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

  // Factors actually evaluated for this candidate; the explanation is built from these only (#25).
  const hard = profile?.hard_constraints || {}
  const matchFactors: MatchFactors = {
    craft: craftAttr ? { preference: craftAttr, label: craftLabel(craftAttr), craft_type: wantedCraftType, matched: craftMatched } : undefined,
    experience_types: requestedTypes.length > 0 ? { requested: requestedTypes, matched: requestedTypes.includes(candidateType) } : undefined,
    group_size: hard.group_size,
    max_participants: candidate.max_participants ?? candidate.max_capacity,
    budget_per_person: hard.max_budget_per_person,
    price_per_person: candidate.price_per_person,
    distance_km: distanceKm,
    origin: hard.origin?.origin_address,
  }

  return {
    ...candidate,
    match_score: normalizedScore,
    experience_fit_score: experienceFitScore,
    match_factors: matchFactors,
  }
}

export async function rankCandidates(
  candidates: any[],
  profile: any
): Promise<ScoredCandidate[]> {
  const scored = await Promise.all(candidates.map(c => scoreCandidate(c, profile)))

  const matchingAttr = profile?.matching_attributes || []
  const priceSortAttr = matchingAttr.find((a: any) => a.type === 'price_sort' || a.type === 'price_preference')?.value
  const priceSort = profile?.price_sort || priceSortAttr

  if (priceSort === 'asc' || priceSort === 'lowest' || priceSort === 'cheapest') {
    // Sort from cheapest to highest; for identical price, sort by match_score descending
    scored.sort((a, b) => {
      const priceA = typeof a.price_per_person === 'number' ? a.price_per_person : 120000
      const priceB = typeof b.price_per_person === 'number' ? b.price_per_person : 120000
      if (priceA !== priceB) {
        return priceA - priceB
      }
      return b.match_score - a.match_score
    })
  } else if (priceSort === 'desc' || priceSort === 'highest' || priceSort === 'premium') {
    // Sort from highest to cheapest; for identical price, sort by match_score descending
    scored.sort((a, b) => {
      const priceA = typeof a.price_per_person === 'number' ? a.price_per_person : 120000
      const priceB = typeof b.price_per_person === 'number' ? b.price_per_person : 120000
      if (priceA !== priceB) {
        return priceB - priceA
      }
      return b.match_score - a.match_score
    })
  } else {
    scored.sort((a, b) => b.match_score - a.match_score)
  }

  return scored.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
  }))
}

export const scoreAndRankCandidates = rankCandidates
