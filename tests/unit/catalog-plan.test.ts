/**
 * Human decision 2026-11-19 (option A): on DEV the 32 seed gallery files are also linked to experiences other than the
 * eight catalog experiences, so `npm run storage:catalog -- --refresh-seed-images` reported "unmapped" and --apply refused.
 * The plan now picks each file's photo from its one original catalog experience, ignores the extra links, replaces each
 * file once, and reports the experiences that share the file and those whose craft differs from the photo's craft.
 * A file without exactly one original catalog experience still blocks --apply ("unmapped").
 */
import { describe, expect, it } from 'vitest'
import { buildCatalogPlan } from '../../scripts/storage/catalog-plan.mjs'

const CERAMICS = 'exp-ceramics', SILK = 'exp-silk'
const crafts = { [CERAMICS]: 'ceramics', [SILK]: 'silk' }
const photos = new Map([['ceramics', { slug: 'ceramics', file: 'ceramics.jpg' }], ['silk', { slug: 'silk', file: 'silk.jpg' }]])
const experiences = new Map([
  [CERAMICS, { name: 'Pottery', craft_type: 'Ceramics' }], [SILK, { name: 'Weaving', craft_type: 'Silk/Textile' }],
  ['exp-a', { name: 'Glaze painting', craft_type: 'Ceramics' }], ['exp-b', { name: 'Silk dyeing', craft_type: 'Silk/Textile' }],
])
const row = (file_id: string, subject_experience: string | null) => ({ file_id, storage_key: `prf-media/${file_id}`, media_type: 'image/jpeg', subject_experience })
const plan = (rows: ReturnType<typeof row>[]) => buildCatalogPlan({ rows, photos, crafts, experiences })

describe('catalog refresh plan for seed files shared with other experiences', () => {
  it('uses the photo of the one original experience and lists the other experiences that share the file', () => {
    const result = plan([row('f1', CERAMICS), row('f1', 'exp-a'), row('f1', 'exp-b')])
    expect(result.missingCrafts).toEqual([])
    expect(result.plan).toHaveLength(1)
    expect(result.plan[0]).toMatchObject({ original: CERAMICS, photo: { slug: 'ceramics' }, shared: ['exp-a', 'exp-b'] })
  })
  it('replaces each file once even when the original experience reaches it twice', () => {
    const result = plan([row('f1', CERAMICS), row('f1', CERAMICS), row('f2', SILK)])
    expect(result.plan.map((item: { row: { file_id: string } }) => item.row.file_id)).toEqual(['f1', 'f2'])
    expect(result.missingCrafts).toEqual([])
  })
  it('lists the sharing experiences whose craft differs from the craft of the photo', () => {
    const result = plan([row('f1', CERAMICS), row('f1', 'exp-a'), row('f1', 'exp-b')])
    expect(result.plan[0].mismatched).toEqual([{ experience_id: 'exp-b', name: 'Silk dyeing', craft_type: 'Silk/Textile' }])
    expect(result.plan[0].photoCraft).toBe('Ceramics')
  })
  it('still blocks a file without an original catalog experience', () => {
    const result = plan([row('f1', CERAMICS), row('f9', 'exp-a')])
    expect(result.missingCrafts).toEqual(['unmapped'])
    expect(result.unresolved).toEqual(['f9'])
    expect(result.plan.map((item: { row: { file_id: string } }) => item.row.file_id)).toEqual(['f1'])
  })
  it('still blocks a file that two original catalog experiences claim', () => {
    const result = plan([row('f1', CERAMICS), row('f1', SILK)])
    expect(result.missingCrafts).toEqual(['unmapped'])
    expect(result.unresolved).toEqual(['f1'])
    expect(result.plan).toEqual([])
  })
  it('reports an original craft that has no catalog photo', () => {
    const result = buildCatalogPlan({ rows: [row('f1', CERAMICS)], photos: new Map(), crafts, experiences })
    expect(result.missingCrafts).toEqual(['ceramics'])
    expect(result.plan).toEqual([])
  })
})
