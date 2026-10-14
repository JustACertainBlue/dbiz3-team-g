/**
 * T016 — Hard constraints (capacity, budget, date) and route feasibility filter
 * Covers: FR-006, BR-005
 *
 * CONSTITUTION II: Must FAIL before T018 (constraint-engine.ts) is implemented.
 */
import { describe, it, expect } from 'vitest'
import { applyHardConstraints } from '@/lib/matching/constraint-engine'

const makeCandidates = () => [
  {
    experience_id: 'exp-001',
    provider_id: 'prov-001',
    village_id: 'vill-001',
    max_participants: 20,
    price_per_person: 350000,
    location: { lat: 20.9994, lng: 105.8888 }, // Bat Trang
    provider_verification_status: 'Approved',
    has_published_profile_version: true,
  },
  {
    experience_id: 'exp-002',
    provider_id: 'prov-002',
    village_id: 'vill-002',
    max_participants: 5, // too small for group of 12
    price_per_person: 200000,
    location: { lat: 21.0025, lng: 105.7669 }, // Van Phuc
    provider_verification_status: 'Approved',
    has_published_profile_version: true,
  },
  {
    experience_id: 'exp-003',
    provider_id: 'prov-003',
    village_id: 'vill-003',
    max_participants: 30,
    price_per_person: 900000, // over budget
    location: { lat: 21.1667, lng: 105.5000 }, // Outlying craft location
    provider_verification_status: 'Approved',
    has_published_profile_version: true,
  },
]

describe('T016 | Hard Constraints & Route Filter (FR-006, BR-005)', () => {
  const constraints = {
    group_size: 12,
    max_budget_per_person: 500000,
    target_date_or_range: { start_date: '2026-11-10' },
    origin: { address: 'Old Quarter, Hanoi', lat: 21.0285, lng: 105.8542 },
  }

  it('BR-005: removes candidates where max_participants < group_size', async () => {
    const eligible = await applyHardConstraints(makeCandidates(), constraints)
    const ids = eligible.map((c: { experience_id: string }) => c.experience_id)
    expect(ids).not.toContain('exp-002') // max 5 pax, group is 12
  })

  it('BR-005: removes candidates where price_per_person > max_budget_per_person', async () => {
    const eligible = await applyHardConstraints(makeCandidates(), constraints)
    const ids = eligible.map((c: { experience_id: string }) => c.experience_id)
    expect(ids).not.toContain('exp-003') // 900k > 500k budget
  })

  it('FR-006: exp-001 passes all hard constraints', async () => {
    const eligible = await applyHardConstraints(makeCandidates(), constraints)
    const ids = eligible.map((c: { experience_id: string }) => c.experience_id)
    expect(ids).toContain('exp-001')
  })

  it('FR-006: returns route_distance_data for each eligible candidate', async () => {
    const eligible = await applyHardConstraints(makeCandidates(), constraints)
    for (const c of eligible) {
      expect(typeof c.distance_km).toBe('number')
      expect(typeof c.travel_time_minutes).toBe('number')
      expect(c.distance_km).toBeGreaterThanOrEqual(0)
    }
  })

  it('FR-006: returns empty array when all candidates violate constraints', async () => {
    const tightConstraints = {
      group_size: 100, // nothing seats 100
      max_budget_per_person: 1000,
      target_date_or_range: { start_date: '2026-11-10' },
      origin: { address: 'Old Quarter, Hanoi', lat: 21.0285, lng: 105.8542 },
    }
    const eligible = await applyHardConstraints(makeCandidates(), tightConstraints)
    expect(eligible).toHaveLength(0)
  })
})
