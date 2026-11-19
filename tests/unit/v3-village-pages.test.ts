/**
 * UI v3 Đợt 1, screens 03 (/village/[villageId]) and 03a (/villages), mockup pack 19/11/2026: rendered pages.
 * Replaces the source-text checks of the old client page in vil030-card-grid / vil030-experience-cards (#248):
 * experience images stay in a bounded card, each card names its workshop, and "Giá từ … /khách" is shown.
 */
import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { seed } from './v3-village-fixtures'

;(globalThis as { React?: typeof React }).React = React

let role: string | null = null
vi.mock('@/lib/explore/seed-repository', () => ({ loadExploreRuntime: async () => seed() }))
vi.mock('@/lib/auth/server-session', () => ({ currentServerSession: async () => ({ role, agencyId: null }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }), notFound: () => { throw new Error('notFound') } }))

import VillagePage from '@/app/village/[villageId]/page'
import VillagesPage from '@/app/villages/page'

const text = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ')

describe('screen 03 /village/[villageId]', () => {
  it('renders the head, highlights with the counter second, tabs, why chips, experiences, workshops and notes', async () => {
    const html = renderToStaticMarkup(await VillagePage({ params: { villageId: 'v1' }, searchParams: {} }))
    const t = text(html)
    expect(t).toContain('LÀNG NGHỀ LÀM GỐM')
    expect(html).toMatch(/<h1 class="v3d-h1">Làng Bát Tràng<\/h1>/)
    expect(t).toContain('Bát Tràng, Gia Lâm, Hà Nội · Cách trung tâm khoảng 13 km')
    expect(t).toMatch(/Làng gốm lâu đời Nhiều gia đình làm gốm 4 trải nghiệm ở 2 xưởng Xem nghệ nhân làm việc/)
    expect(t).toContain('Trải nghiệm (4)')
    expect(t).toContain('Xưởng & nghệ nhân (2)')
    expect(t).toContain('Vì sao nên đưa đoàn đến Bát Tràng Đoàn học sinh Khách quốc tế Tour nửa ngày')
    expect(t).toContain('Hoạt động nổi bật In hoa văn lên đĩa gốm, nặn gốm thủ công, nặn tượng nhỏ')
    expect(t).toContain('Chủ xưởng: Kiều Anh Thư')
    expect(t).toContain('Xưởng nghỉ Thứ 7, Chủ nhật.')
    expect(html).toContain('href="/explore/search?lang=v1"')
    expect(html).toContain('href="/villages"')
    expect(t).not.toMatch(/Xung quanh làng|Phí tham quan|Chỗ đỗ xe|ưa thích/)
  })
  it('#248: experience cards keep the image in the card media box, name the workshop and show "Giá từ … /khách"', async () => {
    const html = renderToStaticMarkup(await VillagePage({ params: { villageId: 'v1' }, searchParams: {} }))
    const cards = html.match(/<article class="v3-card v3r">[\s\S]*?<\/article>/g) ?? []
    expect(cards).toHaveLength(3)
    expect(cards[1]).toMatch(/<a class="v3r__media"[^>]*>[\s\S]*?<img[^>]*src="\/api\/prf\/media\/f1"/)
    expect(text(cards[1])).toContain('Xưởng thủ công Bát Tràng')
    expect(text(cards[1])).toMatch(/Giá từ 150\.000\s?₫ \/khách/)
  })
  it('a village without any image has no gallery (no empty village frame); empty notes hide the tab and the section', async () => {
    const html = renderToStaticMarkup(await VillagePage({ params: { villageId: 'v3' }, searchParams: {} }))
    expect(html).not.toContain('v3p-mosaic')
    expect(html).not.toContain('id="luu-y"')
    await expect(VillagePage({ params: { villageId: 'v4' }, searchParams: {} })).rejects.toThrow('notFound')
  })
})

describe('screen 03a /villages', () => {
  it('lists villages with image, craft · area, counts and a distance line only when known', async () => {
    const html = renderToStaticMarkup(await VillagesPage({ searchParams: {} }))
    const t = text(html)
    expect(t).toContain('2 làng đang nhận đoàn.')
    expect(t).toContain('Tất cả (2) Dệt lụa (1) Làm gốm (1)')
    const cards = html.match(/<a class="v3-card v3l-card"[\s\S]*?<\/a>/g) ?? []
    expect(cards.map(card => text(card).trim())).toEqual([
      'Bát Tràng Làm gốm · Gia Lâm, Hà Nội 2 xưởng · 4 trải nghiệm Cách trung tâm khoảng 13 km',
      'Vạn Phúc Dệt lụa · Hà Đông, Hà Nội 1 xưởng · 1 trải nghiệm',
    ])
    expect(t).not.toContain('Chuông')
    expect(t).toContain('Hiển thị 1–2 / 2 làng nghề')
  })
  it('filters by craft and marks the chosen chip', async () => {
    const html = renderToStaticMarkup(await VillagesPage({ searchParams: { nghe: 'Dệt lụa' } }))
    const chip = html.match(/<a class="v3l-chip"[^>]*>Dệt lụa \(1\)<\/a>/)?.[0] ?? ''
    expect(decodeURIComponent(chip.match(/href="([^"]+)"/)![1]).replace(/\+/g, ' ')).toBe('/villages?nghe=Dệt lụa')
    expect(chip).toContain('aria-current="page"')
    expect((html.match(/v3l-card"/g) ?? []).length).toBe(1)
  })
})

describe('screen 03 AI block for a Guest (human review 2026-11-19, A4)', () => {
  it('has no login hint line and no "Đăng nhập để dùng Ghép tour AI" button; send and chips lead to /login', async () => {
    role = null
    const html = renderToStaticMarkup(await VillagePage({ params: { villageId: 'v1' }, searchParams: {} }))
    const box = html.match(/<div class="v3-aibox"[\s\S]*?<\/div><\/section>/)?.[0] ?? ''
    expect(box).not.toBe('')
    expect(box).not.toContain('Đăng nhập để dùng Ghép tour AI')
    expect(box).not.toContain('v3-ainote')
    expect(box).toMatch(/<form class="v3-airow" action="\/login" method="get">/)
    expect([...box.matchAll(/<a class="v3-aiq" href="([^"]+)"/g)].map(m => m[1])).toEqual(['/login', '/login', '/login'])
  })
})

describe('screen 03 experience cards (human review 2026-11-19)', () => {
  it('have no "Cách trung tâm Hà Nội khoảng … km" line; the village head keeps its own distance', async () => {
    role = null
    const html = renderToStaticMarkup(await VillagePage({ params: { villageId: 'v1' }, searchParams: {} }))
    const cards = html.match(/<article class="v3-card v3r">[\s\S]*?<\/article>/g) ?? []
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      expect(card).not.toContain('v3r__distance')
      expect(card).not.toContain('Cách trung tâm')
    }
    expect(text(html)).toContain('Bát Tràng, Gia Lâm, Hà Nội · Cách trung tâm khoảng 13 km')
  })
})
