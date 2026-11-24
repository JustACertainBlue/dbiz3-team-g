/**
 * Human review 2026-11-19, second round (rule changed from A2): the craft label is always the village's
 * editorial_craft, else the Vietnamese craft_type label — cards 01/21/02/03/24, heads of 04/23/24, the 03a craft line
 * and the craft filters of 02 and 03a.
 */
import { describe, expect, it } from 'vitest'
import { eligibleRows } from '@/lib/explore/catalog'
import { rowCraft } from '@/lib/explore/vocabulary'
import { cardView } from '@/lib/explore/v3-home'
import { parseSearch, resultView, searchExperiences } from '@/lib/explore/v3-search'
import { detailView } from '@/lib/explore/v3-detail'
import { providerView } from '@/lib/explore/v3-provider'
import { villageCards, villageList } from '@/lib/explore/v3-village'
import { seed as baseSeed } from './v3-village-fixtures'

function seed() {
  const data = baseSeed()
  data.villages = data.villages.map(row => row.village_id === 'v3' ? { ...row, editorial_craft: 'Làm nón lá' } : row)
  data.profile_media = [...data.profile_media, { profile_media_id: 'm9', file_id: 'f2', experience_id: 'e6', display_order: '0' }]
  return data
}

describe('rowCraft', () => {
  it('uses the village editorial_craft for every craft_type, else the craft_type label', () => {
    expect(rowCraft('Other', { editorial_craft: 'Làm nón lá' })).toBe('Làm nón lá')
    expect(rowCraft('Silk/Textile', { editorial_craft: 'Thêu tay' })).toBe('Thêu tay')
    expect(rowCraft('Other', { editorial_craft: '' })).toBe('Nghề khác')
    expect(rowCraft('Ceramics', {})).toBe('Gốm sứ')
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
  it('uses the village craft for other groups too (Bát Tràng: Làm gốm), the craft_type label without one', () => {
    const ceramics = eligibleRows(data).find(item => item.experience.experience_id === 'e1')!
    expect(cardView(data, ceramics, []).craft).toBe('Làm gốm')
    const silk = eligibleRows(data).find(item => item.experience.experience_id === 'e5')!
    expect(cardView(data, silk, []).craft).toBe('Dệt lụa')
  })
  it('the 02 and 03a craft filters list the same labels', () => {
    expect(searchExperiences(data, parseSearch({}), { kind: 'guest' }).facets.crafts.map(item => [item.value, item.label, item.n]))
      .toEqual([['Dệt lụa', 'Dệt lụa', 1], ['Làm gốm', 'Làm gốm', 4], ['Làm nón lá', 'Làm nón lá', 1]])
    expect(searchExperiences(data, parseSearch({ nghe: 'Làm nón lá' }), { kind: 'guest' }).items.map(item => item.id)).toEqual(['e6'])
    expect(villageList(data, {}).facets).toEqual([{ value: 'Dệt lụa', label: 'Dệt lụa', n: 1 }, { value: 'Làm gốm', label: 'Làm gốm', n: 1 }, { value: 'Làm nón lá', label: 'Làm nón lá', n: 1 }])
  })
  it('03a uses editorial_craft for every village, else the craft_type label', () => {
    expect(villageCards(data).map(card => [card.name, card.craft])).toEqual([['Bát Tràng', 'Làm gốm'], ['Chuông', 'Làm nón lá'], ['Vạn Phúc', 'Dệt lụa']])
  })
})
