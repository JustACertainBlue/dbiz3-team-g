import { describe, expect, it } from 'vitest'
import { loadExperiences, loadVillages } from '@/lib/db/seed-loader'
import {
  getTestCandidates,
} from '@/lib/matching/test-dataset'
import { applyHardConstraints } from '@/lib/matching/constraint-engine'
import { runAitMatchingPipeline } from '@/lib/ait/matching-pipeline'
import { buildResultsMessage } from '@/lib/ait/messages'
import { haversineDistanceKm } from '@/lib/matching/geo'
import {
  DEFAULT_VILLAGE_COORDINATE_LOOKUP,
  resolveVillageCoordinate,
  type VillageCoordinateLookup,
} from '@/lib/matching/village-coordinate-lookup'

const lookup = (
  byVillageId: Record<string, {
    lat: number
    lng: number
    precision: 'plus_code' | 'district_centroid'
  }> = {},
) => ({
  by_village_id: Object.fromEntries(Object.entries(byVillageId).map(([id, geo]) => [
    id,
    { geo },
  ])),
  by_normalized_name: {},
})

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

describe('shared village coordinate lookup', () => {
  it('resolves coordinate sources in manual, Plus Code, approximate, district order', () => {
    const records: VillageCoordinateLookup = {
      by_village_id: {
        village: {
          geo: {
            lat: 21.1,
            lng: 105.9,
            precision: 'district_centroid',
            source: 'Photon',
            verified_status: 'unverified',
          },
        },
      },
      by_normalized_name: {
        'test village': {
          geo: {
            lat: 21.2,
            lng: 105.8,
            precision: 'approximate',
            source: 'approximate',
            verified_status: 'unverified',
          },
        },
      },
      manual_by_normalized_key: {
        'test village': { lat: 21.3, lng: 105.7, source: 'manual' },
      },
    }

    expect(resolveVillageCoordinate({ id: 'village', name: 'Test Village' }, records))
      .toMatchObject({
        location: { lat: 21.3, lng: 105.7 },
        location_source: 'manual_gmaps',
      })
    expect(resolveVillageCoordinate({
      id: 'village',
      name: 'Test Village',
    }, { ...records, manual_by_normalized_key: {} })).toMatchObject({
      location: { lat: 21.2, lng: 105.8 },
      location_source: 'approximate',
    })
    expect(resolveVillageCoordinate({
      id: 'village',
      name: 'Test Village',
    }, { ...records, manual_by_normalized_key: {} }, { lat: 21.25, lng: 105.75 }))
      .toMatchObject({
        location: { lat: 21.25, lng: 105.75 },
        location_source: 'from_plus_code',
      })
  })

  it('assigns reviewed locations to all eight seed villages and fourteen test villages', async () => {
    const seedVillages = await loadVillages()
    expect(seedVillages).toHaveLength(8)
    const seedAssignments = seedVillages.map(village =>
      resolveVillageCoordinate({
        id: village.village_id,
        name: village.name,
      })
    )
    expect(seedAssignments.every(assignment =>
      assignment?.location && assignment.location_source
    )).toBe(true)

    const testCandidates = getTestCandidates()
    const fixtureVillages = new Map(
      testCandidates.map(candidate => [candidate.village_id, candidate])
    )
    expect(fixtureVillages.size).toBe(14)
    expect([...fixtureVillages.values()].every(candidate =>
      candidate.location && candidate.location_source
    )).toBe(true)

    expect(DEFAULT_VILLAGE_COORDINATE_LOOKUP.by_village_id?.['phung-xa']?.geo).toMatchObject({
      lat: 20.72611,
      lng: 105.70667,
      source: 'manual',
      verified_status: 'verified',
    })
    expect(DEFAULT_VILLAGE_COORDINATE_LOOKUP.by_village_id?.['van-phuc']?.geo).toMatchObject({
      source: 'manual',
      verified_status: 'verified',
    })
    expect(DEFAULT_VILLAGE_COORDINATE_LOOKUP.by_village_id?.['ba-duong-noi']?.geo).toMatchObject({
      source: 'manual',
      verified_status: 'verified',
    })
    const geoRecords = Object.values(DEFAULT_VILLAGE_COORDINATE_LOOKUP.by_village_id ?? {})
      .map(record => record.geo)
      .filter(Boolean)
    expect(geoRecords).toHaveLength(22)
    expect(geoRecords.every(geo => geo?.source && geo.verified_status)).toBe(true)
  })

  it('resolves coordinates by id first and translates precision into location source', () => {
    const records = lookup({
      'seed-village': { lat: 21.01, lng: 105.81, precision: 'district_centroid' },
    })

    expect(resolveVillageCoordinate({
      id: 'seed-village',
      name: 'Bát Tràng',
    }, records)).toEqual({
      location: { lat: 21.01, lng: 105.81 },
      location_source: 'district_fallback',
    })
    expect(resolveVillageCoordinate({
      id: 'missing-village',
      name: 'Bát Tràng',
    }, {
      ...records,
      by_normalized_name: {
        'bat trang': { geo: { lat: 21.02, lng: 105.82, precision: 'plus_code' } },
      },
    })).toEqual({
      location: { lat: 21.02, lng: 105.82 },
      location_source: 'from_plus_code',
    })
    expect(resolveVillageCoordinate({ id: 'not-reviewed', name: 'Chưa duyệt' })).toBeUndefined()
  })

  it('applies the shared lookup to seeded experiences without assigning unknown locations', async () => {
    const lookupWithBatTrang = lookup({
      '20896522-6235-5699-aeaf-f48b8150d895': {
        lat: 21.01,
        lng: 105.81,
        precision: 'district_centroid',
      },
    })
    const experiences = await loadExperiences(lookupWithBatTrang)
    const batTrangExperiences = experiences.filter((experience) =>
      experience.village_id === '20896522-6235-5699-aeaf-f48b8150d895'
    )

    expect(batTrangExperiences.length).toBeGreaterThan(0)
    expect(batTrangExperiences.every((experience) =>
      experience.location_source === 'district_fallback'
      && experience.location?.lat === 21.01
      && experience.location.lng === 105.81
    )).toBe(true)

    const withoutLookup = await loadExperiences(lookup())
    const unknown = withoutLookup.find((experience) =>
      experience.village_id === '20896522-6235-5699-aeaf-f48b8150d895'
    )
    expect(unknown?.location).toBeUndefined()
    expect(unknown?.location_source).toBeUndefined()
  })

  it('applies the same shared lookup to test candidates and keeps unlocated candidates unknown', async () => {
    const lookupWithBatTrang = lookup({
      'bat-trang': { lat: 21.01, lng: 105.81, precision: 'district_centroid' },
    })
    const candidates = getTestCandidates(undefined, lookupWithBatTrang)
    const batTrangCandidates = candidates.filter((candidate) => candidate.village_id === 'bat-trang')

    expect(batTrangCandidates.length).toBeGreaterThan(0)
    expect(batTrangCandidates.every((candidate) =>
      candidate.location_source === 'from_plus_code'
      && candidate.location !== undefined
    )).toBe(true)

    const withoutLookup = getTestCandidates(undefined, lookup())
    const noCoordinateCandidate = withoutLookup.find((candidate) => !candidate.location)
    if (!noCoordinateCandidate) throw new Error('Expected an unlocated test fixture candidate')
    const result = await runAitMatchingPipeline({
      candidates: [noCoordinateCandidate],
      profile: {
        ...profile,
        hard_constraints: { origin: { lat: 21.03, lng: 105.85 } },
      },
    })
    const card = result.topMatches[0]
    expect(card.distance_km).toBeNull()
    expect(buildResultsMessage({
      count: 1,
      matches: [{
        experience_name: card.experience_name,
        price_per_person: card.price_per_person,
        distance_km: card.distance_km,
      }],
    })).not.toContain('chưa có dữ liệu khoảng cách')
  })

  it('keeps an exact radius-boundary plus-code candidate in the test dataset', async () => {
    const candidate = getTestCandidates().find((item) => item.location_source === 'from_plus_code')
    expect(candidate?.location).toBeDefined()
    if (!candidate?.location) throw new Error('Expected a test fixture plus-code location')

    const origin = { lat: candidate.location.lat, lng: candidate.location.lng + 0.01 }
    const radiusKm = haversineDistanceKm(origin, candidate.location)
    expect(radiusKm).toEqual(expect.any(Number))
    if (radiusKm === undefined) throw new Error('Expected a measured test fixture distance')

    const boundary = await applyHardConstraints([candidate], { origin, radius_km: radiusKm })
    const justOutside = await applyHardConstraints([candidate], {
      origin,
      radius_km: radiusKm - 0.000001,
    })

    expect(boundary.eligible_candidates).toHaveLength(1)
    expect(boundary.eligible_candidates[0].distance_km).toBe(radiusKm)
    expect(justOutside.eligible_candidates).toHaveLength(1)
  })
})
