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
}

export interface RouteFeasibleCandidate {
  experience_id: string
  provider_id: string
  village_id?: string
  name?: string
  experience_name?: string
  category?: string
  experience_type?: string
  price_per_person: number
  max_participants: number
  distance_km: number
  travel_time_minutes: number
  location?: LocationCoord
  provider_verification_status?: string
  has_published_profile_version?: boolean
  [key: string]: any
}

export interface FilterResult extends Array<RouteFeasibleCandidate> {
  eligible_candidates: RouteFeasibleCandidate[]
}

function calculateDistance(
  loc1?: LocationCoord,
  loc2?: { lat?: number; lng?: number }
): { distance_km: number; travel_time_minutes: number } {
  if (!loc1 || !loc2 || loc1.lat === undefined || loc2.lat === undefined) {
    return { distance_km: 15, travel_time_minutes: 35 }
  }

  const dLat = Math.abs(loc1.lat - (loc2.lat || 0))
  const dLng = Math.abs(loc1.lng - (loc2.lng || 0))
  // Approximate distance in km for Hanoi region
  const approxKm = Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 111)
  const dist = approxKm > 0 ? approxKm : 10
  const time = Math.round(dist * 2.5) // ~25-30 km/h average traffic

  return { distance_km: dist, travel_time_minutes: time }
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
    if (reqGroupSize > 0 && c.max_participants < reqGroupSize) {
      continue
    }

    // 2. Budget constraint
    if (maxBudget !== undefined && c.price_per_person > maxBudget) {
      continue
    }

    // 3. Route / Distance calculation
    const route = calculateDistance(c.location, constraints.origin)

    eligible.push({
      ...c,
      max_capacity: c.max_capacity ?? c.max_participants,
      distance_km: c.distance_km ?? route.distance_km,
      travel_time_minutes: c.travel_time_minutes ?? route.travel_time_minutes,
    })
  }

  const result = Object.assign([...eligible], {
    eligible_candidates: eligible,
  }) as FilterResult

  return result
}
