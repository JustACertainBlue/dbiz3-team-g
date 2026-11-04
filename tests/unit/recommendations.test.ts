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

// Round 3: T039 (D4, #25), T041 (D3, #30), T043 (D2, #23, #24).
import { rankCandidates } from '@/lib/matching/scoring-engine'
describe('T039 | Explanation from evaluated factors (FR-008, BR-007, #25)', () => {
  const vanPhuc = {
    experience_id: 'c8281688', provider_id: 'p1', name: 'Dệt lụa truyền thống', village_name: 'Vạn Phúc',
    craft_type: 'Silk/Textile', category: 'Workshop/Hands-on', experience_type: 'Workshop/Hands-on',
    max_participants: 13, price_per_person: 175000,
  }
  const profileWith = (extra: Record<string, unknown> = {}, attributes: unknown[] = [{ type: 'experience_type', value: 'Workshop/Hands-on' }]) => ({
    hard_constraints: { group_size: 10, origin: { origin_address: 'Hoàn Kiếm' }, ...extra },
    matching_attributes: attributes,
  })
  const explain = async (p: Record<string, unknown>) => (await buildRecommendations(await rankCandidates([vanPhuc], p))).top_matches[0].explanation

  it('no craft preference → no craft named; capacity, group and estimated distance are stated', async () => {
    const text = await explain(profileWith())
    expect(text).not.toMatch(/silk|lụa|pottery|weaving/i)
    expect(text).toMatch(/up to 13/)
    expect(text).toMatch(/group of 10/)
    expect(text).toMatch(/estimated/i)
    expect(text).toMatch(/Hoàn Kiếm/)
  })

  it('silk preference → the preference is named', async () => {
    expect(await explain(profileWith({}, [{ type: 'craft_preference', value: 'silk' }]))).toMatch(/silk/i)
  })

  it('budget given → price against budget is stated', async () => {
    const text = await explain(profileWith({ max_budget_per_person: 200000 }))
    expect(text).toMatch(/175,000/)
    expect(text).toMatch(/200,000/)
    expect(text).toMatch(/budget/i)
  })
})

describe('T041 | 60/100 threshold (BR-020, #30)', () => {
  it('drops candidates scoring below 60', async () => {
    const ranked = [72, 59.9, 40].map((score, i) => ({ experience_id: `e${i}`, experience_name: `E${i}`, rank: i + 1, match_score: score, experience_fit_score: score }))
    const result = await buildRecommendations(ranked)
    expect(result.top_matches.map(m => m.match_score)).toEqual([72])
    expect(result.additional_suggestions).toEqual([])
  })
})

describe('T043 | Useful relaxation suggestions (BR-011, FR-012, #23, #24)', () => {
  const budget = (r: { relaxation_suggestions: { criterion: string; suggested_value: unknown }[] }) =>
    r.relaxation_suggestions.find(s => s.criterion === 'Budget')

  it('#23: Budget = lowest price among non-budget-feasible candidates scoring ≥ 60', async () => {
    const result = await buildRelaxationSuggestions(
      [{ price_per_person: 175000, match_score: 89.4 }, { price_per_person: 150000, match_score: 74.3 }, { price_per_person: 100000, match_score: 55 }],
      { group_size: 10, max_budget_per_person: 20000 },
    )
    expect(budget(result)?.suggested_value).toBe(150000)
  })

  it('#23 + #30: no Budget suggestion when no candidate would reach 60', async () => {
    const result = await buildRelaxationSuggestions([{ price_per_person: 100000, match_score: 55 }], { group_size: 10, max_budget_per_person: 20000 })
    expect(budget(result)).toBeUndefined()
  })

  it('#24: capacity no-match names the largest accepted group; no Budget, never a fixed 600000', async () => {
    const result = await buildRelaxationSuggestions([], { group_size: 200 }, { largest_group_size: 16 })
    expect(budget(result)).toBeUndefined()
    expect(result.conversation_prompt).toMatch(/16/)
    expect(JSON.stringify(result)).not.toContain('600000')
  })
})
