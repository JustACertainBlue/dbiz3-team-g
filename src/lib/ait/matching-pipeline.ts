import { applyHardFilters } from './constraints'
import { applyNullPenalty, resolveDisplayGroups, selectTiers } from './scoring'
import { buildMatchCard } from './card'
import { rankCandidates, type ScoredCandidate } from '@/lib/matching/scoring-engine'
import {
  filterCandidateByRadius,
  haversineDistanceKm,
  resolveOriginCoordinates,
} from '@/lib/matching/geo'
import type { VillageCardData } from '@/lib/matching/card-resolver'
import {
  DEFAULT_VILLAGE_COORDINATE_LOOKUP,
  resolveVillageCoordinate,
} from '@/lib/matching/village-coordinate-lookup'

interface OperatingHoursRow {
  provider_id: string
  weekday: string | number
  local_start: string
  local_end: string
}

interface MatchingBooking {
  experience_id: string
  start_at: string
  end_at: string
  status: string
}

export interface AitMatchingPipelineInput {
  candidates: any[]
  profile: any
  bookings?: MatchingBooking[]
  operatingHours?: OperatingHoursRow[]
  villageNames?: ReadonlyMap<string, string>
  now?: number
}

export interface AitMatchingPipelineResult {
  eligibleCandidates: any[]
  rankedCandidates: ScoredCandidate[]
  rejected: { id: string; reason: string }[]
  topMatches: ReturnType<typeof buildMatchCard>[]
  additionalMatches: ReturnType<typeof buildMatchCard>[]
}

export function runVillageCardPipeline({
  cards,
  radiusKm,
  origin,
}: {
  cards: VillageCardData[]
  radiusKm?: number
  origin?: unknown
}): VillageCardData[] {
  const originCoordinates = resolveOriginCoordinates(origin)
  return cards.flatMap((card) => {
    const assignment = resolveVillageCoordinate(
      { id: card.village_id, name: card.name },
      DEFAULT_VILLAGE_COORDINATE_LOOKUP,
    )
    const distanceKm = assignment?.location && originCoordinates
      ? haversineDistanceKm(originCoordinates, assignment.location)
      : undefined
    const distanceSource = distanceKm !== undefined ? 'haversine' as const : undefined
    const radiusDecision = filterCandidateByRadius({
      distance_km: distanceKm,
      distance_source: distanceSource,
      location_source: assignment?.location_source,
    }, radiusKm)
    if (!radiusDecision.include) return []

    return [{
      ...card,
      distance_km: distanceKm ?? null,
      ...(distanceSource ? { distance_source: distanceSource } : {}),
      ...(assignment?.location_source ? { location_source: assignment.location_source } : {}),
      ...(radiusDecision.status ? { radius_status: radiusDecision.status } : {}),
    }]
  })
}

export function priceSortDirection(profile: any): 'asc' | 'desc' | undefined {
  const attribute = profile?.matching_attributes?.find(
    (item: any) => item.type === 'price_sort' || item.type === 'price_preference'
  )?.value
  const sort = profile?.price_sort || attribute
  if (['asc', 'lowest', 'cheapest'].includes(sort)) return 'asc'
  if (['desc', 'highest', 'premium'].includes(sort)) return 'desc'
  return undefined
}

function cardFactors(candidate: ScoredCandidate): Record<string, unknown> {
  const matchFactors = candidate.match_factors || {}
  const factors: Record<string, any> = {}

  if (matchFactors.craft) {
    factors.craft = {
      matched: Boolean(matchFactors.craft.matched),
      value: matchFactors.craft.preference || matchFactors.craft.label || '',
    }
  }
  if (matchFactors.experience_types) {
    factors.experience_type = {
      matched: Boolean(matchFactors.experience_types.matched),
      requested: matchFactors.experience_types.requested,
      value: candidate.experience_type || candidate.category || '',
    }
  }
  if (matchFactors.group_size !== undefined && candidate.max_participants != null) {
    factors.capacity = {
      matched: true,
      max: candidate.max_participants,
      group: matchFactors.group_size,
    }
  }
  if (matchFactors.budget_per_person !== undefined && candidate.price_per_person != null) {
    factors.budget = {
      matched: true,
      price: candidate.price_per_person,
      max: matchFactors.budget_per_person,
    }
  }
  if (candidate.distance_source === 'haversine' && candidate.distance_km != null) {
    factors.distance = { km: candidate.distance_km }
  }
  if (candidate.flags?.includes('radius_unconfirmed')) {
    factors.radius_unconfirmed = true
  }
  if (Array.isArray(candidate.tags) && candidate.tags.length > 0) {
    factors.tags = { matched: candidate.tags }
  }

  return factors
}

function sortByRequestedPrice(
  ids: string[],
  candidates: Map<string, ScoredCandidate>,
  direction: 'asc' | 'desc'
): string[] {
  return [...ids].sort((leftId, rightId) => {
    const left = candidates.get(leftId)!
    const right = candidates.get(rightId)!
    const leftPrice = left.price_per_person
    const rightPrice = right.price_per_person
    if (leftPrice == null || rightPrice == null) {
      if (leftPrice == null && rightPrice == null) return right.match_score - left.match_score
      return leftPrice == null ? 1 : -1
    }
    if (leftPrice !== rightPrice) {
      return direction === 'desc' ? rightPrice - leftPrice : leftPrice - rightPrice
    }
    return right.match_score - left.match_score
  })
}

export async function runAitMatchingPipeline({
  candidates,
  profile,
  bookings = [],
  operatingHours = [],
  villageNames,
  now = Date.now(),
}: AitMatchingPipelineInput): Promise<AitMatchingPipelineResult> {
  const originCoordinates = resolveOriginCoordinates(profile?.hard_constraints?.origin)
  const hasExplicitOrigin = Boolean(
    profile?.hard_constraints?.origin?.origin_address
    || profile?.hard_constraints?.origin?.address
    || profile?.hard_constraints?.origin?.lat != null
    || typeof profile?.hard_constraints?.origin === 'string',
  )
  const radiusRequested = typeof profile?.hard_constraints?.radius_km === 'number'
    && profile.hard_constraints.radius_km > 0
  const distanceRequested = hasExplicitOrigin || radiusRequested
  const distanceOriginLabel = !hasExplicitOrigin
    ? 'trung tâm Hà Nội (Hồ Gươm, mặc định)'
    : undefined
  const enrichedCandidates = candidates.map((candidate) => {
    const distanceKm = (
      candidate.location_source === 'from_plus_code'
      || candidate.location_source === 'district_fallback'
      || candidate.location_source === 'manual_gmaps'
      || candidate.location_source === 'approximate'
    )
      ? haversineDistanceKm(originCoordinates, candidate.location)
      : undefined

    return {
      ...candidate,
      distance_km: distanceKm,
      distance_source: distanceKm !== undefined ? 'haversine' : undefined,
      distance_requested: distanceRequested,
      distance_origin_label: distanceOriginLabel,
      village_name:
        candidate.village_name
        || (candidate.village_id ? villageNames?.get(candidate.village_id) : undefined)
        || candidate.experience_location_address?.split(',')[1]?.trim()
        || '',
      provider_name: candidate.provider_name || '',
      tags: candidate.tags || [],
    }
  })
  const hardFilterResult = applyHardFilters({
    candidates: enrichedCandidates.map((candidate) => ({
      ...candidate,
      id: candidate.experience_id,
      verification_status:
        candidate.provider_status === 'Verified'
        || candidate.provider_verification_status === 'Approved'
          ? 'verified'
          : 'unverified',
      published: candidate.has_published_profile_version === true,
      experience_type: candidate.experience_type || candidate.category,
      craft: candidate.craft_type || null,
    })),
    profile,
    bookings,
    operatingHours,
    now,
  })
  const flagsById = new Map(hardFilterResult.passed.map(({ id, flags }) => [id, flags]))
  const eligibleCandidates = enrichedCandidates.filter((candidate) =>
    flagsById.has(candidate.experience_id)
  )
  const rankedCandidates = await rankCandidates(eligibleCandidates, profile)

  for (const candidate of rankedCandidates) {
    const flags = flagsById.get(candidate.experience_id) || []
    candidate.flags = flags
    candidate.match_score = applyNullPenalty(candidate.match_score, flags)
  }

  const tiers = selectTiers(
    rankedCandidates.map((candidate) => ({
      id: candidate.experience_id,
      score: candidate.match_score,
      flags: candidate.flags,
    }))
  )
  const groups = resolveDisplayGroups(tiers)
  let primaryIds = groups.primary
  let secondaryIds = groups.secondary
  const requestedPriceSort = priceSortDirection(profile)
  const candidatesById = new Map(rankedCandidates.map((candidate) => [candidate.experience_id, candidate]))

  if (requestedPriceSort) {
    const sortedIds = sortByRequestedPrice(
      [...primaryIds, ...secondaryIds],
      candidatesById,
      requestedPriceSort
    )
    const pricedIds = sortedIds.filter((id) => candidatesById.get(id)?.price_per_person != null)
    const unknownPriceIds = sortedIds.filter((id) => candidatesById.get(id)?.price_per_person == null)
    primaryIds = pricedIds.slice(0, 5)
    secondaryIds = [...pricedIds.slice(5), ...unknownPriceIds]
  }

  const buildCards = (ids: string[], rankOffset: number) => ids.map((id, index) => {
    const candidate = candidatesById.get(id)!
    return buildMatchCard({
      candidate: {
        id: candidate.experience_id,
        provider_id: candidate.provider_id,
        name: candidate.name || candidate.experience_name || '',
        provider_name: candidate.provider_name || '',
        village_name: candidate.village_name || '',
        price_per_person: candidate.price_per_person ?? null,
        distance_km: candidate.distance_source === 'haversine' ? candidate.distance_km ?? null : null,
        ...(candidate.distance_source === 'haversine' ? { distance_source: 'haversine' as const } : {}),
        ...(candidate.distance_source === 'haversine' ? { location_source: candidate.location_source } : {}),
        ...(candidate.distance_requested ? { distance_requested: true } : {}),
        ...(candidate.distance_origin_label ? { distance_origin_label: candidate.distance_origin_label } : {}),
        ...(radiusRequested ? {
          radius_status: candidate.flags?.includes('radius_unconfirmed')
            ? 'unconfirmed' as const
            : 'confirmed' as const,
        } : {}),
        max_participants: candidate.max_participants ?? null,
        notice_period_hours: candidate.notice_period_hours ?? null,
        image_url: candidate.image_url ?? null,
        verification_status:
          candidate.provider_status === 'Verified'
          || candidate.provider_verification_status === 'Approved'
            ? 'verified'
            : 'from_source_only',
        tags: candidate.tags || [],
      },
      rank: rankOffset + index + 1,
      score: candidate.match_score,
      factors: cardFactors(candidate),
      sourceCount: candidate.source_count ?? null,
    })
  })

  const topMatches = buildCards(primaryIds, 0)
  const additionalMatches = buildCards(secondaryIds, topMatches.length)

  return {
    eligibleCandidates,
    rankedCandidates,
    rejected: hardFilterResult.rejected,
    topMatches,
    additionalMatches,
  }
}
