import { describe, expect, it } from 'vitest'
import { loadExperiences } from '@/lib/db/seed-loader'
import { getTestCandidates } from '@/lib/matching/test-dataset'
import {
  DEFAULT_HANOI_ORIGIN,
  originDisplayNotice,
  resolveOriginCoordinates,
} from '@/lib/matching/geo'
import {
  buildVillageAttributePromptBlock,
  isVillageAttributeFilterable,
  resolveVillageCoordinate,
  type VillageCoordinateLookup,
} from '@/lib/matching/village-coordinate-lookup'
import { applyHardFilters } from '@/lib/ait/constraints'
import { applyHardConstraints } from '@/lib/matching/constraint-engine'
import { buildResultsMessage } from '@/lib/ait/messages'

const profile = {
  hard_constraints: {},
  matching_attributes: [],
  preference_weights: {
    experience_fit: 0.4,
    route_convenience: 0.25,
    agency_preferences: 0.2,
    provider_quality: 0.15,
  },
}

describe('shared village enrichment', () => {
  it('prefers manual coordinates, then verified plus codes, then district fallback', () => {
    const coordinates: VillageCoordinateLookup = {
      by_village_id: {
        village: {
          geo: { lat: 21.1, lng: 105.9, precision: 'district_centroid' },
        },
      },
      manual_by_normalized_key: {
        'bat trang': { lat: 21.2, lng: 105.8, source: 'manual_gmaps' },
      },
    }

    expect(resolveVillageCoordinate(
      { id: 'village', name: 'Bát Tràng' },
      coordinates,
      { lat: 21.3, lng: 105.7 },
    )).toMatchObject({
      location: { lat: 21.2, lng: 105.8 },
      location_source: 'manual_gmaps',
    })

    expect(resolveVillageCoordinate(
      { id: 'village', name: 'Bát Tràng' },
      { by_village_id: { village: { geo: { lat: 21.1, lng: 105.9, precision: 'district_centroid' } } } },
      { lat: 21.3, lng: 105.7 },
    )).toMatchObject({
      location: { lat: 21.3, lng: 105.7 },
      location_source: 'from_plus_code',
    })

    expect(resolveVillageCoordinate({ id: 'village' }, coordinates)).toMatchObject({
      location: { lat: 21.1, lng: 105.9 },
      location_source: 'district_fallback',
    })
  })

  it('loads id-keyed attributes for both seed experiences and test candidates', async () => {
    const seedVillageId = '20896522-6235-5699-aeaf-f48b8150d895'
    const shared = {
      by_village_id: {
        [seedVillageId]: {
          geo: { lat: 21.01, lng: 105.81, precision: 'district_centroid' },
          attributes: {
            food_service: { value: null, source: 'not_collected', verified_status: 'unverified' },
            local_story: { value: 'test value', source: 'fixture', verified_status: 'unverified' },
          },
        },
        'bat-trang': {
          geo: { lat: 21.02, lng: 105.82, precision: 'district_centroid' },
          attributes: {
            food_service: { value: null, source: 'not_collected', verified_status: 'unverified' },
          },
        },
      },
    } as unknown as VillageCoordinateLookup

    const seedExperiences = await loadExperiences(shared)
    const seedExperience = seedExperiences.find(item => item.village_id === seedVillageId)
    expect(seedExperience?.location_source).toBe('district_fallback')
    expect(seedExperience?.village_attributes).toMatchObject({
      food_service: { value: null, source: 'not_collected' },
      local_story: { value: 'test value' },
    })

    const testCandidates = getTestCandidates(undefined, shared)
    const testCandidate = testCandidates.find(item => item.village_id === 'bat-trang')
    expect(testCandidate?.location_source).toBe('from_plus_code')
    expect(testCandidate?.village_attributes).toMatchObject({
      food_service: { value: null, source: 'not_collected' },
    })
  })

  it('leaves villages without coordinates unlocated and ignores unknown attributes as hard filters', () => {
    const unresolved = resolveVillageCoordinate(
      { id: 'missing', name: 'Unknown' },
      { by_village_id: {} },
    )
    expect(unresolved).toBeUndefined()

    const result = applyHardFilters({
      candidates: [{
        id: 'experience',
        verification_status: 'verified',
        published: true,
        village_attributes: {
          food_service: { value: null, source: 'not_collected', verified_status: 'unverified' },
        },
      }],
      profile: {
        ...profile,
        matching_attributes: [{ type: 'food_service', value: 'lunch' }],
      },
    })
    expect(result.passed.map(item => item.id)).toEqual(['experience'])
    expect(result.rejected).toEqual([])
  })

  it('registers only geo and omits unavailable secondary fields from prompt attributes', () => {
    expect(isVillageAttributeFilterable('geo')).toBe(true)
    expect(isVillageAttributeFilterable('food_service')).toBe(false)
    expect(isVillageAttributeFilterable('local_story')).toBe(false)
    expect(buildVillageAttributePromptBlock({
      geo: { value: { lat: 21, lng: 105 }, source: 'fixture', verified_status: 'verified' },
      food_service: { value: null, source: 'not_collected', verified_status: 'unverified' },
      local_story: { value: 'not registered', source: 'fixture', verified_status: 'unverified' },
    })).toBe('')
  })
})

describe('origin and radius uncertainty', () => {
  it('uses the named Ho Guom default only when no origin was provided', () => {
    expect(resolveOriginCoordinates(undefined)).toEqual(DEFAULT_HANOI_ORIGIN)
    expect(resolveOriginCoordinates({ address: 'Unknown place outside lookup' })).toBeUndefined()
    expect(originDisplayNotice(undefined)).toContain('trung tâm Hà Nội (Hồ Gươm)')
    expect(originDisplayNotice({ address: 'Unknown place outside lookup' })).toContain(
      'Chưa xác định được điểm xuất phát',
    )
  })

  it.each([
    { distance: 19, radius: 10, expected: true },
    { distance: 20, radius: 10, expected: true },
    { distance: 20.001, radius: 10, expected: false },
  ])('keeps district estimates until their lower bound exceeds the radius', ({ distance, radius, expected }) => {
    const result = applyHardFilters({
      candidates: [{
        id: 'district-estimate',
        verification_status: 'verified',
        published: true,
        location_source: 'district_fallback',
        distance_source: 'haversine',
        distance_km: distance,
      }],
      profile: { ...profile, hard_constraints: { radius_km: radius } },
    })

    expect(result.passed.some(item => item.id === 'district-estimate')).toBe(expected)
    if (expected && distance >= radius - 10) {
      expect(result.passed[0].flags).toContain('radius_unconfirmed')
    }
  })

  it('uses exact radius boundaries for manual coordinates', () => {
    const result = applyHardFilters({
      candidates: [
        {
          id: 'at-boundary',
          verification_status: 'verified',
          published: true,
          location_source: 'manual_gmaps',
          distance_source: 'haversine',
          distance_km: 10,
        },
        {
          id: 'outside-boundary',
          verification_status: 'verified',
          published: true,
          location_source: 'manual_gmaps',
          distance_source: 'haversine',
          distance_km: 10.000001,
        },
      ],
      profile: { ...profile, hard_constraints: { radius_km: 10 } },
    })

    expect(result.passed.map(item => item.id)).toEqual(['at-boundary'])
    expect(result.rejected).toEqual([{ id: 'outside-boundary', reason: 'radius' }])
  })

  it('uses the same district uncertainty band in the shared constraint engine', async () => {
    const origin = { lat: 21.0285, lng: 105.8542 }
    const candidates = [
      {
        experience_id: 'uncertain',
        location: { lat: origin.lat, lng: origin.lng + 0.14 },
        location_source: 'district_fallback',
        price_per_person: null,
        max_participants: null,
      },
      {
        experience_id: 'certainly-outside',
        location: { lat: origin.lat, lng: origin.lng + 0.2 },
        location_source: 'district_fallback',
        price_per_person: null,
        max_participants: null,
      },
      {
        experience_id: 'unsourced',
        location: { lat: origin.lat, lng: origin.lng + 0.01 },
        location_source: 'ai_estimated',
        price_per_person: null,
        max_participants: null,
      },
    ]

    const result = await applyHardConstraints(candidates, { origin, radius_km: 10 })

    expect(result.map(item => item.experience_id)).toEqual(['uncertain', 'unsourced'])
    expect(result[0].radius_status).toBe('unconfirmed')
    expect(result[0].distance_km).toBeDefined()
    expect(result[1].distance_km).toBeUndefined()
    expect(result[1].radius_status).toBe('unconfirmed')
  })

  it('renders source-specific distance precision and mentions the default origin', () => {
    const message = buildResultsMessage({
      count: 2,
      matches: [
        {
          experience_name: 'Plus code activity',
          price_per_person: 100000,
          distance_km: 1.26,
          distance_source: 'haversine',
          location_source: 'from_plus_code',
        },
        {
          experience_name: 'District activity',
          price_per_person: 100000,
          distance_km: 12.6,
          distance_source: 'haversine',
          location_source: 'district_fallback',
          radius_status: 'unconfirmed',
        },
      ],
      radiusKm: 10,
    })

    expect(message).toContain('Khoảng cách tính từ trung tâm Hà Nội (Hồ Gươm).')
    expect(message).toContain('Cách trung tâm Hà Nội (Hồ Gươm) khoảng 1.3 km (đường chim bay)')
    expect(message).toContain('khoảng 13 km (ước tính theo huyện)')
    expect(message).toContain('chưa xác nhận bán kính')
    expect(message).not.toContain('chưa có dữ liệu khoảng cách')
  })
})
