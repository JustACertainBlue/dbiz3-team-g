import { haversineDistanceKm, resolveOriginCoordinates } from './geo'

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
    const distanceKm = haversineDistanceKm(c.location, resolveOriginCoordinates(constraints.origin))
    if (
      distanceKm !== undefined
      && typeof constraints.radius_km === 'number'
      && Number.isFinite(constraints.radius_km)
      && constraints.radius_km > 0
      && distanceKm > constraints.radius_km
    ) {
      continue
    }

    eligible.push({
      ...c,
      max_capacity: c.max_capacity ?? c.max_participants,
      distance_km: distanceKm,
      distance_source: distanceKm !== undefined ? 'haversine' as const : undefined,
      travel_time_minutes: distanceKm !== undefined ? Math.round(distanceKm * 2.5) : undefined,
    })
  }

  const result = Object.assign([...eligible], {
    eligible_candidates: eligible,
  }) as FilterResult

  return result
}
