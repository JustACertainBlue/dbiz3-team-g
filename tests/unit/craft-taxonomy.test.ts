import { describe, expect, it } from 'vitest'
import { craftTypeForPreference, detectCraftPreference, matchesCraftPreference } from '@/lib/matching/craft-taxonomy'

// T037 (Round 3, D5): every keyword of spec #32 maps to its Provider craft_type.
const MAPPING: Record<string, string[]> = {
  'Silk/Textile': ['silk', 'lụa', 'embroidery', 'thêu', 'textile'],
  Ceramics: ['pottery', 'ceramic', 'gốm'],
  Woodcarving: ['wood', 'woodcarving', 'carving', 'gỗ', 'tạc'],
  'Food/Culinary': ['food', 'cooking', 'culinary', 'ẩm thực'],
  Metalwork: ['metal', 'bronze', 'đúc', 'đúc đồng', 'đồ đồng'],
  'Paper/Painting': ['lacquer', 'painting', 'paper', 'sơn mài', 'tranh'],
  Other: ['conical hat', 'nón', 'bamboo', 'rattan', 'mây', 'tre'],
}

describe('T037 | #32 craft preference → craft_type', () => {
  for (const [craftType, keywords] of Object.entries(MAPPING)) {
    it.each(keywords)(`"%s" → ${craftType}`, keyword => {
      const preference = detectCraftPreference(`We would like ${keyword} for our group`)
      expect(preference).toBeDefined()
      expect(craftTypeForPreference(preference!)).toBe(craftType)
    })
  }

  it('no craft keyword → no preference', () => {
    expect(detectCraftPreference('10 pax on 2026-11-20 from Hoàn Kiếm')).toBeUndefined()
  })
})

describe('#37 | "đồng" alone is the currency, not a craft', () => {
  it.each(['budget 500.000 đồng per person', 'đồng'])('"%s" → no preference', text => {
    expect(detectCraftPreference(text)).toBeUndefined()
  })
})

describe('craft preference matching', () => {
  it('accepts an exact specific craft_type without requiring candidate names', () => {
    expect(matchesCraftPreference('silk', { craft_type: 'Silk/Textile' })).toBe(true)
  })

  it('uses informative tags to distinguish generic Other craft types', () => {
    expect(matchesCraftPreference('conical hat', { craft_type: 'Other', tags: ['làm nón'] })).toBe(true)
    expect(matchesCraftPreference('bamboo', { craft_type: 'Other', tags: ['mây tre đan'] })).toBe(true)
    expect(matchesCraftPreference('conical hat', { craft_type: 'Other', tags: ['mây tre đan'] })).toBe(false)
    expect(matchesCraftPreference('bamboo', { craft_type: 'Other', tags: ['làm nón'] })).toBe(false)
  })

  it('preserves the #32 Other fallback when tags are missing or uninformative', () => {
    expect(matchesCraftPreference('conical hat', { craft_type: 'Other' })).toBe(true)
    expect(matchesCraftPreference('bamboo', { craft_type: 'Other', tags: ['traditional craft'] })).toBe(true)
    expect(matchesCraftPreference('conical hat', { craft_type: 'Ceramics' })).toBe(false)
  })
})
