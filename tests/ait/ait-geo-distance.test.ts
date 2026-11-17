import { describe, expect, it } from 'vitest'
import { runAitMatchingPipeline } from '@/lib/ait/matching-pipeline'
import { buildResultsMessage } from '@/lib/ait/messages'
import { profileSchema } from '@/lib/ait/schemas'
import { buildTourPreferenceProfile } from '@/lib/ai/extractor'
import { emptyConversationState } from '@/lib/ait/conversation-state'

const profile = (hardConstraints: Record<string, unknown> = {}) => ({
  hard_constraints: hardConstraints,
  matching_attributes: [],
  preference_weights: {
    experience_fit: 0.4,
    route_convenience: 0.25,
    agency_preferences: 0.2,
    provider_quality: 0.15,
  },
})

const candidate = (
  experienceId: string,
  location?: { lat: number; lng: number },
) => ({
  experience_id: experienceId,
  provider_id: `provider-${experienceId}`,
  name: experienceId,
  experience_name: experienceId,
  provider_name: 'Test provider',
  village_name: 'Test village',
  category: 'Workshop/Hands-on',
  experience_type: 'Workshop/Hands-on',
  price_per_person: 100000,
  max_participants: 20,
  provider_status: 'Verified',
  provider_verification_status: 'Approved',
  has_published_profile_version: true,
  ...(location ? { location, location_source: 'from_plus_code' } : {}),
})

describe('AIT distance calculations', () => {
  it('filters known distances outside the requested radius and leaves unknown distances unranked by distance', async () => {
    const result = await runAitMatchingPipeline({
      candidates: [
        candidate('near', { lat: 21.03, lng: 105.85 }),
        candidate('far', { lat: 20.97781, lng: 105.91081 }),
        { ...candidate('unsourced', { lat: 20.97781, lng: 105.91081 }), location_source: 'ai_estimated' },
        candidate('unknown'),
      ],
      profile: profile({
        origin: { lat: 21.0285, lng: 105.8542 },
        radius_km: 5,
      }),
    })

    expect(result.eligibleCandidates.map((item) => item.experience_id).sort())
      .toEqual(['near', 'unknown', 'unsourced'])
    expect(result.rejected).toContainEqual({ id: 'far', reason: 'radius' })
    expect(result.rankedCandidates.find((item) => item.experience_id === 'near')?.distance_km)
      .toBeLessThanOrEqual(5)
    for (const id of ['unknown', 'unsourced']) {
      expect(result.rankedCandidates.find((item) => item.experience_id === id)?.distance_km)
      .toBeUndefined()
    }
  })

  it('resolves a Hanoi district origin and calculates distance only from sourced coordinates', async () => {
    const result = await runAitMatchingPipeline({
      candidates: [candidate('verified-location', { lat: 20.97781, lng: 105.91081 })],
      profile: profile({ origin: { origin_address: 'Hoàn Kiếm' } }),
    })

    expect(result.rankedCandidates[0].distance_source).toBe('haversine')
    expect(result.rankedCandidates[0].distance_km).toBeGreaterThan(8)
    expect(result.rankedCandidates[0].distance_km).toBeLessThan(10)
  })

  it('carries a requested radius from conversation state into the validated profile', async () => {
    const state = { ...emptyConversationState(), radius_km: 5 }
    const result = await buildTourPreferenceProfile({
      origin_or_route: { origin_address: 'Hoàn Kiếm' },
    }, state)

    expect(result.hard_constraints.radius_km).toBe(5)
    expect(profileSchema.safeParse(result).success).toBe(true)
    expect(profileSchema.safeParse({
      ...result,
      hard_constraints: { ...result.hard_constraints, radius_km: -1 },
    }).success).toBe(false)
  })

  it('does not render a distance when the candidate has no sourced coordinates', async () => {
    const result = await runAitMatchingPipeline({
      candidates: [candidate('unknown-location')],
      profile: profile({ origin: { origin_address: 'Hoàn Kiếm' } }),
    })
    const card = result.topMatches[0]
    const message = buildResultsMessage({
      count: 1,
      matches: [{
        experience_name: card.experience_name,
        price_per_person: card.price_per_person,
        distance_km: card.distance_km,
      }],
    })

    expect(card.distance_km).toBeNull()
    expect(card.distance_source).toBeUndefined()
    expect(card.caveats).toContainEqual({
      key: 'distance',
      text: 'Chưa có dữ liệu khoảng cách',
    })
    expect(message).not.toMatch(/\bkm\b/i)
    expect(message).toContain('chưa có dữ liệu khoảng cách')
  })

  it('states directly when no sourced result falls within the requested radius', () => {
    const message = buildResultsMessage({
      count: 0,
      origin: 'Hoàn Kiếm',
      radiusKm: 5,
      noResultsWithinRadius: true,
      matches: [],
    })

    expect(message).toContain('Không tìm thấy trải nghiệm nào phù hợp trong bán kính 5 km')
    expect(message).not.toMatch(/(?:bạn có thể|gợi ý|nên)\s+(?:tự\s+)?mở rộng/i)
  })

  it('does not claim the radius caused an empty result when no candidate had a measured distance', () => {
    const message = buildResultsMessage({
      count: 0,
      radiusKm: 5,
      matches: [],
    })

    expect(message).toBe('Không tìm thấy trải nghiệm nào phù hợp với các tiêu chí hiện tại.')
    expect(message).not.toContain('bán kính')
  })
})
