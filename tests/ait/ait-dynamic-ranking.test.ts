import { describe, expect, it } from 'vitest'
import { rankAitCandidates } from '@/lib/ait/dynamic-ranking'

describe('AIT dynamic ranking', () => {
  it('renormalizes only the explicit distance and group-size weights', () => {
    const result = rankAitCandidates([
      {
        experience_id: 'a',
        distance_km: 5,
        location_source: 'from_plus_code',
        max_participants: 15,
      },
    ], {
      distance: true,
      group_size: true,
      radius_km: 10,
      group_size_value: 10,
    }).ranked[0]

    expect(result.score_components).toEqual({ distance: 0.5, group_size: 1 })
    expect(result.normalized_weights.distance).toBeCloseTo(0.35 / 0.6)
    expect(result.normalized_weights.group_size).toBeCloseTo(0.25 / 0.6)
    expect(result.ranking_score).toBeCloseTo((0.5 * 0.35 + 1 * 0.25) / 0.6)
  })

  it('omits missing candidate data and applies the district fallback factor', () => {
    const result = rankAitCandidates([
      { experience_id: 'district', distance_km: 5, location_source: 'district_fallback' },
      { experience_id: 'exact', distance_km: 5, location_source: 'from_plus_code' },
    ], {
      distance: true,
      group_size: true,
      radius_km: 10,
      group_size_value: 10,
    }).ranked

    expect(result.map(item => item.experience_id)).toEqual(['exact', 'district'])
    expect(result[0].normalized_weights).toEqual({ distance: 1 })
    expect(result[0].omitted_components).toContain('group_size')
    expect(result[1].score_components.distance).toBeCloseTo(0.5 * 0.85)
  })

  it('does not use distance unless explicitly activated and keeps unscored defaults stable', () => {
    const request = {}
    const first = rankAitCandidates([
      { experience_id: 'first', distance_km: 1 },
      { experience_id: 'second', distance_km: 100 },
    ], request).ranked
    const changed = rankAitCandidates([
      { experience_id: 'first', distance_km: 100 },
      { experience_id: 'second', distance_km: 1 },
    ], request).ranked

    expect(first.map(item => item.experience_id)).toEqual(['first', 'second'])
    expect(changed.map(item => item.experience_id)).toEqual(['first', 'second'])
    expect(first.every(item => item.ranking_score === null)).toBe(true)
    expect(first.every(item => item.match_score === null)).toBe(true)
  })

  it('sorts by lowest price separately when no numeric budget was requested', () => {
    const result = rankAitCandidates([
      { experience_id: 'expensive', price_per_person: 200 },
      { experience_id: 'cheap', price_per_person: 100 },
    ], {
      cheapest: true,
      price_sort_without_budget: true,
    }).ranked

    expect(result.map(item => item.experience_id)).toEqual(['cheap', 'expensive'])
    expect(result.every(item => item.ranking_score === null)).toBe(true)
  })

  it('doubles the nearest criterion weight before normalizing active weights', () => {
    const result = rankAitCandidates([
      {
        experience_id: 'near',
        distance_km: 4,
        location_source: 'from_plus_code',
        max_participants: 15,
      },
    ], {
      distance: true,
      group_size: true,
      nearest: true,
      radius_km: 10,
      group_size_value: 10,
    }).ranked[0]

    expect(result.normalized_weights.distance).toBeCloseTo(0.7 / 0.95)
    expect(result.normalized_weights.group_size).toBeCloseTo(0.25 / 0.95)
  })

  it('doubles the budget criterion weight for an explicit cheapest request with a budget', () => {
    const result = rankAitCandidates([
      {
        experience_id: 'candidate',
        distance_km: 5,
        location_source: 'from_plus_code',
        price_per_person: 50,
      },
    ], {
      distance: true,
      budget: true,
      cheapest: true,
      radius_km: 10,
      budget_per_person: 100,
    }).ranked[0]

    expect(result.normalized_weights.distance).toBeCloseTo(0.35 / 0.85)
    expect(result.normalized_weights.budget).toBeCloseTo(0.5 / 0.85)
  })

  it('uses the maximum filtered distance when no radius was specified', () => {
    const result = rankAitCandidates([
      { experience_id: 'near', distance_km: 0 },
      { experience_id: 'far', distance_km: 10 },
    ], { distance: true }).ranked

    expect(result.map(item => item.score_components.distance)).toEqual([1, 0])
  })

  it('scores only candidates with verified availability for the requested date', () => {
    const result = rankAitCandidates([
      { experience_id: 'available', date_available: true },
      { experience_id: 'unknown', date_available: false },
    ], { date: true }).ranked

    expect(result.map(item => item.experience_id)).toEqual(['available', 'unknown'])
    expect(result[0].ranking_score).toBe(1)
    expect(result[1].ranking_score).toBeNull()
    expect(result[1].omitted_components).toContain('date')
  })

  it('uses the budget floor and linearly reduces oversized group capacity', () => {
    const result = rankAitCandidates([
      {
        experience_id: 'candidate',
        price_per_person: 90,
        max_participants: 22.5,
      },
    ], {
      budget: true,
      group_size: true,
      budget_per_person: 100,
      group_size_value: 10,
    }).ranked[0]

    expect(result.score_components.budget).toBe(0.2)
    expect(result.score_components.group_size).toBe(0.75)
    expect(result.ranking_score).toBeCloseTo(0.475)
  })

  it('breaks near-score ties in favor of exact coordinates and then ascending ids', () => {
    const result = rankAitCandidates([
      { experience_id: 'z-exact', distance_km: 5, location_source: 'from_plus_code' },
      { experience_id: 'district', distance_km: 4.2, location_source: 'district_fallback' },
      { experience_id: 'a-exact', distance_km: 5, location_source: 'manual_gmaps' },
    ], { distance: true, radius_km: 10 }).ranked

    expect(result.map(item => item.experience_id)).toEqual([
      'a-exact',
      'z-exact',
      'district',
    ])
  })
})
