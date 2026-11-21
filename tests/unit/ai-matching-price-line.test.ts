/** Screen 22 card (mockup): the per-guest line under the group total; "đã gồm vật liệu" only when the data says so. */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { perGuest } from '@/app/ai-matching/card-view'

const page = readFileSync('src/app/ai-matching/page.tsx', 'utf8')

describe('per-guest price line', () => {
  it('is total ÷ guests, rounded to a whole dong (after the group discount)', () => {
    expect(perGuest({ kind: 'group', guests: 25, total: 4500000, old: 5000000, note: '' })).toBe(180000)
    expect(perGuest({ kind: 'group', guests: 3, total: 100000, old: null, note: '' })).toBe(33333)
    expect(perGuest({ kind: 'from', perPerson: 200000 })).toBeNull()
  })
  it('is drawn right under the total, before the old price/note', () => {
    const at = (text: string) => { const i = page.indexOf(text); expect(i, text).toBeGreaterThan(-1); return i }
    expect(at('v3r__total')).toBeLessThan(at('v3r__perguest'))
    expect(at('v3r__perguest')).toBeLessThan(at('v3r__old'))
    expect(page).toMatch(/perGuest\(/)
  })
  it('"Đã gồm vật liệu" appears only behind the card.included flag', () => {
    expect(page).toMatch(/rec\.card\?\.included && [^\n]*Đã gồm vật liệu/)
  })
})
