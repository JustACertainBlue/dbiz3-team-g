import {
  filterCandidateByRadius,
  haversineDistanceKm,
  resolveOriginCoordinates,
} from './geo'

export interface LocationCoord {
  lat: number
  lng: number
  address?: string
}

export interface HardConstraintsInput {
  group_size?: number
  min_group_size?: number
  max_participants?: number
  max_budget_per_person?: number
  budget_per_person?: number
  target_date_or_range?: {
    start_date?: string
    end_date?: string
    date?: string
  }
  origin?: {
    address?: string
    lat?: number
    lng?: number
  }
  radius_km?: number
}

export interface RouteFeasibleCandidate {
  experience_id: string
  provider_id: string
  village_id?: string
  name?: string
  experience_name?: string
  category?: string
  experience_type?: string
  price_per_person: number | null
  max_participants: number | null
  distance_km?: number
  distance_source?: 'haversine'
  location_source?: 'from_plus_code' | 'district_fallback' | 'manual_gmaps' | 'approximate'
  radius_status?: 'confirmed' | 'unconfirmed'
  travel_time_minutes?: number
  location?: LocationCoord
  provider_verification_status?: string
  has_published_profile_version?: boolean
  [key: string]: any
}

export interface FilterResult extends Array<RouteFeasibleCandidate> {
  eligible_candidates: RouteFeasibleCandidate[]
}

export async function applyHardConstraints(
  candidates: any[],
  constraints: HardConstraintsInput
): Promise<FilterResult> {
  const reqGroupSize = constraints.group_size || constraints.min_group_size || 0
  const maxBudget = constraints.max_budget_per_person ?? constraints.budget_per_person

  const eligible: RouteFeasibleCandidate[] = []

  for (const c of candidates) {
    // 1. Capacity constraint
    if (reqGroupSize > 0 && c.max_participants != null && c.max_participants < reqGroupSize) {
      continue
    }

    // 2. Budget constraint
    if (maxBudget !== undefined && c.price_per_person != null && c.price_per_person > maxBudget) {
      continue
    }

    // 3. Route / Distance calculation
    const hasReviewedLocation = (
      c.location_source === 'from_plus_code'
      || c.location_source === 'district_fallback'
      || c.location_source === 'manual_gmaps'
      || c.location_source === 'approximate'
    )
    const distanceKm = hasReviewedLocation
      ? haversineDistanceKm(resolveOriginCoordinates(constraints.origin), c.location)
      : undefined
    const radiusKm = constraints.radius_km
    const hasRadius = typeof radiusKm === 'number'
      && Number.isFinite(radiusKm)
      && radiusKm > 0
    let radiusStatus: RouteFeasibleCandidate['radius_status']
    if (hasRadius) {
      const radiusDecision = filterCandidateByRadius({
        distance_km: distanceKm,
        distance_source: distanceKm !== undefined ? 'haversine' : undefined,
        location_source: c.location_source,
      }, radiusKm)
      if (!radiusDecision.include) {
        continue
      }
      radiusStatus = radiusDecision.status
    }

    eligible.push({
      ...c,
      max_capacity: c.max_capacity ?? c.max_participants,
      distance_km: distanceKm,
      distance_source: distanceKm !== undefined ? 'haversine' as const : undefined,
      ...(radiusStatus ? { radius_status: radiusStatus } : {}),
      travel_time_minutes: distanceKm !== undefined ? Math.round(distanceKm * 2.5) : undefined,
    })
  }

  const result = Object.assign([...eligible], {
    eligible_candidates: eligible,
  }) as FilterResult

  return result
}
