import { describe, expect, it } from 'vitest'
import { runAitMatchingPipeline } from '@/lib/ait/matching-pipeline'
import { buildResultsMessage, buildVillageCardResultsMessage } from '@/lib/ait/messages'
import { profileSchema } from '@/lib/ait/schemas'
import { buildTourPreferenceProfile } from '@/lib/ai/extractor'
import { emptyConversationState } from '@/lib/ait/conversation-state'
import { filterCandidateByRadius, haversineDistanceKm } from '@/lib/matching/geo'
import { applyHardConstraints } from '@/lib/matching/constraint-engine'
import { resolveVillageCards } from '@/lib/matching/card-resolver'
import { resolveTestVillageCards } from '@/lib/matching/test-dataset'
import { runVillageCardPipeline } from '@/lib/ait/matching-pipeline'

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
  locationSource: 'from_plus_code' | 'district_fallback' | 'manual_gmaps' | 'approximate' = 'from_plus_code',
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
  ...(location ? { location, location_source: locationSource } : {}),
})

describe('AIT distance calculations', () => {
  it('rejects coordinates whose latitude is outside the valid range', () => {
    expect(haversineDistanceKm({ lat: 90.01, lng: 0 }, { lat: 0, lng: 0 })).toBeUndefined()
    expect(haversineDistanceKm({ lat: -90.01, lng: 0 }, { lat: 0, lng: 0 })).toBeUndefined()
  })

  it('prioritizes the budget reason when both budget and radius exclude all results', () => {
    const message = buildResultsMessage({
      count: 0,
      max_budget_per_person: 10000,
      radiusKm: 10,
      noResultsWithinRadius: true,
      noResultsDueToBudget: true,
    })

    expect(message).toContain(
      'Không tìm thấy trải nghiệm nào phù hợp với ngân sách tối đa 10.000đ/người.',
    )
    expect(message).not.toContain('bán kính 10 km')
    expect(message).not.toContain('Chưa có dữ liệu khoảng cách')
  })

  it('uses the displayed one-decimal boundary for an 8.14 km candidate and 8.1 km radius', () => {
    const result = filterCandidateByRadius({
      distance_km: 8.14,
      distance_source: 'haversine',
      location_source: 'from_plus_code',
    }, 8.1)

    expect(result.include).toBe(true)
    expect(result.status).toBe('confirmed')
  })

  it.each([
    ['NaN', Number.NaN],
    ['negative', -1],
  ])('excludes a corrupted %s candidate distance from a requested radius', (_label, distance) => {
    const result = filterCandidateByRadius({
      distance_km: distance,
      distance_source: 'haversine',
      location_source: 'from_plus_code',
    }, 10)

    expect(result.include).toBe(false)
  })

  it('marks each unconfirmed village in the overflow summary', () => {
    const overflow = [
      { name: 'Quất Động', radius_status: 'unconfirmed' as const },
      { name: 'Vạn Phúc', radius_status: 'confirmed' as const },
      { name: 'Yên Thái', radius_status: 'unconfirmed' as const },
    ]

    const message = buildVillageCardResultsMessage(
      [
        { name: 'Ngũ Xã', radius_status: 'unconfirmed' },
        { name: 'Yên Thái', radius_status: 'unconfirmed' },
        { name: 'Bát Tràng', radius_status: 'confirmed' },
      ],
      10,
      'trung tâm Hà Nội',
      overflow,
    )

    expect(message).toContain(
      'Còn 3 làng khác trong bán kính: Quất Động — chưa xác nhận bán kính, Vạn Phúc, Yên Thái — chưa xác nhận bán kính.'
    )
  })

  it.each([
    ['seed', false],
    ['fixture', true],
  ] as const)('reports exact post-filter overflow counts for zero, 3, 4 and many %s villages', (_dataset, fixture) => {
    const sourceCards = fixture
      ? resolveTestVillageCards('làng nghề', true)
      : resolveVillageCards('làng nghề', true)
    const postFilterCards = runVillageCardPipeline({
      cards: sourceCards,
      radiusKm: 1000,
      distanceRequested: true,
    })
    const counts = [0, 3, 4, postFilterCards.length]
    expect(postFilterCards.length).toBeGreaterThan(4)

    for (const count of counts) {
      const filtered = count === 0 ? [] : postFilterCards.slice(0, count)
      const message = buildVillageCardResultsMessage(
        filtered.slice(0, 3),
        1000,
        undefined,
        filtered.slice(3),
      )
      const overflow = message.split('\n').find(line => line.startsWith('Còn '))

      if (count <= 3) {
        expect(overflow).toBeUndefined()
      } else {
        expect(overflow).toMatch(new RegExp(`^Còn ${count - 3} làng khác trong bán kính:`))
      }
    }
  })

  it('does not let an unrequested distance affect the default candidate order', async () => {
    const near = { lat: 21.0285, lng: 105.8542 }
    const far = { lat: 20.72611, lng: 105.70667 }
    const order = async (nearId: string) => {
      const candidates = [
        candidate('a-candidate', nearId === 'a-candidate' ? near : far),
        candidate('b-candidate', nearId === 'b-candidate' ? near : far),
      ]
      const result = await runAitMatchingPipeline({
        candidates,
        profile: profile(),
      })
      return result.rankedCandidates.map(item => item.experience_id)
    }

    expect(await order('a-candidate')).toEqual(await order('b-candidate'))
    expect(await order('a-candidate')).toEqual(['a-candidate', 'b-candidate'])
  })

  it('filters a Vạn Phúc manual point against the unrounded 10 km boundary', async () => {
    const resultAtTen = await runAitMatchingPipeline({
      candidates: [candidate('van-phuc', { lat: 20.97976, lng: 105.77402 }, 'manual_gmaps')],
      profile: profile({ radius_km: 10 }),
    })
    const resultBelowDistance = await runAitMatchingPipeline({
      candidates: [candidate('van-phuc', { lat: 20.97976, lng: 105.77402 }, 'manual_gmaps')],
      profile: profile({ radius_km: 9.9 }),
    })

    expect(resultAtTen.rankedCandidates[0].distance_km).toBeCloseTo(9.932198, 5)
    expect(resultAtTen.topMatches[0].caveats).toContainEqual({
      key: 'distance',
      text: 'Cách trung tâm Hà Nội khoảng 9,9 km (đường chim bay)',
    })
    expect(resultAtTen.rejected).toEqual([])
    expect(resultBelowDistance.rejected).toEqual([])
  })

  it('rejects Bá Dương Nội approximate coordinates when the 3 km lower bound is outside', async () => {
    const result = await runAitMatchingPipeline({
      candidates: [candidate('ba-duong-noi', { lat: 21.13333, lng: 105.7 }, 'approximate')],
      profile: profile({ radius_km: 15 }),
    })

    expect(result.eligibleCandidates).toHaveLength(0)
    expect(result.rejected).toContainEqual({ id: 'ba-duong-noi', reason: 'radius' })
  })

  it('keeps Bá Dương Nội unconfirmed when the 3 km band crosses the radius', async () => {
    const result = await runAitMatchingPipeline({
      candidates: [candidate('ba-duong-noi', { lat: 21.13333, lng: 105.7 }, 'approximate')],
      profile: profile({ radius_km: 20 }),
    })

    expect(result.topMatches[0]).toMatchObject({
      distance_km: expect.closeTo(19.794832, 5),
      location_source: 'approximate',
      radius_status: 'unconfirmed',
    })
    expect(result.topMatches[0].caveats).toContainEqual({
      key: 'distance',
      text: 'Khoảng 20 km (tọa độ xấp xỉ)',
    })
    expect(result.topMatches[0].caveats).toContainEqual({
      key: 'radius',
      text: 'Chưa xác nhận bán kính',
    })
    const message = buildResultsMessage({
      count: 1,
      radiusKm: 20,
      matches: [{
        experience_name: 'Bá Dương Nội',
        price_per_person: 100000,
        distance_km: result.topMatches[0].distance_km,
        distance_source: 'haversine',
        location_source: 'approximate',
        radius_status: 'unconfirmed',
      }],
    })
    expect(message).toContain('do tọa độ xấp xỉ')
    expect(message).not.toContain('ước tính theo huyện')
  })

  it('confirms Bá Dương Nội when the 3 km upper bound is inside the radius', async () => {
    const result = await runAitMatchingPipeline({
      candidates: [candidate('ba-duong-noi', { lat: 21.13333, lng: 105.7 }, 'approximate')],
      profile: profile({ radius_km: 25 }),
    })

    expect(result.topMatches[0]).toMatchObject({
      location_source: 'approximate',
      radius_status: 'confirmed',
    })
    expect(result.topMatches[0].caveats).toContainEqual({
      key: 'distance',
      text: 'Khoảng 20 km (tọa độ xấp xỉ)',
    })
    expect(result.topMatches[0].caveats).not.toContainEqual({
      key: 'radius',
      text: 'Chưa xác nhận bán kính',
    })
  })

  it('uses inclusive bounds for the configured approximate uncertainty', async () => {
    const origin = { lat: 21.0285, lng: 105.8542 }
    const location = { lat: 21.13333, lng: 105.7 }
    const distance = haversineDistanceKm(origin, location)!
    const atLowerBound = await runAitMatchingPipeline({
      candidates: [candidate('at-lower-bound', location, 'approximate')],
      profile: profile({ origin, radius_km: distance - 3 }),
    })
    const belowLowerBound = await runAitMatchingPipeline({
      candidates: [candidate('below-lower-bound', location, 'approximate')],
      profile: profile({ origin, radius_km: distance - 3 - 0.000001 }),
    })
    const atUpperBound = await runAitMatchingPipeline({
      candidates: [candidate('at-upper-bound', location, 'approximate')],
      profile: profile({ origin, radius_km: distance + 3 }),
    })

    expect(atLowerBound.eligibleCandidates).toHaveLength(1)
    expect(atLowerBound.topMatches[0].radius_status).toBe('unconfirmed')
    expect(belowLowerBound.eligibleCandidates).toHaveLength(0)
    expect(atUpperBound.topMatches[0].radius_status).toBe('confirmed')
  })

  it('applies approximate uncertainty in the shared hard-constraint engine', async () => {
    const location = { lat: 21.13333, lng: 105.7 }
    const approximateCandidate = candidate('ba-duong-noi', location, 'approximate')

    const outside = await applyHardConstraints([approximateCandidate], { radius_km: 15 })
    const uncertain = await applyHardConstraints([approximateCandidate], { radius_km: 20 })
    const inside = await applyHardConstraints([approximateCandidate], { radius_km: 25 })

    expect(outside.eligible_candidates).toHaveLength(0)
    expect(uncertain.eligible_candidates[0].radius_status).toBe('unconfirmed')
    expect(inside.eligible_candidates[0].radius_status).toBe('confirmed')
  })

  it('uses inclusive approximate bounds in the shared hard-constraint engine', async () => {
    const origin = { lat: 21.0285, lng: 105.8542 }
    const location = { lat: 21.13333, lng: 105.7 }
    const distance = haversineDistanceKm(origin, location)!
    const approximateCandidate = candidate('ba-duong-noi', location, 'approximate')
    const atLowerBound = await applyHardConstraints([approximateCandidate], {
      origin,
      radius_km: distance - 3,
    })
    const belowLowerBound = await applyHardConstraints([approximateCandidate], {
      origin,
      radius_km: distance - 3 - 0.000001,
    })
    const atUpperBound = await applyHardConstraints([approximateCandidate], {
      origin,
      radius_km: distance + 3,
    })

    expect(atLowerBound.eligible_candidates[0].radius_status).toBe('unconfirmed')
    expect(belowLowerBound.eligible_candidates).toHaveLength(0)
    expect(atUpperBound.eligible_candidates[0].radius_status).toBe('confirmed')
  })

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

  it('compares exact-radius candidates using the one-decimal displayed boundary', async () => {
    const origin = { lat: 21.0285, lng: 105.8542 }
    const exactLocation = { lat: origin.lat, lng: origin.lng + 0.01 }
    const radiusKm = haversineDistanceKm(origin, exactLocation)!
    const justOutsideLocation = { lat: origin.lat, lng: origin.lng + 0.01000001 }
    const result = await runAitMatchingPipeline({
      candidates: [
        candidate('exact-radius', exactLocation),
        candidate('just-outside', justOutsideLocation),
      ],
      profile: profile({ origin, radius_km: radiusKm }),
    })

    expect(result.eligibleCandidates.map((item) => item.experience_id)).toEqual(['exact-radius', 'just-outside'])
    expect(result.rankedCandidates[0].distance_km).toBe(radiusKm)
  })

  it('applies the district uncertainty band and labels estimated distance', async () => {
    const origin = { lat: 21.0285, lng: 105.8542 }
    const result = await runAitMatchingPipeline({
      candidates: [
        candidate('district-near', { lat: origin.lat, lng: origin.lng + 0.01 }, 'district_fallback'),
        candidate('district-far', { lat: origin.lat, lng: origin.lng + 0.2 }, 'district_fallback'),
      ],
      profile: profile({ origin, radius_km: 10 }),
    })

    expect(result.eligibleCandidates.map((item) => item.experience_id)).toEqual(['district-near'])
    expect(result.rejected).toContainEqual({ id: 'district-far', reason: 'radius' })
    expect(result.rankedCandidates[0].distance_km).toBeCloseTo(1, 1)
    expect(result.topMatches[0]).toMatchObject({
      distance_source: 'haversine',
      location_source: 'district_fallback',
      radius_status: 'unconfirmed',
    })
    expect(result.topMatches[0].caveats).toContainEqual({
      key: 'distance',
      text: 'Khoảng 1 km (ước tính theo huyện)',
    })

    const districtMatch = {
      experience_name: result.topMatches[0].experience_name,
      price_per_person: result.topMatches[0].price_per_person,
      distance_km: result.topMatches[0].distance_km,
      distance_source: 'haversine' as const,
      location_source: 'district_fallback' as const,
      radius_status: 'unconfirmed' as const,
    }
    const message = buildResultsMessage({
      count: 1,
      radiusKm: 10,
      matches: [districtMatch],
    })
    expect(message).toContain('khoảng 1 km (ước tính theo huyện)')
    expect(message).toContain('chưa xác nhận bán kính')
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
    expect(message).not.toContain('chưa có dữ liệu khoảng cách')
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

  it('does not claim radius filtering and says it could not be verified when no distance exists', () => {
    const message = buildResultsMessage({
      count: 0,
      radiusKm: 5,
      matches: [],
    })

    expect(message).toContain('Không tìm thấy trải nghiệm nào phù hợp')
    expect(message).toContain('Chưa có dữ liệu khoảng cách để kiểm tra bán kính 5 km')
    expect(message).not.toContain('Không tìm thấy trải nghiệm nào phù hợp trong bán kính')
  })

  it('says the radius cannot be verified when a returned result has no measured distance', () => {
    const message = buildResultsMessage({
      count: 1,
      radiusKm: 5,
      matches: [{
        experience_name: 'Trải nghiệm chưa có tọa độ',
        price_per_person: 100000,
        distance_km: null,
      }],
    })

    expect(message).toContain('Chưa có dữ liệu khoảng cách để kiểm tra bán kính 5 km')
    expect(message).not.toContain('Không tìm thấy trải nghiệm nào phù hợp trong bán kính')
  })
})
