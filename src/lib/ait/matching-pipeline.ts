import { applyHardFilters } from './constraints'
import { buildMatchCard } from './card'
import type { ScoredCandidate } from '@/lib/matching/scoring-engine'
import { rankAitCandidates, type AitRankingCriterion } from './dynamic-ranking'
import { craftLabel, matchesCraftPreference } from '@/lib/matching/craft-taxonomy'
import {
  filterCandidateByRadius,
  haversineDistanceKm,
  originDisplayLabel,
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
  explicitCriteria?: Partial<Record<AitRankingCriterion, boolean>>
  bookings?: MatchingBooking[]
  operatingHours?: OperatingHoursRow[]
  villageNames?: ReadonlyMap<string, string>
  now?: number
}

export interface AitMatchingPipelineResult {
  eligibleCandidates: any[]
  rankedCandidates: AitRankedCandidate[]
  rejected: { id: string; reason: string }[]
  topMatches: ReturnType<typeof buildMatchCard>[]
  additionalMatches: ReturnType<typeof buildMatchCard>[]
}

export function prioritizeCraftCoverage<T>(
  rankedCandidates: T[],
  requestedCrafts: string[],
  candidateId: (candidate: T) => string,
  matchesCraft: (candidate: T, craft: string) => boolean,
): T[] {
  const selected: T[] = []
  const selectedIds = new Set<string>()

  for (const craft of [...new Set(requestedCrafts)]) {
    if (selected.length >= 5) break
    if (selected.some(candidate => matchesCraft(candidate, craft))) continue
    const candidate = rankedCandidates.find(item =>
      !selectedIds.has(candidateId(item)) && matchesCraft(item, craft),
    )
    if (!candidate) continue
    selected.push(candidate)
    selectedIds.add(candidateId(candidate))
  }

  const ordered = [...selected]
  const seenIds = new Set(selectedIds)
  for (const candidate of rankedCandidates) {
    const id = candidateId(candidate)
    if (seenIds.has(id)) continue
    ordered.push(candidate)
    seenIds.add(id)
  }
  return ordered
}

export interface AitRankedCandidate extends Omit<ScoredCandidate, 'match_score'> {
  match_score: number | null
  ranking_score: number | null
  score_components: Record<string, number>
  normalized_weights: Record<string, number>
  omitted_components: string[]
}

export function runVillageCardPipeline({
  cards,
  radiusKm,
  origin,
  distanceRequested,
}: {
  cards: VillageCardData[]
  radiusKm?: number
  origin?: unknown
  distanceRequested?: boolean
}): VillageCardData[] {
  const originCoordinates = resolveOriginCoordinates(origin)
  const eligibleCards = cards.flatMap((card) => {
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
  const ranked = rankAitCandidates(eligibleCards, {
    distance: distanceRequested ?? (radiusKm !== undefined || origin !== undefined),
    radius_km: radiusKm,
  }).ranked
  const cardsById = new Map(eligibleCards.map(card => [card.village_id, card]))
  return ranked.flatMap(card => {
    const original = cardsById.get(card.village_id)
    return original ? [original] : []
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

function cardFactors(candidate: AitRankedCandidate): Record<string, unknown> {
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

export async function runAitMatchingPipeline({
  candidates,
  profile,
  explicitCriteria,
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
  const rankingPreferences = profile?.ranking_preferences || {}
  const requestedPriceSort = priceSortDirection(profile)
    ?? (rankingPreferences.cheapest === true ? 'asc' : undefined)
  const distanceRequested = explicitCriteria?.distance
    ?? (hasExplicitOrigin || radiusRequested || rankingPreferences.nearest === true)
  const groupSizeRequested = explicitCriteria?.group_size
    ?? (typeof profile?.hard_constraints?.group_size === 'number')
  const budgetRequested = explicitCriteria?.budget
    ?? (typeof (profile?.hard_constraints?.max_budget_per_person
      ?? profile?.hard_constraints?.budget_per_person) === 'number')
  const dateRequested = explicitCriteria?.date
    ?? Boolean(profile?.hard_constraints?.target_date_or_range?.start_date)
  const distanceOriginLabel = originDisplayLabel(profile?.hard_constraints?.origin)
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
  const targetDate = profile?.hard_constraints?.target_date_or_range?.start_date
  const targetDateParts = typeof targetDate === 'string' ? targetDate.split('-').map(Number) : []
  const targetWeekday = targetDateParts.length === 3
    ? new Date(Date.UTC(targetDateParts[0], targetDateParts[1] - 1, targetDateParts[2])).getUTCDay() || 7
    : undefined
  const candidatesWithAvailability = eligibleCandidates.map(candidate => {
    const providerHours = targetWeekday === undefined
      ? []
      : operatingHours.filter(hours => hours.provider_id === candidate.provider_id)
    return {
      ...candidate,
      date_available: providerHours.length > 0
        && providerHours.some(hours => Number(hours.weekday) === targetWeekday),
    }
  })
  const ranking = rankAitCandidates(candidatesWithAvailability, {
    distance: distanceRequested,
    group_size: groupSizeRequested,
    budget: budgetRequested,
    date: dateRequested,
    nearest: rankingPreferences.nearest === true,
    cheapest: rankingPreferences.cheapest === true || requestedPriceSort === 'asc',
    radius_km: profile?.hard_constraints?.radius_km,
    group_size_value: profile?.hard_constraints?.group_size,
    budget_per_person: profile?.hard_constraints?.max_budget_per_person
      ?? profile?.hard_constraints?.budget_per_person,
    price_sort_without_budget: requestedPriceSort === 'asc' && !budgetRequested,
    price_sort_direction: !budgetRequested ? requestedPriceSort : undefined,
  })
  const rankedCandidates = ranking.ranked as AitRankedCandidate[]
  const craftAttributes = profile?.matching_attributes?.filter(
    (attribute: any) => attribute.type === 'craft_preference' && attribute.polarity !== 'exclude'
  ) ?? []
  const requestedTypes = profile?.matching_attributes
    ?.filter((attribute: any) => attribute.type === 'experience_type')
    .map((attribute: any) => attribute.value) ?? []

  for (const candidate of rankedCandidates) {
    const flags = flagsById.get(candidate.experience_id) || []
    candidate.flags = flags
    const candidateType = candidate.experience_type || candidate.category || ''
    candidate.match_factors = {
      craft: craftAttributes.length ? (() => {
        const matchedAttribute = craftAttributes.find((attribute: any) => matchesCraftPreference(attribute.value, {
          craft_type: candidate.craft_type,
          tags: candidate.tags,
        }))
        const attribute = matchedAttribute ?? craftAttributes[0]
        return {
          preference: attribute.value,
          label: craftLabel(attribute.value),
          matched: Boolean(matchedAttribute),
        }
      })() : undefined,
      experience_types: requestedTypes.length > 0
        ? { requested: requestedTypes, matched: requestedTypes.includes(candidateType) }
        : undefined,
      group_size: groupSizeRequested ? profile?.hard_constraints?.group_size : undefined,
      max_participants: candidate.max_participants ?? candidate.max_capacity,
      budget_per_person: budgetRequested
        ? profile?.hard_constraints?.max_budget_per_person
          ?? profile?.hard_constraints?.budget_per_person
        : undefined,
      price_per_person: candidate.price_per_person,
      distance_km: candidate.distance_source === 'haversine' ? candidate.distance_km : undefined,
      origin: profile?.hard_constraints?.origin?.origin_address
        || profile?.hard_constraints?.origin?.address,
    }
  }

  const prioritizedCandidates = prioritizeCraftCoverage(
    rankedCandidates,
    craftAttributes.map((attribute: any) => String(attribute.value)),
    candidate => candidate.experience_id,
    (candidate, craft) => matchesCraftPreference(craft, {
      craft_type: candidate.craft_type,
      tags: candidate.tags,
    }),
  )
  const candidatesById = new Map(prioritizedCandidates.map((candidate) => [candidate.experience_id, candidate]))
  const primaryIds = prioritizedCandidates.slice(0, 5).map(candidate => candidate.experience_id)
  const secondaryIds = prioritizedCandidates.slice(5).map(candidate => candidate.experience_id)

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
