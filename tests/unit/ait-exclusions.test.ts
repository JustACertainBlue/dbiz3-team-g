import { describe, expect, it } from 'vitest'
import { applyHardConstraints } from '@/lib/matching/constraint-engine'
import { buildTourPreferenceProfile } from '@/lib/ai/extractor'

const candidates = [
  { experience_id: 'e1', village_id: 'v-silk', craft_type: 'Silk/Textile', max_participants: 30, price_per_person: 100000 },
  { experience_id: 'e2', village_id: 'v-pot', craft_type: 'Ceramics', max_participants: 30, price_per_person: 100000 },
  { experience_id: 'e3', village_id: 'v-emb', craft_type: 'Silk/Textile', max_participants: 30, price_per_person: 100000 },
]

describe('exclusions reach the matching result', () => {
  it('a village the Agency excluded is filtered out', async () => {
    const result = await applyHardConstraints(candidates, { group_size: 10, excluded_village_ids: ['v-pot'] } as never)
    expect(result.eligible_candidates.map(c => c.experience_id)).toEqual(['e1', 'e3'])
  })

  it('a craft the Agency excluded is filtered out by craft type', async () => {
    const result = await applyHardConstraints(candidates, { group_size: 10, excluded_crafts: ['silk'] } as never)
    expect(result.eligible_candidates.map(c => c.experience_id)).toEqual(['e2'])
  })

  it('without exclusions nothing changes', async () => {
    const result = await applyHardConstraints(candidates, { group_size: 10 } as never)
    expect(result.eligible_candidates).toHaveLength(3)
  })

  it('the profile carries the exclusions into hard_constraints', async () => {
    const profile = await buildTourPreferenceProfile({ group_size: 10, craft_preference: 'pottery' }, { villages: ['v-pot'], crafts: ['embroidery'] })
    expect((profile.hard_constraints as any).excluded_village_ids).toEqual(['v-pot'])
    expect((profile.hard_constraints as any).excluded_crafts).toEqual(['embroidery'])
  })

  it('no exclusions → no extra keys in hard_constraints', async () => {
    const profile = await buildTourPreferenceProfile({ group_size: 10 })
    expect('excluded_crafts' in profile.hard_constraints).toBe(false)
    expect('excluded_village_ids' in profile.hard_constraints).toBe(false)
  })
})
