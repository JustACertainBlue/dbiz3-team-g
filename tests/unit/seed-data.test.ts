/**
 * T004 — Seed data loader verification
 * Loads data/seed/ and validates real values from the Session 5 data package.
 *
 * CONSTITUTION I/IV: Data only from data/. Tests must check real seed values, not invented ones.
 * Workshop 3.1: At least one test loads seed data and checks a value the data package states.
 */
import { describe, it, expect } from 'vitest'
import { loadVillages, loadExperiences } from '@/lib/db/seed-loader'
import { CATALOG_ACTIVITIES, CATALOG_PROVIDERS } from '@/lib/matching/card-resolver'

describe('T004 | Seed Data Loader Verification', () => {
  // villages.csv has 8 rows
  it('loads exactly 8 Hanoi craft villages from data/seed/villages.csv', async () => {
    const villages = await loadVillages()
    expect(villages).toHaveLength(8)
  })

  it('includes active villages Bát Tràng, Vạn Phúc, Chuông, Quất Động, Phú Vinh', async () => {
    const villages = await loadVillages()
    const names = villages.map(v => v.name)
    expect(names).toContain('Bát Tràng')
    expect(names).toContain('Vạn Phúc')
    expect(names).toContain('Chuông')
    expect(names).toContain('Quất Động')
    expect(names).toContain('Phú Vinh')
  })

  it('Hạ Thái is inactive (is_active === false) as stated in seed', async () => {
    const villages = await loadVillages()
    const haThai = villages.find(v => v.name === 'Hạ Thái')
    expect(haThai).toBeDefined()
    expect(haThai!.is_active).toBe(false)
  })

  it('does NOT contain fabricated Đường Lâm village (not in seed)', async () => {
    const villages = await loadVillages()
    const names = villages.map(v => v.name)
    expect(names).not.toContain('Đường Lâm')
  })

  it('loads experiences with numeric price_per_person from data/seed/experiences.csv', async () => {
    const experiences = await loadExperiences()
    expect(experiences.length).toBeGreaterThan(0)
    for (const exp of experiences) {
      expect(typeof exp.price_per_person).toBe('number')
      expect(exp.price_per_person).toBeGreaterThan(0)
    }
  })

  it('all loaded experiences belong to providers with Verified status + published profile', async () => {
    const experiences = await loadExperiences()
    for (const exp of experiences) {
      expect(exp.provider_verification_status).toBe('Approved')
      expect(exp.has_published_profile_version).toBe(true)
    }
  })

  it('seed has 5 verified providers → at most 5 eligible non-archived experiences', async () => {
    // provider_profiles.csv: 5 rows have verification_status=Verified AND published_version_no set
    // (Phú Vinh, Quất Động, Bát Tràng, Vạn Phúc, Chuông); archived Hạ Thái exp excluded
    const experiences = await loadExperiences()
    expect(experiences.length).toBeLessThanOrEqual(5)
    expect(experiences.length).toBeGreaterThanOrEqual(4)
  })

  it('Bát Tràng "Nặn gốm" has max_participants=30 as in seed', async () => {
    const experiences = await loadExperiences()
    const exp = experiences.find(e => e.experience_id === 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69')
    expect(exp).toBeDefined()
    expect(exp!.max_participants).toBe(30)
    expect(exp!.duration_minutes).toBe(105)
  })

  it('Vạn Phúc "Dệt lụa" has max_participants=26 as in seed', async () => {
    const experiences = await loadExperiences()
    const exp = experiences.find(e => e.experience_id === 'c8281688-2dc1-5cb1-9ff6-139df04ba562')
    expect(exp).toBeDefined()
    expect(exp!.max_participants).toBe(26)
  })

  it('Chuông "Làm nón lá" has max_participants=29 as in seed', async () => {
    const experiences = await loadExperiences()
    const exp = experiences.find(e => e.experience_id === 'b70bd0fa-6a81-5aec-9ff6-5303210b2fad')
    expect(exp).toBeDefined()
    expect(exp!.max_participants).toBe(29)
    expect(exp!.duration_minutes).toBe(150)
  })

  it('Quất Động keeps its manually set capacity of 16', async () => {
    const experiences = await loadExperiences()
    const exp = experiences.find(e => e.experience_id === 'bad51dc8-1529-506a-8302-cb0b1d95954c')
    expect(exp).toBeDefined()
    expect(exp!.max_participants).toBe(16)
  })

  it('seeded activity facts follow the approved duration and capacity ranges', async () => {
    const limits: Record<string, { duration: [number, number]; capacity: [number, number] }> = {
      'Workshop/Hands-on': { duration: [90, 180], capacity: [10, 30] },
      Sightseeing: { duration: [45, 90], capacity: [20, 50] },
      'Cultural Show': { duration: [45, 90], capacity: [20, 60] },
    }

    for (const experience of await loadExperiences()) {
      const rule = limits[experience.category]
      expect(rule).toBeDefined()
      const duration = experience.duration_minutes
      const capacity = experience.max_participants
      expect(duration).not.toBeNull()
      expect(capacity).not.toBeNull()
      if (duration == null || capacity == null) continue
      expect(duration).toBeGreaterThanOrEqual(rule.duration[0])
      expect(duration).toBeLessThanOrEqual(rule.duration[1])
      expect(duration % 15).toBe(0)
      expect(capacity).toBeGreaterThanOrEqual(rule.capacity[0])
      expect(capacity).toBeLessThanOrEqual(rule.capacity[1])
    }
  })

  it('AI matching cards use the same duration and capacity as the seed', async () => {
    const experiences = await loadExperiences()
    for (const experience of experiences) {
      const card = CATALOG_ACTIVITIES.find(item => item.experience_id === experience.experience_id)
      expect(card).toBeDefined()
      expect(card!.duration_minutes).toBe(experience.duration_minutes)
      expect(card!.max_participants).toBe(experience.max_participants)
      const providerActivity = CATALOG_PROVIDERS
        .find(item => item.provider_id === experience.provider_id)
        ?.activities.find(item => item.experience_id === experience.experience_id)
      expect(providerActivity?.duration_minutes).toBe(experience.duration_minutes)
    }
  })

  it('attaches only shared-lookup village coordinates and leaves missing villages unknown', async () => {
    const villageIdWithCoordinates = 'c0d0d95f-d59c-5c35-946a-f397e380dd14'
    const coordinateLookup = {
      by_village_id: {
        [villageIdWithCoordinates]: {
          lat: 21.0123456,
          lng: 105.7654321,
          precision: 'district_centroid' as const,
        },
      },
      by_normalized_name: {},
    }

    const enrichedLookup = {
      by_village_id: {
        [villageIdWithCoordinates]: {
          geo: coordinateLookup.by_village_id[villageIdWithCoordinates],
        },
      },
      by_normalized_name: {},
    }
    const experiences = await loadExperiences(enrichedLookup)
    const geocoded = experiences.filter((experience) => experience.village_id === villageIdWithCoordinates)
    const withoutCoordinates = experiences.filter((experience) => experience.village_id !== villageIdWithCoordinates)

    expect(geocoded.length).toBeGreaterThan(0)
    expect(geocoded.map((experience) => experience.location_source))
      .toEqual(geocoded.map(() => 'district_fallback'))
    expect(geocoded.map((experience) => experience.location))
      .toEqual(geocoded.map(() => ({ lat: 21.0123456, lng: 105.7654321 })))
    expect(withoutCoordinates.length).toBeGreaterThan(0)
    expect(withoutCoordinates.map((experience) => experience.location_source))
      .toEqual(withoutCoordinates.map(() => undefined))
    expect(withoutCoordinates.map((experience) => experience.location))
      .toEqual(withoutCoordinates.map(() => undefined))
  })
})
