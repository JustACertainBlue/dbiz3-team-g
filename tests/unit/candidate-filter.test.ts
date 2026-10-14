/**
 * T015 — Verified Local Provider candidate retrieval and unpublished exclusion
 * Covers: FR-005, BR-003
 *
 * CONSTITUTION II: Must FAIL before T017 (candidate-repo.ts) is implemented.
 */
import { describe, it, expect } from 'vitest'
import { retrieveCandidates } from '@/lib/matching/candidate-repo'

describe('T015 | Candidate Retrieval & Provider Eligibility (FR-005, BR-003)', () => {
  const baseProfile = {
    hard_constraints: {
      group_size: 10,
      max_budget_per_person: 500000,
      target_date_or_range: { start_date: '2026-11-10' },
    },
    matching_attributes: [{ type: 'experience_type', value: 'Workshop/Hands-on' }],
    preference_weights: {
      experience_fit: 0.4,
      route_convenience: 0.25,
      agency_preferences: 0.2,
      provider_quality: 0.15,
    },
  }

  it('FR-005: returns candidate array (may be empty if no matches)', async () => {
    const candidates = await retrieveCandidates(baseProfile)
    expect(Array.isArray(candidates)).toBe(true)
  })

  it('BR-003: all returned candidates have provider_verification_status = Approved', async () => {
    const candidates = await retrieveCandidates(baseProfile)
    for (const c of candidates) {
      expect(c.provider_verification_status).toBe('Approved')
    }
  })

  it('BR-003: candidates with unpublished provider profiles are excluded', async () => {
    const candidates = await retrieveCandidates(baseProfile)
    for (const c of candidates) {
      expect(c.has_published_profile_version).toBe(true)
    }
  })

  it('FR-005: returned candidates include experience_id, provider_id, village_id', async () => {
    const candidates = await retrieveCandidates(baseProfile)
    for (const c of candidates) {
      expect(c.experience_id).toBeTruthy()
      expect(c.provider_id).toBeTruthy()
      expect(c.village_id).toBeTruthy()
    }
  })
})
