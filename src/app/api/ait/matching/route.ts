/**
 * POST /api/ait/matching
 *
 * Runs the AI Tour Matching pipeline per D.1(b):
 *   validate profileSchema → applyHardFilters (kèm bookings) → rankCandidates
 *   → applyNullPenalty → selectTiers → buildMatchCard
 *
 * If no candidates survive the hard-constraint filter the response contains
 * relaxation_suggestions instead of top_matches (BR-011, BR-020).
 *
 * Body: { session_id?: string, tour_preference_profile: TourPreferenceProfile }
 */
import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import {
  getMatchingSession,
  updateMatchingSessionContext,
} from '@/lib/matching/session-service'
import { getVerifiedCandidates } from '@/lib/matching/candidate-repo'
import { rankCandidates } from '@/lib/matching/scoring-engine'
import {
  applyScoreThreshold,
  buildRelaxationSuggestions,
  explain,
} from '@/lib/matching/recommendation-service'
import { loadExperiences, loadBookings, loadVillages } from '@/lib/db/seed-loader'
import { getTestCandidates, getTestAllExperiences } from '@/lib/matching/test-dataset'
import { profileSchema } from '@/lib/ait/schemas'
import { villageStartingPrices } from '@/lib/village-starting-price'
import { eligibleVillageStartingPrices } from '@/lib/explore/catalog'
import { loadExploreRuntime } from '@/lib/explore/seed-repository'
import { loadOperatingHours } from '@/lib/prf/seed-reader'
import { runAitMatchingPipeline } from '@/lib/ait/matching-pipeline'
import { matchingContextResults } from '@/lib/ait/match-reasons'
import { originDisplayNotice } from '@/lib/matching/geo'

export async function POST(request: Request) {
  try {
    // Authorize before reading the body (D.1 contract: authorize → validate → read/write).
    const actor = await sessionContextFromRequest(request)
    if (!actor.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (actor.role !== 'Tour_Agency' || !actor.agencyId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    if (body.session_id) {
      const matchingSession = await getMatchingSession(body.session_id)
      if (!matchingSession || matchingSession.agency_id !== actor.agencyId) {
        return NextResponse.json({ error: 'Matching session access denied' }, { status: 403 })
      }
    }
    const rawProfile = body.tour_preference_profile

    if (!rawProfile) {
      return NextResponse.json(
        { error: 'tour_preference_profile is required' },
        { status: 400 }
      )
    }

    // 1. Validate profile with profileSchema (D.1 b)
    const profileValidation = profileSchema.safeParse(rawProfile)
    if (!profileValidation.success) {
      return NextResponse.json(
        { error: 'Invalid tour_preference_profile', issues: profileValidation.error.issues },
        { status: 400 }
      )
    }

    const isTest = body.is_test === true || rawProfile.is_test === true

    // Retrieve candidates
    const rawCandidates = isTest
      ? getTestCandidates(rawProfile)
      : await getVerifiedCandidates(rawProfile)

    // Enrich candidates with village_name for display
    const allExperiences = isTest
      ? getTestAllExperiences()
      : await loadExperiences()
    const expMap = new Map(allExperiences.map(e => [e.experience_id, e]))
    const villagePrices = isTest
      ? villageStartingPrices(allExperiences)
      : eligibleVillageStartingPrices(await loadExploreRuntime())

    const enrichedCandidates = rawCandidates.map(c => {
      const exp = expMap.get(c.experience_id)
      let village_name = c.village_name || (exp?.experience_location_address?.split(',')[1]?.trim() ?? '')
      return {
        ...c,
        village_name,
        provider_name: c.provider_name || exp?.provider_name || '',
        tags: c.tags || exp?.tags || [],
        experience_location_address: exp?.experience_location_address || c.experience_location_address || '',
        source_count: c.source_count ?? exp?.source_count ?? null,
      }
    })

    const constraints = rawProfile.hard_constraints || {}
    const reqGroupSize = constraints.group_size || 0
    const originNotice = originDisplayNotice(constraints.origin)

    // Both matching routes use the same hard filters, ranking and card builder.
    const [bookings, operatingHours, villages] = await Promise.all([
      loadBookings(),
      loadOperatingHours(),
      loadVillages(),
    ])
    const matching = await runAitMatchingPipeline({
      candidates: enrichedCandidates,
      profile: rawProfile,
      bookings: bookings.map(b => ({
        experience_id: b.experience_id,
        start_at: b.start_at,
        end_at: b.end_at || b.start_at,
        status: b.status,
      })),
      operatingHours,
      villageNames: new Map(villages.map(village => [village.village_id, village.village_name])),
    })

    // 3. No candidate left → relaxation suggestions (BR-011, FR-012, #23, #24)
    if (matching.eligibleCandidates.length === 0) {
      if (
        typeof constraints.radius_km === 'number'
        && matching.rejected.some(({ reason }) => reason === 'radius')
      ) {
        const origin = constraints.origin?.origin_address || constraints.origin?.address
        const from = typeof origin === 'string' ? ` tính từ ${origin}` : ''
        if (body.session_id) {
          await updateMatchingSessionContext(
            body.session_id,
            matchingContextResults([], JSON.stringify(rawProfile.matching_attributes ?? []))
          )
        }
        return NextResponse.json({
          is_test: isTest,
          origin_notice: originNotice,
          top_matches: [],
          additional_suggestions: [],
          relaxation_suggestions: {
            relaxation_suggestions: [],
            conversation_prompt:
            `Không tìm thấy trải nghiệm nào phù hợp trong bán kính ${constraints.radius_km} km${from}. Mình không tự mở rộng bán kính.`,
          },
        })
      }

      const budgetFree = enrichedCandidates.filter(c => {
        if (reqGroupSize > 0 && c.max_participants != null && c.max_participants < reqGroupSize) return false
        return true
      })
      const budgetFreeRanked = await rankCandidates(budgetFree, rawProfile)
      const largestGroup = enrichedCandidates.reduce((max, c) => Math.max(max, Number(c.max_participants) || 0), 0)
      const relaxation = await buildRelaxationSuggestions(budgetFreeRanked, constraints, {
        largest_group_size: enrichedCandidates.length > 0 ? largestGroup : undefined,
      })
      if (body.session_id) {
        await updateMatchingSessionContext(
          body.session_id,
          matchingContextResults([], JSON.stringify(rawProfile.matching_attributes ?? []))
        )
      }
      return NextResponse.json({
        origin_notice: originNotice,
        top_matches: [],
        additional_suggestions: [],
        relaxation_suggestions: {
          relaxation_suggestions: relaxation.relaxation_suggestions,
          conversation_prompt: relaxation.conversation_prompt,
        },
      })
    }

    const rankedById = new Map(matching.rankedCandidates.map(candidate => [candidate.experience_id, candidate]))
    const addRouteDetails = (card: (typeof matching.topMatches)[number]) => {
      const candidate = rankedById.get(card.experience_id)!
      return {
        ...card,
        explanation: explain(candidate, candidate.match_score),
        distance_km: candidate.distance_source === 'haversine' ? candidate.distance_km : null,
        ...(candidate.distance_source === 'haversine' ? { distance_source: 'haversine' as const } : {}),
        village_name: candidate.village_name || card.village_name,
        provider_name: candidate.provider_name || card.provider_name,
        price_per_person: candidate.price_per_person ?? card.price_per_person,
        max_participants: candidate.max_participants ?? card.max_participants,
        village_starting_price: candidate.village_id ? villagePrices.get(candidate.village_id) ?? null : null,
        ...(isTest && candidate.image_url ? { image_url: candidate.image_url } : {}),
      }
    }
    const topMatches = matching.topMatches.map(addRouteDetails)
    const additionalMatches = matching.additionalMatches.map(addRouteDetails)
    if (body.session_id) {
      await updateMatchingSessionContext(
        body.session_id,
        matchingContextResults(
          [...topMatches, ...additionalMatches],
          JSON.stringify(rawProfile.matching_attributes ?? [])
        )
      )
    }

    return NextResponse.json({
      is_test: isTest,
      origin_notice: originNotice,
      top_matches: topMatches,
      additional_suggestions: additionalMatches,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal error during matching' },
      { status: 500 }
    )
  }
}
