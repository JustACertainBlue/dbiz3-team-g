/**
 * UI v3 Đợt 1, screen 24 (/explore/providers/[id]) per mockup pack 19/11/2026 (png/24, screens/24): breadcrumb
 * Trang chủ › Làng … › workshop; experiences as horizontal result cards (at most 3, "Xem chi tiết", then
 * "Xem tất cả trải nghiệm ›"); "Thông tin & liên hệ" as icon rows; "Xem tất cả ›" below the similar-experience grid.
 */
import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { seed as baseSeed } from './v3-village-fixtures'

;(globalThis as { React?: typeof React }).React = React

function seed() {
  const data = baseSeed()
  data.experiences = [...data.experiences,
    { experience_id: 'e7', provider_id: 'p1', name: 'Làm gốm cho trẻ em', category: 'Workshop/Hands-on', duration_minutes: '45', max_participants: '15', price_per_person: '120000', notice_period_hours: '24', archived_at: '' },
    { experience_id: 'e8', provider_id: 'p1', name: 'Ghép tranh gốm', category: 'Workshop/Hands-on', duration_minutes: '60', max_participants: '10', price_per_person: '130000', notice_period_hours: '24', archived_at: '' }]
  data.provider_profile_versions = data.provider_profile_versions.map(row => ({ ...row, craft_type: row.provider_id === 'p2' ? 'Ceramics' : row.craft_type, location_address: row.provider_id === 'p1' ? 'Bát Tràng, Gia Lâm, Hà Nội' : 'Hà Nội', contact_information: '{"phone_number":"+84 912 000 101","business_email":"x@example.invalid"}' }))
  data.provider_profiles = data.provider_profiles.map(row => row.provider_id === 'p1' ? { ...row, parking_note: 'Bãi đỗ xe 45 chỗ, đi bộ 3 phút đến xưởng' } : row)
  return data
}

let role: string | null = null
vi.mock('@/lib/explore/seed-repository', () => ({ loadExploreRuntime: async () => seed() }))
vi.mock('@/lib/auth/server-session', () => ({ currentServerSession: async () => ({ role, agencyId: null }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }), usePathname: () => '/explore/providers/p1', useSearchParams: () => new URLSearchParams(), notFound: () => { throw new Error('notFound') } }))

import ProviderPage from '@/app/explore/providers/[id]/page'

const text = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const render = async () => renderToStaticMarkup(await ProviderPage({ params: { id: 'p1' }, searchParams: {} }))

describe('screen 24 per mockup 19/11', () => {
  it('has the breadcrumb Trang chủ › Làng <village> › <workshop>', async () => {
    const crumbs = (await render()).match(/<nav aria-label="Đường dẫn"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? ''
    expect(crumbs).toMatch(/<a href="\/explore">Trang chủ<\/a>/)
    expect(crumbs).toMatch(/<a href="\/village\/v1">Làng Bát Tràng<\/a>/)
    expect(crumbs).toMatch(/<span aria-current="page">Xưởng thủ công Bát Tràng<\/span>/)
  })
  it('shows at most 3 horizontal result cards with "Xem chi tiết", then "Xem tất cả trải nghiệm ›"', async () => {
    const html = await render()
    const section = html.match(/<section id="trai-nghiem"[\s\S]*?<\/section>/)?.[0] ?? ''
    expect(text(section)).toMatch(/^Trải nghiệm của xưởng \(4\)/)
    const cards = section.match(/<article class="v3-card v3r v3r--provider">[\s\S]*?<\/article>/g) ?? []
    expect(cards).toHaveLength(3)
    for (const card of cards) {
      expect(card).not.toContain('v3r__where')
      expect(card).not.toContain('v3r__prepay')
      expect(card).toMatch(/<a class="hab-btn hab-btn--primary v3r__cta" href="\/explore\/experiences\/e\d">Xem chi tiết<\/a>/)
    }
    expect(section).toMatch(/<a class="v3-more" href="\/explore\/search">Xem tất cả trải nghiệm ›<\/a>/)
  })
  it('lists "Thông tin & liên hệ" as icon rows with the label above the value', async () => {
    const section = (await render()).match(/<section id="thong-tin"[\s\S]*?<\/section>/)?.[0] ?? ''
    const rows = [...section.matchAll(/<div class="v3p-kvi"><svg[\s\S]*?<\/svg><div><b>([^<]+)<\/b><span[^>]*>([^<]+)<\/span><\/div><\/div>/g)].map(m => [m[1], m[2]])
    expect(rows).toEqual([
      ['Địa chỉ', 'Bát Tràng, Gia Lâm, Hà Nội · cách trung tâm khoảng 13 km'],
      ['Giờ nhận đoàn', 'Thứ 2 – Thứ 6, 08:00 – 17:00. Nghỉ Thứ 7, Chủ nhật'],
      ['Sức chứa', 'Tối đa 15 khách mỗi ca, nhiều ca liên tiếp trong ngày'],
      ['Đỗ xe', 'Bãi đỗ xe 45 chỗ, đi bộ 3 phút đến xưởng'],
    ])
  })
  it('puts "Xem tất cả ›" below the similar-experience grid', async () => {
    const html = await render()
    const section = html.match(/<section class="hab-band v3d-sec" aria-labelledby="v3p-sim">[\s\S]*?<\/section>/)?.[0] ?? ''
    expect(section).toMatch(/<div class="v3p-simgrid">[\s\S]*<\/div><div class="v3-more-row"><a class="v3-more" href="\/explore\/search">Xem tất cả ›<\/a><\/div><\/section>$/)
  })
})
