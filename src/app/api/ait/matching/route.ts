/**
 * POST /api/ait/matching
 *
 * Runs the real AI Tour Matching pipeline:
 *   getVerifiedCandidates → applyHardConstraints → rankCandidates → buildRecommendations
 *
 * If no candidates survive the hard-constraint filter (capacity, budget) the response
 * contains relaxation_suggestions instead of top_matches (BR-011, BR-020).
 *
 * Body: { session_id?: string, tour_preference_profile: TourPreferenceProfile }
 */
import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { getMatchingSession } from '@/lib/matching/session-service'
import { getVerifiedCandidates } from '@/lib/matching/candidate-repo'
import { applyHardConstraints } from '@/lib/matching/constraint-engine'
import { rankCandidates } from '@/lib/matching/scoring-engine'
import {
  applyScoreThreshold,
  buildRecommendations,
  buildRelaxationSuggestions,
} from '@/lib/matching/recommendation-service'
import { loadExperiences } from '@/lib/db/seed-loader'
import { loadExploreRuntime } from '@/lib/explore/seed-repository'
import { matchingCardView, profileGuests } from '@/lib/matching/card-data'

export async function POST(request: Request) {
  try {
    // Authorize before reading the body (contract: authorize → validate → read/write).
    const actor = (await sessionContextFromRequest(request))
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
    const profile = body.tour_preference_profile

    if (!profile) {
      return NextResponse.json(
        { error: 'tour_preference_profile is required' },
        { status: 400 }
      )
    }

    // 1. Retrieve verified candidates from seed catalog (BR-003)
    const rawCandidates = await getVerifiedCandidates(profile)

    // Enrich candidates with village_name for display (look up from experience location)
    const allExperiences = await loadExperiences()
    const expMap = new Map(allExperiences.map(e => [e.experience_id, e]))

    const enrichedCandidates = rawCandidates.map(c => {
      const exp = expMap.get(c.experience_id)
      // Derive village name from experience_location_address (last 2 segments before city)
      let village_name = exp?.experience_location_address?.split(',')[1]?.trim() ?? ''
      return { ...c, village_name, provider_name: c.provider_name || '' }
    })

    // 2. Apply hard constraints: capacity + budget (BR-005)
    const constraints = profile.hard_constraints || {}
    const filtered = await applyHardConstraints(enrichedCandidates, constraints)
    const eligible = filtered.eligible_candidates

    // 3. Score + rank surviving candidates (FR-007) and drop those below 60/100 (BR-020, #30)
    const ranked = applyScoreThreshold(await rankCandidates(eligible, profile))

    // 4. No candidate left → relaxation suggestions (BR-011, FR-012, #23, #24)
    if (ranked.length === 0) {
      const { max_budget_per_person: _budget, budget_per_person: _legacyBudget, ...withoutBudget } = constraints
      const budgetFree = await applyHardConstraints(enrichedCandidates, withoutBudget)
      const budgetFreeRanked = await rankCandidates(budgetFree.eligible_candidates, profile)
      const largestGroup = enrichedCandidates.reduce((max, c) => Math.max(max, Number(c.max_participants) || 0), 0)
      const relaxation = await buildRelaxationSuggestions(budgetFreeRanked, constraints, {
        largest_group_size: enrichedCandidates.length > 0 ? largestGroup : undefined,
      })
      return NextResponse.json({
        top_matches: [],
        relaxation_suggestions: {
          relaxation_suggestions: relaxation.relaxation_suggestions,
          conversation_prompt: relaxation.conversation_prompt,
        },
      })
    }

    // 5. Build recommendation output (FR-008, BR-007, #25)
    const recs = await buildRecommendations(ranked)

    // Screen 22: card data of screen 02 added to every recommendation (additive; no existing field changes).
    const exploreSeed = await loadExploreRuntime()
    const withCard = <T extends { experience_id: string }>(m: T) => ({ ...m, card: matchingCardView(exploreSeed, m.experience_id, profileGuests(profile)) })

    return NextResponse.json({
      top_matches: recs.top_matches.map(m => withCard({
        ...m,
        // Carry through display fields
        village_name: ranked.find(r => r.experience_id === m.experience_id)?.village_name ?? '',
        price_per_person: ranked.find(r => r.experience_id === m.experience_id)?.price_per_person,
        max_participants: ranked.find(r => r.experience_id === m.experience_id)?.max_participants,
        provider_name: ranked.find(r => r.experience_id === m.experience_id)?.provider_name ?? '',
      })),
      additional_suggestions: recs.additional_suggestions.map(withCard),
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal error during matching' },
      { status: 500 }
    )
  }
}
