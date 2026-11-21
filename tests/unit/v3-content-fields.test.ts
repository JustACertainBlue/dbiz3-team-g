/**
 * UI v3 Đợt 1 content fields (human decision 2026-11-18): shared vocabulary and tolerant readers for the new
 * columns. Rows reach the app as strings (src/lib/db/repository.ts legacyRow: jsonb and text[] → JSON text),
 * and the JSON fixtures may not have the columns at all, so every reader accepts '' and returns an empty value.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  CRAFT_LABELS, PREFERENCE_TO_SUITABLE_FOR, SUITABLE_FOR, craftLabel, parseHighlights, parseInclusions, parseStringList, parseSlots,
  parseVisitNotes, parseTourDetail, parseDistance,
} from '@/lib/explore/vocabulary'

describe('craft labels (7 craft_type values, shared constant)', () => {
  it('maps every craft_type enum value to Vietnamese', () => {
    expect(Object.keys(CRAFT_LABELS).sort()).toEqual(['Ceramics', 'Food/Culinary', 'Metalwork', 'Other', 'Paper/Painting', 'Silk/Textile', 'Woodcarving'])
    expect(craftLabel('Ceramics')).toBe('Gốm sứ')
    expect(craftLabel('Silk/Textile')).toBe('Dệt lụa')
    expect(craftLabel('unknown')).toBe('unknown')
  })
})

describe('suitable_for vocabulary', () => {
  it('is the same list as the migration CHECK constraint', () => {
    const sql = readFileSync('supabase/migrations/20261118120000_hab_ui_v3_content.sql', 'utf8')
    const list = sql.match(/suitable_for <@ ARRAY\[([\s\S]*?)\]::text\[\]/)?.[1] ?? ''
    expect([...list.matchAll(/'([^']+)'/g)].map(m => m[1])).toEqual([...SUITABLE_FOR])
  })
})

describe('villages.highlights (human decision 2026-11-19)', () => {
  it('is a nullable jsonb array of at most 4 items, read with parseHighlights', () => {
    const sql = readFileSync('supabase/migrations/20261118120000_hab_ui_v3_content.sql', 'utf8')
    const villages = sql.match(/ALTER TABLE public\.villages\s+ADD COLUMN[\s\S]*?;/)?.[0] ?? ''
    expect(villages).toMatch(/ADD COLUMN IF NOT EXISTS highlights jsonb/)
    expect(sql).toMatch(/CONSTRAINT village_highlights_shape_chk CHECK \(highlights IS NULL OR \(jsonb_typeof\(highlights\) = 'array' AND jsonb_array_length\(highlights\) <= 4\)\)/)
    expect(parseHighlights('[{"title":"Làng gốm lâu đời","sub":"Nhiều gia đình làm gốm"}]')).toEqual([{ title: 'Làng gốm lâu đời', sub: 'Nhiều gia đình làm gốm' }])
  })
})

describe('PREFERENCE_TO_SUITABLE_FOR', () => {
  it('has exactly one row: culture → Tour văn hoá – di sản, a vocabulary term', () => {
    expect(PREFERENCE_TO_SUITABLE_FOR).toEqual({ culture: 'Tour văn hoá – di sản' })
    expect(SUITABLE_FOR).toContain(PREFERENCE_TO_SUITABLE_FOR.culture)
  })
})

describe('parseHighlights', () => {
  it('reads the new [{title, sub}] shape', () => {
    expect(parseHighlights('[{"title":"Tự tay làm","sub":"Nghệ nhân kèm"},{"title":"Mang về"}]'))
      .toEqual([{ title: 'Tự tay làm', sub: 'Nghệ nhân kèm' }, { title: 'Mang về', sub: '' }])
  })
  it('still reads the old array of strings', () => {
    expect(parseHighlights('["Tự thử bàn xoay","Vuốt thành gốm"]')).toEqual([{ title: 'Tự thử bàn xoay', sub: '' }, { title: 'Vuốt thành gốm', sub: '' }])
  })
  it('returns [] for empty or invalid values', () => {
    expect(parseHighlights('')).toEqual([])
    expect(parseHighlights(undefined)).toEqual([])
    expect(parseHighlights('not json')).toEqual([])
  })
})

describe('parseInclusions', () => {
  it('reads per_guest, included, take_home and notes', () => {
    const value = parseInclusions('{"per_guest":["1 chỗ bàn xoay"],"included":["Đất sét"],"take_home":true,"notes":{"trong_buoi":"Nước uống","chup_anh":"Miễn phí","an_toan":"Hộp sơ cứu","luu_y":"Mặc đồ thoải mái"}}')
    expect(value).toEqual({ per_guest: ['1 chỗ bàn xoay'], included: ['Đất sét'], take_home: true,
      notes: { trong_buoi: 'Nước uống', chup_anh: 'Miễn phí', an_toan: 'Hộp sơ cứu', luu_y: 'Mặc đồ thoải mái' } })
  })
  it('is null when empty', () => {
    expect(parseInclusions('')).toBeNull()
  })
})

describe('other readers', () => {
  it('parseStringList reads text[] as JSON text', () => {
    expect(parseStringList('["Tiếng Việt","Tiếng Anh cơ bản"]')).toEqual(['Tiếng Việt', 'Tiếng Anh cơ bản'])
    expect(parseStringList('')).toEqual([])
  })
  it('parseSlots sorts by start time and keeps HH:MM', () => {
    expect(parseSlots([
      { experience_id: 'e', label: 'Ca chiều', start_time: '14:00:00', end_time: '15:00:00', weekdays: '[1,2,3,4,5]' },
      { experience_id: 'e', label: 'Ca sáng', start_time: '08:30:00', end_time: '09:30:00', weekdays: '[1,2,3,4,5]' },
    ])).toEqual([
      { label: 'Ca sáng', start: '08:30', end: '09:30', weekdays: [1, 2, 3, 4, 5] },
      { label: 'Ca chiều', start: '14:00', end: '15:00', weekdays: [1, 2, 3, 4, 5] },
    ])
  })
  it('village readers', () => {
    expect(parseDistance('13.0')).toBe(13)
    expect(parseDistance('')).toBeNull()
    expect(parseVisitNotes('{"trang_phuc":"Đồ dễ giặt"}')).toEqual({ trang_phuc: 'Đồ dễ giặt', san_pham: '', gio_den: '' })
    expect(parseTourDetail('{"title":"Hợp cho tour nửa ngày!","lines":["a"],"extras":["b"]}')).toEqual({ title: 'Hợp cho tour nửa ngày!', lines: ['a'], extras: ['b'] })
    expect(parseTourDetail('')).toBeNull()
  })
})
