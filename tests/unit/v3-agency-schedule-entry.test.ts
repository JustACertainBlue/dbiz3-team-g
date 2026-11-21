/**
 * Mockup v3 pack of 2026-11-19 (hab-mockup-v3 png/05, png/27; README rule 6): screen 05 BKG137 has a "Xem lịch" button
 * at the end of the tab row leading to screen 27 SCH141, whose title is "Lịch Công ty".
 */
import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

;(globalThis as { React?: typeof React }).React = React

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => ({ value: 'agency' }) }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }), redirect: () => { throw new Error('redirect') }, notFound: () => { throw new Error('notFound') } }))

import AgencyBookingHistoryPage from '@/app/agency/[agencyId]/bookings/page'
import AgencySchedulePage from '@/app/agency/[agencyId]/schedule/page'

const TRANG_AN = '02e568d8-d65e-54b1-a554-b411150d1dcb'

describe('screen 05 → screen 27', () => {
  it('ends the tab row with a "Xem lịch" link to the Agency schedule', async () => {
    const html = renderToStaticMarkup(await AgencyBookingHistoryPage({ params: { agencyId: TRANG_AN }, searchParams: {} }))
    const tabs = html.match(/<nav[^>]*aria-label="Lọc theo trạng thái"[^>]*>[\s\S]*?<\/nav>/)?.[0] ?? ''
    expect(tabs).not.toBe('')
    // the button sits right after the tab nav, in the same row (mockup 05)
    expect(html).toMatch(new RegExp(`<\\/nav><a[^>]*href="/agency/${TRANG_AN}/schedule"[^>]*>[\\s\\S]*Xem lịch<\\/a>`))
  })
  it('has no quote characters in its inline CSS (the server escapes them and hydration fails)', async () => {
    const html = renderToStaticMarkup(await AgencyBookingHistoryPage({ params: { agencyId: TRANG_AN }, searchParams: {} }))
    const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('')
    expect(css).not.toContain('&quot;')
  })
  it('titles screen 27 "Lịch Công ty"', async () => {
    const html = renderToStaticMarkup(await AgencySchedulePage({ params: { agencyId: TRANG_AN }, searchParams: {} }))
    expect(html).toMatch(/<h1>Lịch Công ty<\/h1>/)
    expect(html).not.toContain('Agency Schedule</h1>')
  })
})
