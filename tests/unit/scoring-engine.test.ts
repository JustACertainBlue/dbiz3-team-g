/**
 * T019 — Multi-factor scoring algorithm (0-100) and normalization
 * Covers: FR-007, BR-006
 *
 * CONSTITUTION II: Must FAIL before T021 (scoring-engine.ts) is implemented.
 */
import { describe, it, expect } from 'vitest'
import { scoreCandidate, rankCandidates } from '@/lib/matching/scoring-engine'

const profile = {
  hard_constraints: { group_size: 15, max_budget_per_person: 400000 },
  matching_attributes: [{ type: 'experience_type', value: 'Workshop/Hands-on' }],
  preference_weights: {
    experience_fit: 0.4,
    route_convenience: 0.25,
    agency_preferences: 0.2,
    provider_quality: 0.15,
  },
}

const candidate = {
  experience_id: 'exp-001',
  provider_id: 'prov-001',
  experience_type: 'Workshop/Hands-on',
  max_participants: 20,
  price_per_person: 350000,
  distance_km: 10,
  travel_time_minutes: 35,
  provider_quality_rating: 0.9,
  historical_agency_preference_weight: 0.7,
}

describe('T019 | Multi-Factor Scoring (FR-007, BR-006)', () => {
  it('FR-007 / BR-006: returns a match_score between 0 and 100', async () => {
    const result = await scoreCandidate(candidate, profile)
    expect(result.match_score).toBeGreaterThanOrEqual(0)
    expect(result.match_score).toBeLessThanOrEqual(100)
  })

  it('FR-007: returns an experience_fit_score between 0 and 100', async () => {
    const result = await scoreCandidate(candidate, profile)
    expect(result.experience_fit_score).toBeGreaterThanOrEqual(0)
    expect(result.experience_fit_score).toBeLessThanOrEqual(100)
  })

  it('BR-006: perfect type match produces higher experience_fit_score than type mismatch', async () => {
    const mismatch = { ...candidate, experience_type: 'Culinary/Tasting' }
    const matchResult = await scoreCandidate(candidate, profile)
    const mismatchResult = await scoreCandidate(mismatch, profile)
    expect(matchResult.experience_fit_score).toBeGreaterThan(mismatchResult.experience_fit_score)
  })

  it('FR-007: rankCandidates returns candidates in descending match_score order', async () => {
    const candidates = [
      { ...candidate, experience_id: 'exp-A', experience_type: 'Workshop/Hands-on' },
      { ...candidate, experience_id: 'exp-B', experience_type: 'Culinary/Tasting' },
      { ...candidate, experience_id: 'exp-C', experience_type: 'Workshop/Hands-on', distance_km: 5 },
    ]
    const ranked = await rankCandidates(candidates, profile)
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].match_score).toBeGreaterThanOrEqual(ranked[i + 1].match_score)
    }
  })

  it('FR-007: rankCandidates assigns rank starting from 1', async () => {
    const candidates = [candidate]
    const ranked = await rankCandidates(candidates, profile)
    expect(ranked[0].rank).toBe(1)
  })
})
