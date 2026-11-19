/**
 * Human review 2026-11-19 (A3): the 02 filter panel hides options with 0 results, except an option that is selected;
 * a group with no option left is not shown.
 */
import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

;(globalThis as { React?: typeof React }).React = React
let query = ''
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => '/explore/search', useSearchParams: () => new URLSearchParams(query) }))

import FilterPanel from '@/app/explore/search/FilterPanel'

const props = {
  crafts: [{ value: 'Ceramics', label: 'Gốm sứ', n: 3 }, { value: 'Other', label: 'Nghề khác', n: 0 }, { value: 'Silk/Textile', label: 'Dệt lụa', n: 0 }],
  durations: [{ value: 'duoi-90', label: 'Dưới 90 phút', n: 0 }],
  villages: [{ value: 'v1', label: 'Bát Tràng', n: 2 }, { value: 'v2', label: 'Vạn Phúc', n: 0 }],
  fit: 0, cap15: 0, free: 0, guests: 10, dateLabel: '24/11',
}
const labels = (html: string) => [...html.matchAll(/<label class="v3-opt">[\s\S]*?\/>([^<]+)<span class="v3-opt__n">(\d+)<\/span><\/label>/g)].map(m => `${m[1]} ${m[2]}`)

describe('02 filter panel: no 0-result options', () => {
  it('hides every option with 0 results and empty groups', () => {
    query = 'vua=0'
    const html = renderToStaticMarkup(React.createElement(FilterPanel, props))
    expect(labels(html)).toEqual(['Gốm sứ 3', 'Bát Tràng 2'])
    expect(html).not.toContain('<h3>Thời lượng</h3>')
    expect(html).not.toContain('<h3>Lịch ngày 24/11</h3>')
    expect(html).toContain('<h3>Ngân sách mỗi khách</h3>')
  })
  it('keeps a selected option even with 0 results', () => {
    query = 'nghe=Silk%2FTextile&lang=v2&trong=1'
    const html = renderToStaticMarkup(React.createElement(FilterPanel, props))
    expect(labels(html)).toEqual(['Gốm sứ 3', 'Dệt lụa 0', 'Đón được đoàn 10 khách 0', 'Chỉ hiện xưởng còn trống 0', 'Bát Tràng 2', 'Vạn Phúc 0'])
  })
})
