/**
 * Human review 2026-11-19 (A2): the craft label on cards (01/21/24), result cards (02/03), 04/23 and 24 uses
 * villages.editorial_craft when the workshop's craft_type is the "Other" group; otherwise the Vietnamese craft_type label.
 * 03a "nghề · khu vực" always uses editorial_craft, falling back to the craft_type label.
 */
import { describe, expect, it } from 'vitest'
import { eligibleRows } from '@/lib/explore/catalog'
import { rowCraft } from '@/lib/explore/vocabulary'
import { cardView } from '@/lib/explore/v3-home'
import { resultView } from '@/lib/explore/v3-search'
import { detailView } from '@/lib/explore/v3-detail'
import { providerView } from '@/lib/explore/v3-provider'
import { villageCards } from '@/lib/explore/v3-village'
import { seed as baseSeed } from './v3-village-fixtures'

function seed() {
  const data = baseSeed()
  data.villages = data.villages.map(row => row.village_id === 'v3' ? { ...row, editorial_craft: 'Làm nón lá' } : row)
  data.profile_media = [...data.profile_media, { profile_media_id: 'm9', file_id: 'f2', experience_id: 'e6', display_order: '0' }]
  return data
}

describe('rowCraft', () => {
  it('uses editorial_craft only for the "Other" group', () => {
    expect(rowCraft('Other', { editorial_craft: 'Làm nón lá' })).toBe('Làm nón lá')
    expect(rowCraft('Other', { editorial_craft: '' })).toBe('Nghề khác')
    expect(rowCraft('Ceramics', { editorial_craft: 'Làm gốm' })).toBe('Gốm sứ')
  })
})

describe('craft label on screens', () => {
  const data = seed()
  const row = eligibleRows(data).find(item => item.experience.experience_id === 'e6')!
  it('cards, result cards, 04/23 and 24 show the village craft for an "Other" workshop', () => {
    expect(cardView(data, row, []).craft).toBe('Làm nón lá')
    expect(resultView(data, row, { date: '', guests: null }, false).craft).toBe('Làm nón lá')
    expect(detailView(data, 'e6', { kind: 'guest' }, { date: '', guests: null }, [], false)!.eyebrow).toMatch(/^LÀM NÓN LÁ · /)
    expect(providerView(data, 'p4', { kind: 'guest' }, new Date('2026-11-18T03:00:00Z'), false)!.eyebrow).toMatch(/^LÀM NÓN LÁ · /)
  })
  it('keeps the craft_type label for other groups', () => {
    const ceramics = eligibleRows(data).find(item => item.experience.experience_id === 'e1')!
    expect(cardView(data, ceramics, []).craft).toBe('Gốm sứ')
  })
  it('03a uses editorial_craft for every village, else the craft_type label', () => {
    expect(villageCards(data).map(card => [card.name, card.craft])).toEqual([['Bát Tràng', 'Làm gốm'], ['Chuông', 'Làm nón lá'], ['Vạn Phúc', 'Dệt lụa']])
  })
})
