/**
 * T020 — Top-5 recommendation formatting, match explanations, and criteria relaxation
 * Covers: FR-008, FR-012, BR-007, BR-020
 *
 * CONSTITUTION II: Must FAIL before T022 (recommendation-service.ts) is implemented.
 */
import { describe, it, expect } from 'vitest'
import {
  buildRecommendations,
  buildRelaxationSuggestions,
} from '@/lib/matching/recommendation-service'

const makeRankedCandidates = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    experience_id: `exp-${i + 1}`,
    experience_name: `Experience ${i + 1}`,
    provider_name: `Provider ${i + 1}`,
    rank: i + 1,
    match_score: 95 - i * 5,
    experience_fit_score: 90 - i * 4,
  }))

describe('T020 | Recommendations & Relaxation Suggestions (FR-008, FR-012, BR-007, BR-020)', () => {
  it('FR-008: returns at most 5 top_matches', async () => {
    const ranked = makeRankedCandidates(8)
    const result = await buildRecommendations(ranked)
    expect(result.top_matches.length).toBeLessThanOrEqual(5)
  })

  it('FR-008: top_matches are the highest-ranked 5', async () => {
    const ranked = makeRankedCandidates(8)
    const result = await buildRecommendations(ranked)
    expect(result.top_matches[0].rank).toBe(1)
    expect(result.top_matches[result.top_matches.length - 1].rank).toBeLessThanOrEqual(5)
  })

  it('FR-008: additional_suggestions contains up to 5 results after top 5', async () => {
    const ranked = makeRankedCandidates(9)
    const result = await buildRecommendations(ranked)
    expect(result.additional_suggestions.length).toBeLessThanOrEqual(5)
    if (result.additional_suggestions.length > 0) {
      expect(result.additional_suggestions[0].rank).toBe(6)
    }
  })

  it('BR-007: each top_match has a non-empty explanation string', async () => {
    const ranked = makeRankedCandidates(3)
    const result = await buildRecommendations(ranked)
    for (const match of result.top_matches) {
      expect(typeof match.explanation).toBe('string')
      expect(match.explanation.length).toBeGreaterThan(0)
    }
  })

  it('FR-012 / BR-020: returns relaxation suggestions when no candidates pass threshold (60)', async () => {
    const criteria = {
      group_size: 50,
      max_budget_per_person: 50000,
      target_date_or_range: { start_date: '2026-12-25' },
    }
    const suggestions = await buildRelaxationSuggestions([], criteria)
    expect(Array.isArray(suggestions.relaxation_suggestions)).toBe(true)
    expect(suggestions.relaxation_suggestions.length).toBeGreaterThan(0)
    const criteria_types = suggestions.relaxation_suggestions.map((s: { criterion: string }) => s.criterion)
    // Must suggest budget or distance relaxation
    const hasBudgetOrDistance = criteria_types.some((c: string) => ['Budget', 'Distance', 'Dates'].includes(c))
    expect(hasBudgetOrDistance).toBe(true)
  })

  it('FR-012: returns a conversation_prompt when results are empty', async () => {
    const suggestions = await buildRelaxationSuggestions([], {})
    expect(typeof suggestions.conversation_prompt).toBe('string')
    expect(suggestions.conversation_prompt.length).toBeGreaterThan(0)
  })
})
