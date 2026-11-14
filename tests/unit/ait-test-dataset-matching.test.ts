import { describe, it, expect } from 'vitest'
import {
  isTestPrompt,
  isTestConversation,
  getTestCandidates,
  getTestAllExperiences,
  resolveTestVillageCards,
  resolveTestProviderCards,
  resolveTestActivityCards,
} from '@/lib/matching/test-dataset'
import { applyHardConstraints } from '@/lib/matching/constraint-engine'
import { rankCandidates } from '@/lib/matching/scoring-engine'
import { buildRecommendations } from '@/lib/matching/recommendation-service'

describe('AI Matching with Test Dataset (villages_providers_activities_merged.json)', () => {
  it('identifies test prompt correctly', () => {
    expect(isTestPrompt('test')).toBe(true)
    expect(isTestPrompt('Test')).toBe(true)
    expect(isTestPrompt('test tour 15 người làng gốm')).toBe(true)
    expect(isTestPrompt('Tôi muốn tìm xưởng gốm')).toBe(false)
    expect(isTestPrompt('chuyến đi tốt đẹp')).toBe(false)
  })

  it('keeps test mode active on later turns in the same conversation', () => {
    expect(isTestConversation([
      { sender: 'Agency', text: 'test tour' },
      { sender: 'Assistant', text: 'Please provide more details.' },
      { sender: 'Agency', text: '10 pax from Hoàn Kiếm' },
    ])).toBe(true)
    expect(isTestConversation([
      { sender: 'Assistant', text: 'Try the test tour' },
      { sender: 'Agency', text: '10 pax from Hoàn Kiếm' },
    ])).toBe(false)
  })

  it('loads test candidates solely from the test JSON file', () => {
    const candidates = getTestCandidates()
    expect(candidates.length).toBe(30)

    // All test candidates must have valid properties
    for (const c of candidates) {
      expect(c.experience_id).toBeTruthy()
      expect(c.provider_id).toBeTruthy()
      expect(c.village_id).toBeTruthy()
      expect(c.village_name).toBeTruthy()
      expect(c.name).toBeTruthy()
      expect(c.category).toBeTruthy()
      expect(typeof c.price_per_person).toBe('number')
      expect(c.provider_status).toBe('Verified')
      expect(c.has_published_profile_version).toBe(true)
    }

    // Specific known activities from the test file
    const batTrang = candidates.find(c => c.experience_id === 'bat-trang-a01')
    expect(batTrang).toBeDefined()
    expect(batTrang?.village_name).toBe('Làng gốm Bát Tràng')
    expect(batTrang?.image_url).toBe('/api/ait/test-media/activities/bat-trang-a01.jpg')

    const changSon = candidates.find(c => c.experience_id === 'chang-son-a01')
    expect(changSon).toBeDefined()
    expect(changSon?.village_name).toBe('Làng quạt giấy Chàng Sơn')

    const daoThuc = candidates.find(c => c.experience_id === 'dao-thuc-a01')
    expect(daoThuc).toBeDefined()
    expect(daoThuc?.village_name).toBe('Làng múa rối nước Đào Thục')
  })

  it('resolves test village, provider and activity cards from test dataset', () => {
    const villages = resolveTestVillageCards('gốm bát tràng')
    expect(villages.length).toBeGreaterThan(0)
    expect(villages[0].name).toContain('Bát Tràng')
    expect(villages[0].image_url).toBe('/api/ait/test-media/villages/bat-trang.jpg')

    const providers = resolveTestProviderCards('quạt chàng sơn')
    expect(providers.length).toBeGreaterThan(0)
    expect(providers[0].village_name).toContain('Chàng Sơn')

    const activities = resolveTestActivityCards('rối nước')
    expect(activities.length).toBeGreaterThan(0)
    expect(activities[0].village_name).toContain('Đào Thục')

    const batTrangProviders = resolveTestProviderCards('xưởng gốm Bát Tràng')
    expect(batTrangProviders[0].image_url).toBe('/api/ait/test-media/providers/bat-trang-p01.jpg')

    const batTrangActivities = resolveTestActivityCards('trải nghiệm gốm Bát Tràng')
    expect(batTrangActivities[0].image_url).toBe('/api/ait/test-media/activities/bat-trang-a01.jpg')
  })

  it('executes full matching pipeline on test candidates without touching system seed data', async () => {
    const candidates = getTestCandidates()
    const profile = {
      hard_constraints: {
        group_size: 15,
        max_budget_per_person: 250000,
        target_date_or_range: { date: '2026-11-20' },
      },
      matching_attributes: [
        { type: 'craft_preference', value: 'pottery' },
        { type: 'experience_type', value: 'Workshop/Hands-on' },
      ],
      preference_weights: {
        experience_fit: 0.4,
        route_convenience: 0.25,
        agency_preferences: 0.2,
        provider_quality: 0.15,
      },
    }

    const filtered = await applyHardConstraints(candidates, profile.hard_constraints)
    expect(filtered.eligible_candidates.length).toBeGreaterThan(0)

    const ranked = await rankCandidates(filtered.eligible_candidates, profile)
    expect(ranked.length).toBeGreaterThan(0)

    // Pottery experiences should rank highest
    const topMatch = ranked[0]
    expect(topMatch.craft_type).toBe('Ceramics')
    expect(topMatch.match_score).toBeGreaterThanOrEqual(60)

    const recs = await buildRecommendations(ranked)
    expect(recs.top_matches.length).toBeGreaterThan(0)
    expect(recs.top_matches[0].experience_id).toBe(topMatch.experience_id)
    expect(recs.top_matches[0].image_url).toMatch(/^\/api\/ait\/test-media\/activities\/.+\.jpg$/)
  })

  it('ranks activities from cheapest to highest when user requests low price', async () => {
    const candidates = getTestCandidates()
    const profile = {
      price_sort: 'lowest',
      hard_constraints: { group_size: 10, max_budget_per_person: 500000 },
      matching_attributes: [{ type: 'price_preference', value: 'lowest' }],
      preference_weights: { experience_fit: 0.4, route_convenience: 0.25, agency_preferences: 0.2, provider_quality: 0.15 },
    }

    const filtered = await applyHardConstraints(candidates, profile.hard_constraints)
    const ranked = await rankCandidates(filtered.eligible_candidates, profile)

    expect(ranked.length).toBeGreaterThan(1)
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].price_per_person).toBeLessThanOrEqual(ranked[i + 1].price_per_person)
    }
  })

  it('ranks activities from highest to cheapest when user requests high price / premium', async () => {
    const candidates = getTestCandidates()
    const profile = {
      price_sort: 'highest',
      hard_constraints: { group_size: 10, max_budget_per_person: 500000 },
      matching_attributes: [{ type: 'price_preference', value: 'highest' }],
      preference_weights: { experience_fit: 0.4, route_convenience: 0.25, agency_preferences: 0.2, provider_quality: 0.15 },
    }

    const filtered = await applyHardConstraints(candidates, profile.hard_constraints)
    const ranked = await rankCandidates(filtered.eligible_candidates, profile)

    expect(ranked.length).toBeGreaterThan(1)
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].price_per_person).toBeGreaterThanOrEqual(ranked[i + 1].price_per_person)
    }
  })
})
