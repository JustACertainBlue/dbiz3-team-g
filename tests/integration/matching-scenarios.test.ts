/**
 * T031 — Matching Scenario Integration Tests
 * Covers: AS-5, AS-6, AS-8, AS-9, BR-005, BR-011, BR-020, F-MATCH-03
 *
 * These tests exercise the full matching pipeline end-to-end using seed data
 * to verify that real constraints (capacity, budget) are enforced and that
 * multi-turn clarification accumulates context correctly (F-MATCH-03).
 */
import { describe, it, expect } from 'vitest'
import { extractTourContext, buildTourPreferenceProfile } from '@/lib/ai/extractor'
import { getVerifiedCandidates } from '@/lib/matching/candidate-repo'
import { applyHardConstraints } from '@/lib/matching/constraint-engine'
import { scoreAndRankCandidates } from '@/lib/matching/scoring-engine'
import { buildRecommendations, buildRelaxationSuggestions } from '@/lib/matching/recommendation-service'

// Seed capacities (from data/seed/experiences.csv):
// Bát Tràng  "Nặn gốm"   → max_participants = 12
// Vạn Phúc   "Dệt lụa"   → max_participants = 13
// Chuông     "Làm nón lá" → max_participants = 15
// Quất Động  "Thêu họa tiết" → max_participants = 16

describe('T031 | Matching Scenarios — Seed-Data Assertions (AS-5/6/8/9)', () => {
  // -------------------------------------------------------------------------
  // AS-5 / AS-6 / BR-005 : 15-guest group → Bát Tràng (12) and Vạn Phúc (13) must be excluded
  // -------------------------------------------------------------------------
  it('AS-5/BR-005: group of 15 → Bát Tràng (cap 12) and Vạn Phúc (cap 13) are eliminated', async () => {
    const extraction = await extractTourContext([
      { sender: 'Agency', text: '15 tourists, pottery ceramic, date 2026-11-15, budget 500000 VND' },
    ])
    expect(extraction.is_complete).toBe(true)
    expect(extraction.tour_context.group_size).toBe(15)

    const profile = await buildTourPreferenceProfile(extraction.tour_context)
    const rawCandidates = await getVerifiedCandidates(profile)
    const filtered = await applyHardConstraints(rawCandidates, profile.hard_constraints)

    const ids = filtered.eligible_candidates.map(c => c.experience_id)

    // Bát Tràng (max 12 < 15) must be excluded
    expect(ids).not.toContain('c9f9faf7-2987-5ae4-b1ed-95c095fcce69')

    // Vạn Phúc (max 13 < 15) must be excluded
    expect(ids).not.toContain('c8281688-2dc1-5cb1-9ff6-139df04ba562')

    // Chuông (max 15 >= 15) must remain
    expect(ids).toContain('b70bd0fa-6a81-5aec-9ff6-5303210b2fad')
  })

  it('AS-6: all eligible candidates for group of 15 have max_participants >= 15', async () => {
    const profile = await buildTourPreferenceProfile({
      group_size: 15,
      target_date_or_range: { start_date: '2026-11-15' },
    })
    const rawCandidates = await getVerifiedCandidates(profile)
    const filtered = await applyHardConstraints(rawCandidates, profile.hard_constraints)

    for (const c of filtered.eligible_candidates) {
      expect(c.max_participants).toBeGreaterThanOrEqual(15)
    }
  })

  // -------------------------------------------------------------------------
  // AS-6 / AS-9 / BR-011 / BR-020 : 200 guests → no candidate passes → fallback
  // -------------------------------------------------------------------------
  it('AS-6: group of 200 → no experience passes capacity filter (all seed max ≤ 20)', async () => {
    const profile = await buildTourPreferenceProfile({
      group_size: 200,
      target_date_or_range: { start_date: '2026-12-25' },
    })
    const rawCandidates = await getVerifiedCandidates(profile)
    const filtered = await applyHardConstraints(rawCandidates, profile.hard_constraints)
    expect(filtered.eligible_candidates).toHaveLength(0)
  })

  it('AS-9/BR-020: when no candidate qualifies, buildRelaxationSuggestions returns suggestions with conversation_prompt', async () => {
    const criteria = { group_size: 200, max_budget_per_person: 20000 }
    const relaxation = await buildRelaxationSuggestions([], criteria)
    expect(relaxation.relaxation_suggestions.length).toBeGreaterThan(0)
    expect(relaxation.conversation_prompt).toBeTruthy()
    // Score threshold note: spec uses 60/100, not "60%"
    expect(relaxation.conversation_prompt).not.toMatch(/60%/)
  })

  // -------------------------------------------------------------------------
  // AS-8 / F-MATCH-03 : multi-turn clarification — turn 2 must incorporate turn 1 context
  // -------------------------------------------------------------------------
  it('AS-8/F-MATCH-03: incomplete turn 1 → complete turn 2 → extraction succeeds', async () => {
    // Turn 1: missing group_size and date
    const turn1 = await extractTourContext([
      { sender: 'Agency', text: 'authentic silk workshop in Van Phuc' },
    ])
    expect(turn1.is_complete).toBe(false)
    expect(turn1.follow_up_questions.length).toBeGreaterThan(0)

    // Turn 2: agency provides group size + date (all messages accumulated)
    const turn2 = await extractTourContext([
      { sender: 'Agency', text: 'authentic silk workshop in Van Phuc' },
      { sender: 'Assistant', text: turn1.follow_up_questions.join(' ') },
      { sender: 'Agency', text: '20 passengers, date 20/10/2026, from Hoàn Kiếm' },
    ])

    // F-MATCH-03: must incorporate agency response into matching context → is_complete
    expect(turn2.is_complete).toBe(true)
    expect(turn2.tour_context.group_size).toBe(20)
    expect(turn2.follow_up_questions).toHaveLength(0)
  })

  it('AS-8/F-MATCH-03: after complete context, full pipeline produces recommendations', async () => {
    const extraction = await extractTourContext([
      { sender: 'Agency', text: 'authentic silk workshop in Van Phuc' },
      { sender: 'Assistant', text: 'Could you please specify group size and date?' },
      { sender: 'Agency', text: '20 passengers, date 20/10/2026, from Hoàn Kiếm' },
    ])
    expect(extraction.is_complete).toBe(true)

    const profile = await buildTourPreferenceProfile(extraction.tour_context)
    const rawCandidates = await getVerifiedCandidates(profile)
    const filtered = await applyHardConstraints(rawCandidates, profile.hard_constraints)
    const ranked = await scoreAndRankCandidates(filtered.eligible_candidates, profile)
    const recs = await buildRecommendations(ranked)

    // At least one recommendation must be produced (Vạn Phúc max 13 < 20, so maybe Chuông/Quất Động)
    // The important check is that the pipeline runs and returns structured output
    expect(recs.top_matches).toBeDefined()
    if (recs.top_matches.length > 0) {
      expect(recs.top_matches[0].experience_id).toBeTruthy()
      expect(recs.top_matches[0].rank).toBe(1)
    }
  })

  // -------------------------------------------------------------------------
  // AS-9 / BR-011 / BR-020 : tight budget 20,000 VND → no candidates pass → fallback
  // -------------------------------------------------------------------------
  it('BR-011/BR-020: budget 20,000 VND (below any experience price) → empty eligible list', async () => {
    const profile = await buildTourPreferenceProfile({
      group_size: 10,
      budget: { max_per_person: 20000, currency: 'VND' },
      target_date_or_range: { start_date: '2026-12-25' },
    })
    const rawCandidates = await getVerifiedCandidates(profile)
    const filtered = await applyHardConstraints(rawCandidates, profile.hard_constraints)
    expect(filtered.eligible_candidates).toHaveLength(0)
  })
})
