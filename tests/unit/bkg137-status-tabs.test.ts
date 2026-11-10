/**
 * Issue #193 — BKG137 Booking History filters status with tabs, not a select
 * (screen-spec-BKG137.md:68 §8 "search and date range stack above the filter tabs"; §3 #3 "Status/date filters";
 * statuses per §1 "On hold, Booked, Completed and Cancelled"). Each tab keeps the village and date filters (F-SCHED-02).
 */
import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

;(globalThis as { React?: typeof React }).React = React

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => ({ value: 'agency' }) }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }), redirect: () => { throw new Error('redirect') }, notFound: () => { throw new Error('notFound') } }))

import AgencyBookingHistoryPage from '@/app/agency/[agencyId]/bookings/page'

const TRANG_AN = '02e568d8-d65e-54b1-a554-b411150d1dcb'
const VILLAGE = 'e482884e-7190-56cf-bc03-4e69614b1fe5' // Phú Vinh, a village of this Agency's own bookings
const render = async (searchParams: Record<string, string>) =>
  renderToStaticMarkup(await AgencyBookingHistoryPage({ params: { agencyId: TRANG_AN }, searchParams }))
const decode = (s: string) => s.replace(/&amp;/g, '&')

describe('#193 | BKG137 status tabs', () => {
  it('shows five tabs (Tất cả + the four canonical statuses) instead of a status select', async () => {
    const html = await render({})
    expect(html).not.toMatch(/<select[^>]*name="status"/)
    const nav = html.match(/<nav[^>]*aria-label="Lọc theo trạng thái"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? ''
    const tabs = [...nav.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(m => ({ href: decode(m[1]), text: m[2].replace(/<[^>]+>/g, '') }))
    expect(tabs.map(t => t.text)).toEqual(['Tất cả', 'Tạm giữ', 'Đã đặt', 'Hoàn tất', 'Đã huỷ'])
    expect(tabs[1].href).toContain('status=On+hold')
  })

  it('the active tab is marked and every tab keeps the village and date filters', async () => {
    const html = await render({ status: 'Booked', village_id: VILLAGE, date_from: '2026-10-01', date_to: '2026-10-31' })
    const nav = html.match(/<nav[^>]*aria-label="Lọc theo trạng thái"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? ''
    const links = [...nav.matchAll(/<a[^>]*>/g)].map(m => decode(m[0]))
    expect(links).toHaveLength(5)
    for (const link of links) {
      expect(link).toContain(`village_id=${VILLAGE}`)
      expect(link).toContain('date_from=2026-10-01')
      expect(link).toContain('date_to=2026-10-31')
    }
    expect(links.filter(link => link.includes('aria-current="page"'))).toEqual([expect.stringContaining('status=Booked')])
    // the date/village form keeps the chosen status when it is submitted
    expect(html).toMatch(/<input type="hidden" name="status" value="Booked"\/>/)
  })
})
