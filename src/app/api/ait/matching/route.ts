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
import { getMatchingSession } from '@/lib/matching/session-service'
import { getVerifiedCandidates } from '@/lib/matching/candidate-repo'
import { rankCandidates } from '@/lib/matching/scoring-engine'
import {
  applyScoreThreshold,
  buildRelaxationSuggestions,
  explain,
} from '@/lib/matching/recommendation-service'
import { loadExperiences, loadBookings } from '@/lib/db/seed-loader'
import { getTestCandidates, getTestAllExperiences } from '@/lib/matching/test-dataset'
import { profileSchema } from '@/lib/ait/schemas'
import { applyHardFilters } from '@/lib/ait/constraints'
import { selectTiers, applyNullPenalty, resolveDisplayGroups } from '@/lib/ait/scoring'
import { buildMatchCard } from '@/lib/ait/card'

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

    // 2. Load bookings and apply hard filters (capacity, budget, dates, notice, exclusions)
    const bookings = await loadBookings()
    const candidateInputs = enrichedCandidates.map(c => ({
      id: c.experience_id,
      verification_status:
        c.provider_status === 'Verified' || c.provider_verification_status === 'Approved'
          ? ('verified' as const)
          : ('unverified' as const),
      published: c.has_published_profile_version,
      max_participants: c.max_participants ?? null,
      price_per_person: c.price_per_person ?? null,
      notice_period_hours: c.notice_period_hours ?? null,
      category: c.category,
      experience_type: c.experience_type || c.category,
      craft: c.craft_type || null,
      tags: c.tags || [],
    }))

    const hardFilterResult = applyHardFilters({
      candidates: candidateInputs,
      profile: rawProfile,
      bookings: bookings.map(b => ({
        experience_id: b.experience_id,
        start_at: b.start_at,
        end_at: b.end_at || b.start_at,
        status: b.status,
      })),
      now: Date.now(),
    })

    const passedIds = new Set(hardFilterResult.passed.map(p => p.id))
    const flagsMap = new Map(hardFilterResult.passed.map(p => [p.id, p.flags]))
    const eligible = enrichedCandidates.filter(c => passedIds.has(c.experience_id))

    // 3. No candidate left → relaxation suggestions (BR-011, FR-012, #23, #24)
    if (eligible.length === 0) {
      const budgetFree = enrichedCandidates.filter(c => {
        if (reqGroupSize > 0 && c.max_participants < reqGroupSize) return false
        return true
      })
      const budgetFreeRanked = await rankCandidates(budgetFree, rawProfile)
      const largestGroup = enrichedCandidates.reduce((max, c) => Math.max(max, Number(c.max_participants) || 0), 0)
      const relaxation = await buildRelaxationSuggestions(budgetFreeRanked, constraints, {
        largest_group_size: enrichedCandidates.length > 0 ? largestGroup : undefined,
      })
      return NextResponse.json({
        top_matches: [],
        additional_suggestions: [],
        relaxation_suggestions: {
          relaxation_suggestions: relaxation.relaxation_suggestions,
          conversation_prompt: relaxation.conversation_prompt,
        },
      })
    }

    // 4. Score + rank surviving candidates (FR-007) and apply null penalties
    const ranked = await rankCandidates(eligible, rawProfile)
    for (const c of ranked) {
      const flags = flagsMap.get(c.experience_id) || []
      c.flags = flags
      c.match_score = applyNullPenalty(c.match_score, flags)
    }

    // 5. Select tiers: selectTiers is the single place for drop < 40 and top/additional tiering
    const { top, additional } = selectTiers(
      ranked.map(c => ({ id: c.experience_id, score: c.match_score, flags: c.flags }))
    )

    const candMap = new Map(ranked.map(c => [c.experience_id, c]))

    // 6. Build match cards with buildMatchCard
    const buildCard = (expId: string, rankNum: number) => {
      const c = candMap.get(expId)!
      const matchFactors = c.match_factors || {}
      const factors: any = {}
      if (matchFactors.craft) {
        factors.craft = {
          matched: Boolean(matchFactors.craft.matched),
          value: matchFactors.craft.preference || matchFactors.craft.label || '',
        }
      }
      if (matchFactors.group_size !== undefined && c.max_participants != null) {
        factors.capacity = {
          matched: true,
          max: c.max_participants,
          group: matchFactors.group_size,
        }
      }
      if (matchFactors.budget_per_person !== undefined && c.price_per_person != null) {
        factors.budget = {
          matched: true,
          price: c.price_per_person,
          max: matchFactors.budget_per_person,
        }
      }
      if (c.distance_km != null) {
        factors.distance = { km: c.distance_km }
      }
      if (Array.isArray(c.tags) && c.tags.length > 0) {
        factors.tags = { matched: c.tags }
      }

      const card = buildMatchCard({
        candidate: {
          id: c.experience_id,
          provider_id: c.provider_id,
          name: c.name || c.experience_name || '',
          provider_name: c.provider_name || '',
          village_name: c.village_name || '',
          price_per_person: c.price_per_person ?? null,
          max_participants: c.max_participants ?? null,
          notice_period_hours: c.notice_period_hours ?? null,
          image_url: c.image_url ?? null,
          verification_status:
            c.provider_status === 'Verified' || c.provider_verification_status === 'Approved'
              ? 'verified'
              : 'from_source_only',
          tags: c.tags || [],
        },
        rank: rankNum,
        score: c.match_score,
        factors,
        sourceCount: c.source_count ?? null,
      })

      const expText = explain(c, c.match_score)

      return {
        ...card,
        explanation: expText,
        distance_km: c.distance_km,
        village_name: c.village_name || card.village_name,
        provider_name: c.provider_name || card.provider_name,
        price_per_person: c.price_per_person ?? card.price_per_person,
        max_participants: c.max_participants ?? card.max_participants,
        ...(isTest && c.image_url ? { image_url: c.image_url } : {}),
      }
    }

    const displayGroups = resolveDisplayGroups({ top, additional })
    const topMatches = displayGroups.primary.map((id, idx) => buildCard(id, idx + 1))
    const additionalMatches = displayGroups.secondary.map((id, idx) => buildCard(id, topMatches.length + idx + 1))

    return NextResponse.json({
      is_test: isTest,
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
