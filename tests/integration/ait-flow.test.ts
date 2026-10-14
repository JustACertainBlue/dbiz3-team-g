/**
 * T030 — End-to-end conversational matching journey integration test
 * Covers: Entire US-1 flow (FR-001 to FR-012, BR-001 to BR-020)
 *
 * CONSTITUTION II: Must FAIL before implementation is complete.
 */
import { describe, it, expect } from 'vitest'
import { createMatchingSession } from '@/lib/matching/session-service'
import { extractTourContext, buildTourPreferenceProfile } from '@/lib/ai/extractor'
import { getVerifiedCandidates } from '@/lib/matching/candidate-repo'
import { applyHardConstraints } from '@/lib/matching/constraint-engine'
import { scoreAndRankCandidates } from '@/lib/matching/scoring-engine'
import { buildRecommendations } from '@/lib/matching/recommendation-service'
import {
  createOrReuseQuoteRequest,
  openOrReuseChat,
  countBookingsForAgency,
} from '@/lib/matching/handoff-service'
import { saveAgencyPreferenceProfile } from '@/lib/preferences/preference-service'

describe('T030 | End-to-End Conversational AI Matching Journey (US-1)', () => {
  const agencyId = 'agency-hanoi-tours-001'

  it('executes the full matching journey from initial prompt to quote handoff', async () => {
    // 1. Session creation (FR-001, BR-016)
    const session = await createMatchingSession({ agencyId })
    expect(session.session_id).toBeTruthy()
    expect(session.status).toBe('active')

    // 2. Natural language requirement analysis (FR-002, FR-003)
    const agencyPrompt =
      'We have a group of 15 international tourists on 2026-11-15 looking for pottery ceramic experiences near Hanoi under 500,000 VND per person.'
    const extraction = await extractTourContext({
      sessionId: session.session_id,
      messages: [{ sender: 'agency', text: agencyPrompt, sent_at: new Date().toISOString() }],
    })

    expect(extraction.processing_status).toBe('Success')
    expect(extraction.is_complete).toBe(true)
    expect(extraction.tour_context.group_size).toBe(15)
    expect(extraction.tour_context.budget?.max_per_person).toBe(500000)

    // 3. Tour Preference Profile generation (FR-004)
    const profile = await buildTourPreferenceProfile(extraction.tour_context)
    expect(profile.hard_constraints).toBeDefined()
    expect(profile.preference_weights).toBeDefined()

    // 4. Candidate retrieval from verified catalog (FR-005, BR-003)
    const rawCandidates = await getVerifiedCandidates(profile)
    expect(Array.isArray(rawCandidates)).toBe(true)
    expect(rawCandidates.length).toBeGreaterThan(0)
    for (const c of rawCandidates) {
      expect(c.provider_status).toBe('Verified')
    }

    // 5. Hard constraints filtering (FR-006, BR-005)
    const filtered = await applyHardConstraints(rawCandidates, profile.hard_constraints)
    expect(Array.isArray(filtered.eligible_candidates)).toBe(true)
    for (const c of filtered.eligible_candidates) {
      expect(c.max_capacity).toBeGreaterThanOrEqual(15)
      expect(c.price_per_person).toBeLessThanOrEqual(500000)
    }

    // 6. Multi-factor scoring and ranking (FR-007, BR-006)
    const ranked = await scoreAndRankCandidates(filtered.eligible_candidates, profile)
    expect(ranked.length).toBeGreaterThan(0)
    expect(ranked[0].rank).toBe(1)
    expect(ranked[0].match_score).toBeGreaterThanOrEqual(0)
    expect(ranked[0].match_score).toBeLessThanOrEqual(100)

    // 7. Top recommendations & explanations (FR-008, BR-007)
    const recommendations = await buildRecommendations(ranked)
    expect(recommendations.top_matches.length).toBeLessThanOrEqual(5)
    expect(recommendations.top_matches[0].explanation).toBeTruthy()

    // 8. Commercial handoff: Request Quote (FR-011, BR-009, BR-010, BR-018)
    const topExp = recommendations.top_matches[0]
    const quoteResult = await createOrReuseQuoteRequest({
      agencyId,
      experienceId: topExp.experience_id,
      sessionId: session.session_id,
    })
    expect(quoteResult.quote_request_id).toBeTruthy()

    // Critical assertion: zero bookings created (BR-009, BR-010)
    const bookingCount = await countBookingsForAgency(agencyId)
    expect(bookingCount).toBe(0)

    // Provider chat session opened (BR-019)
    const chatResult = await openOrReuseChat({
      agencyId,
      providerId: topExp.provider_id || 'prov-test',
      contextMessage: `Quote Request: ${quoteResult.quote_request_id}`,
    })
    expect(chatResult.chat_session_id).toBeTruthy()

    // 9. Save agency preference profile for future personalization (FR-010)
    const savedPref = await saveAgencyPreferenceProfile({
      agencyId,
      sessionId: session.session_id,
      tourPreferenceProfile: profile,
    })
    expect(savedPref.agency_id).toBe(agencyId)
  })
})
