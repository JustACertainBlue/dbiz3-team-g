/**
 * T025 — Agency preference profile saving and personalized Explore re-ranking
 * Covers: FR-010, FR-014, FR-016, BR-014, BR-015, BR-022
 *
 * CONSTITUTION II: Must FAIL before T029 is implemented.
 */
import { describe, it, expect } from 'vitest'
import {
  saveAgencyPreferenceProfile,
  getAgencyPreferenceProfile,
  rerankExploreForAgency,
  updateAgencyPreferencesFromSignals,
} from '@/lib/preferences/preference-service'
import type { ReweightedSignal } from '@/lib/decay/time-decay'

describe('T025 | Agency Preference Profile & Personalized Explore (FR-010, FR-014, FR-016, BR-014, BR-015, BR-022)', () => {
  const agencyA = 'agency-viet-travel-001'
  const agencyB = 'agency-hanoi-heritage-002'

  const mockTourProfile = {
    hard_constraints: {
      min_group_size: 5,
      max_budget_per_person: 600000,
    },
    matching_attributes: ['Cultural', 'Ceramic Workshop'],
    inferred_preferences: ['Authentic Craft', 'Morning Session'],
    preference_weights: {
      craft_authenticity: 0.6,
      cultural_immersion: 0.4,
    },
  }

  const sampleCatalog = [
    { experience_id: 'exp-bat-trang-01', village_name: 'Bat Trang', category: 'Ceramic Workshop', global_rank: 1 },
    { experience_id: 'exp-van-phuc-01', village_name: 'Van Phuc', category: 'Silk Weaving', global_rank: 2 },
    { experience_id: 'exp-chuong-01', village_name: 'Chuong', category: 'Conical Hat', global_rank: 3 },
  ]

  it('FR-010: saves and retrieves agency preference profile for completed matching session', async () => {
    const saved = await saveAgencyPreferenceProfile({
      agencyId: agencyA,
      sessionId: 'session-match-101',
      tourPreferenceProfile: mockTourProfile,
    })

    expect(saved.agency_id).toBe(agencyA)
    expect(saved.updated_at).toBeDefined()

    const retrieved = await getAgencyPreferenceProfile(agencyA)
    expect(retrieved).toBeDefined()
    expect(retrieved?.agency_id).toBe(agencyA)
  })

  it('BR-014 / BR-022: updates apply only to individual agency and do not affect another agency', async () => {
    // Agency A updates preferences heavily toward Bat Trang / Ceramic
    await saveAgencyPreferenceProfile({
      agencyId: agencyA,
      sessionId: 'session-101',
      tourPreferenceProfile: mockTourProfile,
    })

    const profileA = await getAgencyPreferenceProfile(agencyA)
    const profileB = await getAgencyPreferenceProfile(agencyB)

    expect(profileA?.agency_id).toBe(agencyA)
    // Agency B must remain unpolluted / untouched
    expect(profileB?.tour_preference_profile).not.toEqual(profileA?.tour_preference_profile)
  })

  it('BR-015: agency profile does not expose raw internal interaction-signal logs to tour agency', async () => {
    const profile = await getAgencyPreferenceProfile(agencyA)
    // Tour Agency cannot inspect raw internal logs (BR-015)
    expect((profile as unknown as Record<string, unknown>).raw_interaction_logs).toBeUndefined()
  })

  it('FR-016 / BR-022: produces an agency-specific reranked Explore list', async () => {
    const rerankedA = await rerankExploreForAgency(agencyA, sampleCatalog)

    expect(Array.isArray(rerankedA)).toBe(true)
    expect(rerankedA.length).toBe(sampleCatalog.length)
    // Ceramic should rank first for Agency A because of saved preferences
    expect(rerankedA[0].experience_id).toBe('exp-bat-trang-01')
    expect(rerankedA[0].rank).toBe(1)
    expect(typeof rerankedA[0].score).toBe('number')
  })

  it('FR-014 / FR-016: updates profile weights from reweighted chat interaction signals', async () => {
    const reweightedSignals: ReweightedSignal[] = [
      {
        signal: {
          signal_type: 'Positive Experience Interest',
          value: 'Silk Weaving',
          confidence_score: 0.9,
          captured_at: new Date().toISOString(),
        },
        weight: 0.9,
      },
    ]

    const updated = await updateAgencyPreferencesFromSignals(agencyA, reweightedSignals)
    expect(updated).toBeDefined()
    expect(updated.updated_at).toBeDefined()

    // Subsequent reranking should reflect increased affinity for Silk Weaving
    const rerankedAfterSignal = await rerankExploreForAgency(agencyA, sampleCatalog)
    const silkRank = rerankedAfterSignal.find(e => e.experience_id === 'exp-van-phuc-01')?.rank
    expect(silkRank).toBeDefined()
    expect(silkRank).toBeLessThanOrEqual(2)
  })
})
