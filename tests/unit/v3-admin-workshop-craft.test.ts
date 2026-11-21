// Screen 41a, workshop detail: the "Nghề" row shows the village's editorial craft, else the Vietnamese label of craft_type.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { rowCraft } from '@/lib/explore/vocabulary'

const page = readFileSync('src/app/admin/providers/[id]/page.tsx', 'utf8')

describe('workshop detail "Nghề" row', () => {
  it('rowCraft prefers the village editorial_craft', () => {
    expect(rowCraft('Ceramics', { editorial_craft: 'Gốm Bát Tràng' })).toBe('Gốm Bát Tràng')
  })
  it('rowCraft falls back to a Vietnamese label, not the stored English value', () => {
    const label = rowCraft('Ceramics', undefined)
    expect(label).not.toBe('Ceramics')
    expect(label).not.toBe('')
  })
  it('the page fills the row with rowCraft(craft_type, village), not the raw craft_type', () => {
    expect(page).toContain("['Nghề', rowCraft(String(version?.craft_type || ''), village")
    expect(page).not.toContain("['Nghề', String(version?.craft_type")
  })
})
