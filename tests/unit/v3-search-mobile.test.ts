/**
 * Human review 2026-11-19, screen 02 below 900 px: the filter column and the "Mô tả điều đoàn cần" box are hidden; a row
 * with "Lọc (n)" and "Sắp xếp theo" sits above the results; "Lọc" opens a full-screen filter sheet (dialog, title "Lọc",
 * × close, Escape closes and returns focus) with a sticky bottom bar "Xoá bộ lọc" / "Xem N kết quả"; the AI box follows the
 * third result. From 900 px nothing changes.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { seed } from './v3-village-fixtures'

;(globalThis as { React?: typeof React }).React = React
vi.mock('@/lib/explore/seed-repository', () => ({ loadExploreRuntime: async () => seed() }))
vi.mock('@/lib/auth/server-session', () => ({ currentServerSession: async () => ({ role: null, agencyId: null }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => '/explore/search', useSearchParams: () => new URLSearchParams() }))

import { activeFilterCount, clearFiltersHref, parseSearch } from '@/lib/explore/v3-search'
import SearchPage from '@/app/explore/search/page'
import MobileFilters from '@/app/explore/search/MobileFilters'

describe('activeFilterCount / clearFiltersHref', () => {
  it('counts each chosen craft, duration and village, plus budget, 15+ and free-only once each', () => {
    expect(activeFilterCount(parseSearch({}))).toBe(0)
    expect(activeFilterCount(parseSearch({ nghe: ['Làm gốm', 'Dệt lụa'], tg: 'duoi-90', lang: 'v1', tu: '100000', den: '200000', suc: '15', trong: '1' }))).toBe(7)
    expect(activeFilterCount(parseSearch({ q: 'gốm', date: '2026-11-24', guests: '10', sx: 'gia' }))).toBe(0)
  })
  it('clearing keeps the search (q, date, guests) and the sort, drops filters and the page', () => {
    expect(clearFiltersHref({ q: 'gốm', date: '2026-11-24', guests: '10', sx: 'gia', nghe: 'Làm gốm', tu: '1', page: '2' }))
      .toBe('/explore/search?q=g%E1%BB%91m&date=2026-11-24&guests=10&sx=gia')
    expect(clearFiltersHref({ nghe: 'x' })).toBe('/explore/search')
  })
})

describe('screen 02 page', () => {
  it('renders the mobile row and puts the mobile AI box after the third result', async () => {
    const html = renderToStaticMarkup(await SearchPage({ searchParams: { nghe: 'Làm gốm' } }))
    expect(html).toMatch(/<div class="v3s-mobilebar">[\s\S]*?<button type="button" class="v3s-filterbtn" aria-haspopup="dialog" aria-expanded="false">[\s\S]*?Lọc \(1\)<\/button>/)
    const results = html.slice(html.indexOf('<div class="v3s-results">'))
    const order = [...results.matchAll(/<article class="v3-card v3r">|<form class="v3-card v3-need v3s-need-mobile"/g)].map(m => m[0].startsWith('<article') ? 'card' : 'ai')
    expect(order.slice(0, 4)).toEqual(['card', 'card', 'card', 'ai'])
    expect(html).toContain('<aside aria-label="Bộ lọc" class="v3s-aside">')
  })
  it('CSS: below 900 px hide the aside and the head sort, show the mobile row; from 900 px hide the mobile parts', () => {
    const css = readFileSync('src/app/explore/v3/explore-v3.css', 'utf8')
    expect(css).toMatch(/@media \(max-width: 899px\) \{ \.v3s-aside, \.v3s-head \.v3-sort \{ display: none; \} \.v3s-mobilebar \{ display: flex; \} \}/)
    expect(css).toMatch(/@media \(min-width: 900px\) \{ \.v3s-mobilebar, \.v3s-need-mobile \{ display: none; \} \}/)
  })
})

describe('filter sheet', () => {
  const html = renderToStaticMarkup(React.createElement(MobileFilters, { count: 2, total: 5, clearHref: '/explore/search?q=a', initiallyOpen: true },
    React.createElement('p', null, 'PANEL')))
  it('is a full-screen dialog titled "Lọc" with a × close button and the filter panel', () => {
    expect(html).toMatch(/<div class="v3s-sheet" role="dialog" aria-modal="true" aria-labelledby="v3s-sheet-title">/)
    expect(html).toContain('<h2 id="v3s-sheet-title" class="v3s-sheet__title">Lọc</h2>')
    expect(html).toMatch(/<button type="button" class="v3s-sheet__close" aria-label="Đóng bảng lọc"[^>]*>/)
    expect(html).toContain('<p>PANEL</p>')
  })
  it('ends with a sticky bar: "Xoá bộ lọc" and "Xem N kết quả"', () => {
    expect(html).toMatch(/<div class="v3s-sheet__bar"><a class="hab-btn hab-btn--secondary" href="\/explore\/search\?q=a">Xoá bộ lọc<\/a><button type="button" class="hab-btn hab-btn--primary">Xem 5 kết quả<\/button><\/div>/)
    const css = readFileSync('src/app/explore/v3/explore-v3.css', 'utf8')
    expect(css).toMatch(/\.v3s-sheet \{[^}]*position: fixed; inset: 0;/)
    expect(css).toMatch(/\.v3s-sheet__bar \{[^}]*position: sticky; bottom: 0;/)
  })
})
