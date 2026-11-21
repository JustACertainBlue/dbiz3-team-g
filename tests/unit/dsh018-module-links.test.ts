/**
 * (2026-11-21) The mockup v3 dashboard replaced the tile grid below: see the two tests on navigation.
 * Issues #128 / #203 — DSH018 Local Provider Dashboard.
 * - screen-spec-DSH018.md:32-36 §3 #6–#10: the navigation is exactly Complete/edit profile (PRF128), Experiences (EXP067),
 *   Bookings (BKG133), Schedule (SCH139), Messages (COM065). The extra "Hồ sơ xưởng" tile (→ PRF127) is not in the spec
 *   (#128); PRF127 stays reachable from the avatar menu ("My Business → PRF127", §5).
 * - §8 "Text that must remain readable": below 760 px the 4-column status summary is collapsed to 2 columns so the
 *   status badges are not clipped (#203, audit at 390 px).
 */
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

;(globalThis as { React?: typeof React }).React = React

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => ({ value: 'provider' }) }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }), redirect: () => { throw new Error('redirect') }, notFound: () => { throw new Error('notFound') } }))

import { demoRepository } from '@/lib/demo/json-repository'
import ProviderDashboardPage from '@/app/provider/[providerId]/dashboard/page'

const BAT_TRANG = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'

describe('#128 / #203 | DSH018 navigation tiles and narrow status summary', () => {
  beforeEach(() => demoRepository().reset())

  // Mockup v3 (approved, screen 29) replaced the old tile grid: the provider reaches Experiences, Bookings, Schedule and
  // Messages from the header (Tổng quan · Trải nghiệm · Lịch sử đặt chỗ, message button) and from links inside the page.
  it('from the dashboard the provider reaches Experiences, Bookings and the full Schedule; Create booking goes to the existing route', async () => {
    const page = renderToStaticMarkup(await ProviderDashboardPage({ params: { providerId: BAT_TRANG } }))
    const hrefs = [...page.matchAll(/<a [^>]*href="([^"]+)"/g)].map(m => m[1])
    expect(hrefs).toContain(`/provider/${BAT_TRANG}/experiences`)
    expect(hrefs).toContain(`/provider/${BAT_TRANG}/bookings`)
    expect(hrefs).toContain(`/provider/${BAT_TRANG}/schedule`)
    expect(hrefs).toContain(`/provider/${BAT_TRANG}/bookings/new`)
    expect(hrefs).toContain(`/provider/${BAT_TRANG}`)
    expect(hrefs).toContain(`/provider/${BAT_TRANG}/edit`)
    expect(page).not.toContain('provider-module-grid')
  })

  it('the header gives the provider the dashboard, Experiences and Bookings, and every signed-in role the Messages button', () => {
    const nav = readFileSync('src/app/components/nav/nav-model.ts', 'utf8')
    expect(nav).toContain("`${base}/dashboard`")
    expect(nav).toContain("`${base}/experiences`")
    expect(nav).toContain("`${base}/bookings`")
    expect(readFileSync('src/app/components/header/AppHeader.tsx', 'utf8')).toMatch(/variant !== 'admin' && <Link href="\/messages"/)
  })

  it('below 760 px the status summary uses two columns', () => {
    const css = readFileSync('src/app/provider/provider-ui.css', 'utf8')
    const narrow = css.slice(css.indexOf('@media(max-width:760px){'))
    expect(narrow).toMatch(/\.provider-dashboard \.bkg-panel dl\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/)
  })
})
