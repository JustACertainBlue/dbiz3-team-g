import { describe, expect, it } from 'vitest'
import { runAitMatchingPipeline, prioritizeCraftCoverage } from '@/lib/ait/matching-pipeline'

interface CraftCandidate {
  experience_id: string
  provider_id: string
  name: string
  experience_name: string
  village_name: string
  craft_type: string
  experience_type: string
  category: string
  price_per_person: number
  max_participants: number
  provider_status: string
  provider_verification_status: string
  has_published_profile_version: boolean
  tags?: string[]
}

function candidate(id: string, craftType: string, name: string): CraftCandidate {
  return {
    experience_id: id,
    provider_id: `provider-${id}`,
    name,
    experience_name: name,
    village_name: name,
    craft_type: craftType,
    experience_type: 'Workshop/Hands-on',
    category: 'Workshop/Hands-on',
    price_per_person: 100000,
    max_participants: 20,
    provider_status: 'Verified',
    provider_verification_status: 'Approved',
    has_published_profile_version: true,
  }
}

async function match(candidates: CraftCandidate[], crafts: string[]) {
  return runAitMatchingPipeline({
    candidates,
    profile: {
      hard_constraints: {},
      matching_attributes: crafts.map(value => ({ type: 'craft_preference', value, polarity: 'include' })),
    },
    now: Date.parse('2026-01-01T00:00:00Z'),
  })
}

describe('AIT top-five craft coverage', () => {
  it('uses detailed tags to avoid covering the wrong Other craft preference', async () => {
    const result = await match([
      { ...candidate('hat', 'Other', 'Workshop A'), tags: ['làm nón'] },
      { ...candidate('bamboo', 'Other', 'Workshop B'), tags: ['mây tre đan'] },
    ], ['conical hat'])

    const hat = result.rankedCandidates.find(item => item.experience_id === 'hat')
    expect(hat?.match_factors.craft?.matched).toBe(true)
    expect(result.eligibleCandidates.map(item => item.experience_id)).toEqual(['hat'])
    expect(result.rejected).toContainEqual({ id: 'bamboo', reason: 'craft_preference' })
  })

  it('retains the #32 fallback for Other candidates without informative tags', async () => {
    const result = await match([
      candidate('other', 'Other', 'Workshop A'),
    ], ['conical hat', 'bamboo'])

    expect(result.rankedCandidates[0].match_factors.craft?.matched).toBe(true)
  })

  it('includes at least one ranked result for each requested craft when both are available', async () => {
    const result = await match([
      candidate('pottery-1', 'Ceramics', 'Bat Trang pottery'),
      candidate('pottery-2', 'Ceramics', 'Bat Trang pottery 2'),
      candidate('silk-1', 'Silk/Textile', 'Van Phuc silk'),
      candidate('silk-2', 'Silk/Textile', 'Nha Xa silk'),
      candidate('pottery-3', 'Ceramics', 'Kim Lan pottery'),
      candidate('pottery-4', 'Ceramics', 'Bat Trang pottery 4'),
    ], ['pottery', 'silk'])

    expect(result.topMatches.map(card => card.experience_id)).toContain('pottery-1')
    expect(result.topMatches.map(card => card.experience_id)).toContain('silk-1')
    expect(result.topMatches).toHaveLength(5)
  })

  it('covers a less common craft before filling remaining slots by ranking', async () => {
    const candidates = [
      ...Array.from({ length: 8 }, (_, index) => candidate(`pottery-${index}`, 'Ceramics', `Bat Trang pottery ${index}`)),
      candidate('silk-rare', 'Silk/Textile', 'Van Phuc silk'),
    ]
    const result = await match(candidates, ['pottery', 'silk'])
    const ids = result.topMatches.map(card => card.experience_id)

    expect(ids).toContain('silk-rare')
    expect(ids.slice(2)).toEqual(['pottery-1', 'pottery-2', 'pottery-3'])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('does not invent results or label another craft as a missing requested craft', async () => {
    const result = await match([
      candidate('pottery-1', 'Ceramics', 'Bat Trang pottery'),
      candidate('pottery-2', 'Ceramics', 'Kim Lan pottery'),
    ], ['pottery', 'silk'])

    expect(result.topMatches.map(card => card.experience_id)).toEqual(['pottery-1', 'pottery-2'])
    expect(result.rankedCandidates.every(candidate => candidate.match_factors.craft?.preference === 'pottery'
      && candidate.match_factors.craft.matched))
      .toBe(true)
    expect(result.rankedCandidates.some(candidate => candidate.match_factors.craft?.preference === 'silk')).toBe(false)
  })

  it('uses one candidate to cover multiple craft labels without duplicating it', () => {
    const candidates = [{ id: 'multi-match' }, { id: 'ranked-next' }]
    const ordered = prioritizeCraftCoverage(
      candidates,
      ['silk', 'pottery'],
      candidate => candidate.id,
      candidate => candidate.id === 'multi-match',
    )

    expect(ordered.map(candidate => candidate.id)).toEqual(['multi-match', 'ranked-next'])
  })
})
