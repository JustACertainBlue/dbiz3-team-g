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

  it('does not use an unsourced distance to rank or expose a candidate', async () => {
    const nearer = await scoreCandidate({ ...candidate, distance_km: 1 }, profile)
    const farther = await scoreCandidate({ ...candidate, distance_km: 100 }, profile)

    expect(nearer.match_score).toBe(farther.match_score)
    expect(nearer.distance_km).toBeUndefined()
    expect(farther.distance_km).toBeUndefined()
  })
})

// T037 (Round 3, D5): craft preference matched by the Provider's published craft_type (#26, #32).
describe('T037 | Craft match by craft_type (FR-007, BR-006, #26, #32)', () => {
  const withCraft = (value: string) => ({ ...profile, matching_attributes: [{ type: 'craft_preference', value }] })
  const exp = (name: string, village_name: string, craft_type: string) => ({ ...candidate, name, village_name, craft_type })

  it('silk: Quất Động (Silk/Textile) gets the same craft fit as Vạn Phúc', async () => {
    const vanPhuc = await scoreCandidate(exp('Dệt lụa truyền thống', 'Vạn Phúc', 'Silk/Textile'), withCraft('silk'))
    const quatDong = await scoreCandidate(exp('Thêu họa tiết', 'Quất Động', 'Silk/Textile'), withCraft('silk'))
    expect(vanPhuc.experience_fit_score).toBe(100)
    expect(quatDong.experience_fit_score).toBe(100)
  })

  it('silk: an Experience with no craft keyword in its name or village still matches by craft_type', async () => {
    const plain = await scoreCandidate(exp('Workshop A', 'Làng X', 'Silk/Textile'), withCraft('silk'))
    const other = await scoreCandidate(exp('Workshop B', 'Làng Y', 'Ceramics'), withCraft('silk'))
    expect(plain.experience_fit_score).toBe(100)
    expect(other.experience_fit_score).toBe(65)
  })

  it('distinguishes conical-hat and bamboo experiences by their craft tags', async () => {
    const chuong = await scoreCandidate({ ...exp('Workshop A', 'Làng X', 'Other'), tags: ['làm nón'] }, withCraft('conical hat'))
    const phuVinh = await scoreCandidate({ ...exp('Workshop B', 'Làng Y', 'Other'), tags: ['mây tre đan'] }, withCraft('bamboo'))
    const wrongCraftForHat = await scoreCandidate({ ...exp('Workshop C', 'Làng Z', 'Other'), tags: ['mây tre đan'] }, withCraft('conical hat'))
    const wrongCraftForBamboo = await scoreCandidate({ ...exp('Workshop D', 'Làng W', 'Other'), tags: ['làm nón'] }, withCraft('bamboo'))

    expect(chuong.experience_fit_score).toBe(100)
    expect(phuVinh.experience_fit_score).toBe(100)
    expect(wrongCraftForHat.experience_fit_score).toBe(65)
    expect(wrongCraftForBamboo.experience_fit_score).toBe(65)
  })

  it('keeps the #32 Other fallback when no informative craft tag is available', async () => {
    const hat = await scoreCandidate({ ...exp('Workshop A', 'Làng X', 'Other'), tags: ['traditional craft'] }, withCraft('conical hat'))
    const bamboo = await scoreCandidate(exp('Workshop B', 'Làng Y', 'Other'), withCraft('bamboo'))

    expect(hat.experience_fit_score).toBe(100)
    expect(bamboo.experience_fit_score).toBe(100)
  })

  it('handles missing tags without throwing and does not match a different craft_type', async () => {
    const noTags = await scoreCandidate(exp('Workshop A', 'Làng X', 'Other'), withCraft('conical hat'))
    const wrongType = await scoreCandidate({ ...exp('Workshop B', 'Làng Y', 'Ceramics'), tags: ['làm nón'] }, withCraft('conical hat'))

    expect(noTags.experience_fit_score).toBe(100)
    expect(wrongType.experience_fit_score).toBe(65)
  })

  it('no craft preference: no candidate gets a craft-match bonus', async () => {
    const silk = await scoreCandidate(exp('Dệt lụa truyền thống', 'Vạn Phúc', 'Silk/Textile'), profile)
    const pottery = await scoreCandidate(exp('Nặn gốm thủ công', 'Bát Tràng', 'Ceramics'), profile)
    expect(silk.experience_fit_score).toBe(pottery.experience_fit_score)
  })
})
