import { describe, expect, it } from 'vitest'
import { detectAllCraftPreferences, detectCraftPreference } from '@/lib/matching/craft-taxonomy'

describe('craft keywords without diacritics and village names (Thu 943bdc8, 8ee5d2f)', () => {
  it.each([
    ['muon lam lua', 'silk'],
    ['xuong theu tay', 'embroidery'],
    ['gom su bat trang', 'pottery'],
    ['cham khac go', 'woodcarving'],
    ['trai nghiem am thuc', 'food'],
    ['duc dong', 'metalwork'],
    ['son mai', 'painting'],
  ])('"%s" → %s', (text, craft) => {
    expect(detectCraftPreference(text)).toBe(craft)
  })

  it.each([
    ['Bát Tràng', 'pottery'],
    ['Kim Lan', 'pottery'],
    ['Vạn Phúc', 'silk'],
    ['Quất Động', 'embroidery'],
    ['Chàng Sơn', 'woodcarving'],
    ['Chuông', 'conical hat'],
    ['Phú Vinh', 'bamboo'],
  ])('village %s → %s', (village, craft) => {
    expect(detectCraftPreference(`đoàn muốn đi ${village}`)).toBe(craft)
  })

  it('several crafts without diacritics keep their order', () => {
    expect(detectAllCraftPreferences('gom va lua')).toEqual(['pottery', 'silk'])
  })

  it('ordinary words of English or Vietnamese are not read as a craft', () => {
    for (const text of ['we may go there next month', 'non-stop trip', 'chuong trinh 2 ngay', 'tac gia', 'duc tin', 'moc cau']) {
      expect(detectCraftPreference(text), text).toBeUndefined()
    }
  })

  it('the keywords that were already supported still work', () => {
    expect(detectCraftPreference('silk weaving')).toBe('silk')
    expect(detectCraftPreference('làm gốm')).toBe('pottery')
    expect(detectCraftPreference('mây tre đan')).toBe('bamboo')
    expect(detectCraftPreference('nón lá')).toBe('conical hat')
  })
})
