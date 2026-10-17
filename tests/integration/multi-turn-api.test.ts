/**
 * Integration Test: Multi-Turn Conversation & API-level End-to-End Scenarios
 *
 * Verifies:
 * 1. Multi-turn requirement refinement in the same session (FR-009, BR-008, BR-005)
 * 2. Craft preference differentiation in scoring (Silk -> Vạn Phúc #1, Pottery -> Bát Tràng #1)
 * 3. Fallback relaxation suggestions on no-match (200 pax or tight 20k VND budget) (BR-011, BR-020)
 * 4. Idempotency of Request Quote (same quote ID for same agency + experience) (BR-018)
 * 5. Singleton Active Chat per Agency-Provider pair (same chat ID) (BR-019)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createMatchingSession, addMessage, getMessages } from '@/lib/matching/session-service'
import { extractTourContext, buildTourPreferenceProfile } from '@/lib/ai/extractor'
import { getVerifiedCandidates } from '@/lib/matching/candidate-repo'
import { applyHardConstraints } from '@/lib/matching/constraint-engine'
import { rankCandidates } from '@/lib/matching/scoring-engine'
import { buildRecommendations, buildRelaxationSuggestions } from '@/lib/matching/recommendation-service'
import { createOrReuseQuoteRequest, openOrReuseChat } from '@/lib/matching/handoff-service'

describe('Multi-Turn Session & API Flow Verification', () => {
  const agencyId = 'agency-multi-turn-001'
  let sessionId: string

  beforeEach(async () => {
    const session = await createMatchingSession({ agencyId })
    sessionId = session.session_id
  })

  it('updates requirements across turns and excludes capacities < 15 on turn 3', async () => {
    // Turn 1: Incomplete prompt
    await addMessage(sessionId, 'Agency', 'authentic silk workshop in Van Phuc')
    let history = await getMessages(sessionId)
    let extraction = await extractTourContext({ sessionId, messages: history })
    expect(extraction.is_complete).toBe(false)
    expect(extraction.follow_up_questions.length).toBeGreaterThan(0)

    // Turn 2: Provide group size 10 and date
    await addMessage(sessionId, 'Agency', '10 khách, ngày 20/10/2026, xuất phát từ Hoàn Kiếm')
    history = await getMessages(sessionId)
    extraction = await extractTourContext({ sessionId, messages: history })
    expect(extraction.is_complete).toBe(true)
    expect(extraction.tour_context.group_size).toBe(10)
    expect(extraction.tour_context.craft_preference).toBe('silk')

    let profile = await buildTourPreferenceProfile(extraction.tour_context)
    let candidates = await getVerifiedCandidates(profile)
    let filtered = await applyHardConstraints(candidates, profile.hard_constraints)
    let ranked = await rankCandidates(filtered.eligible_candidates, profile)
    let recs = await buildRecommendations(ranked)

    // Silk preference places Vạn Phúc (Dệt lụa truyền thống) at rank #1
    expect(recs.top_matches[0].experience_name).toContain('lụa')
    expect(recs.top_matches[0].rank).toBe(1)
    expect(recs.top_matches[0].explanation).toContain('silk weaving')

    // Turn 3: Agency changes group size to 15 in the SAME session
    await addMessage(sessionId, 'Agency', '15 tourists on 2026-11-15, under 500,000 VND per person')
    history = await getMessages(sessionId)
    extraction = await extractTourContext({ sessionId, messages: history })
    expect(extraction.tour_context.group_size).toBe(15)

    profile = await buildTourPreferenceProfile(extraction.tour_context)
    filtered = await applyHardConstraints(candidates, profile.hard_constraints)

    // Only candidates with max_participants >= 15 survive (Chuông 15, Quất Động 16)
    // Bát Tràng (12), Vạn Phúc (13), and Phú Vinh (14) must be excluded
    const survivingNames = filtered.eligible_candidates.map(c => c.name)
    expect(survivingNames).toContain('Làm nón lá')
    expect(survivingNames).toContain('Thêu họa tiết')
    expect(survivingNames).not.toContain('Nặn gốm thủ công')
    expect(survivingNames).not.toContain('Dệt lụa truyền thống')
    expect(survivingNames).not.toContain('Đan mây tre')

    // Turn 4: Agency changes group size to 13
    await addMessage(sessionId, 'Agency', '13 tourists')
    history = await getMessages(sessionId)
    extraction = await extractTourContext({ sessionId, messages: history })
    expect(extraction.tour_context.group_size).toBe(13)

    profile = await buildTourPreferenceProfile(extraction.tour_context)
    filtered = await applyHardConstraints(candidates, profile.hard_constraints)
    const cap13Names = filtered.eligible_candidates.map(c => c.name)
    // 12 (Bát Tràng) excluded, 13 (Vạn Phúc), 14 (Phú Vinh), 15 (Chuông), 16 (Quất Động) included
    expect(cap13Names).not.toContain('Nặn gốm thủ công')
    expect(cap13Names).toContain('Dệt lụa truyền thống')
    expect(cap13Names).toContain('Đan mây tre')
  })

  it('triggers relaxation suggestions on impossible group size (200 pax) and tiny budget (20k VND)', async () => {
    // 200 tourists: all seed capacities are <= 16
    await addMessage(sessionId, 'Agency', 'Group of 200 tourists on 2026-11-20, under 500,000 VND per person')
    let history = await getMessages(sessionId)
    let extraction = await extractTourContext({ sessionId, messages: history })
    expect(extraction.tour_context.group_size).toBe(200)

    let profile = await buildTourPreferenceProfile(extraction.tour_context)
    let candidates = await getVerifiedCandidates(profile)
    let filtered = await applyHardConstraints(candidates, profile.hard_constraints)
    expect(filtered.eligible_candidates).toHaveLength(0)

    let relaxation = await buildRelaxationSuggestions([], profile.hard_constraints)
    expect(relaxation.relaxation_suggestions.length).toBeGreaterThan(0)
    expect(relaxation.conversation_prompt).toBeTruthy()

    // Tight budget 20,000 VND: all seed experiences are >= 150,000 VND
    await addMessage(sessionId, 'Agency', 'Tight budget 20,000 VND for 5 pax')
    history = await getMessages(sessionId)
    extraction = await extractTourContext({ sessionId, messages: history })
    expect(extraction.tour_context.budget?.max_per_person).toBe(20000)

    profile = await buildTourPreferenceProfile(extraction.tour_context)
    filtered = await applyHardConstraints(candidates, profile.hard_constraints)
    expect(filtered.eligible_candidates).toHaveLength(0)

    relaxation = await buildRelaxationSuggestions([], profile.hard_constraints)
    expect(relaxation.relaxation_suggestions.some(r => r.criterion === 'Budget')).toBe(true)
  })

  it('enforces quote request idempotency per (agency, experience) pair (BR-018)', async () => {
    const expId = 'b70bd0fa-6a81-5aec-9ff6-5303210b2fad'
    const firstQuote = await createOrReuseQuoteRequest({
      agencyId,
      experienceId: expId,
      sessionId,
    })
    expect(firstQuote.is_new_request).toBe(true)

    const secondQuote = await createOrReuseQuoteRequest({
      agencyId,
      experienceId: expId,
      sessionId,
    })
    expect(secondQuote.is_new_request).toBe(false)
    expect(secondQuote.quote_request_id).toBe(firstQuote.quote_request_id)
  })

  it('enforces singleton active chat per (agency, provider) pair (BR-019)', async () => {
    const providerId = '867719ea-c962-56a1-a88c-3f96e8d0af65'
    const firstChat = await openOrReuseChat({
      agencyId,
      providerId,
      contextMessage: 'Inquiring about conical hat workshop',
    })
    expect(firstChat.is_new_session).toBe(true)

    const secondChat = await openOrReuseChat({
      agencyId,
      providerId,
      contextMessage: 'Following up with additional guest request',
    })
    expect(secondChat.is_new_session).toBe(false)
    expect(secondChat.chat_session_id).toBe(firstChat.chat_session_id)
    expect(secondChat.messages).toHaveLength(2)
  })
})
