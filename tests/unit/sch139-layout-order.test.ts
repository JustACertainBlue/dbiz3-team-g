/**
 * Issue #222 — SCH139 Provider Schedule: Create booking (§3 #4) and the selected booking with its quick actions (§3 #3)
 * come before the day rows, instead of after 30 rows. The day-row calendar itself stays as decided in spec-BKG OQ #70
 * (`docs/spec/specs/spec-BKG.md:560`, "one row per day … no calendar library"), not §8's month grid.
 * screen-spec-SCH139.md §3 #3 "Selected booking and permitted quick actions", #4 "Create booking", #8 "Operating hours".
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

;(globalThis as { React?: typeof React }).React = React

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => ({ value: 'provider' }) }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }), redirect: () => { throw new Error('redirect') }, notFound: () => { throw new Error('notFound') } }))

import { demoRepository } from '@/lib/demo/json-repository'
import ProviderSchedulePage from '@/app/provider/[providerId]/schedule/page'

const BAT_TRANG = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const BOOKED = '5782011c-b56d-5b61-bc01-80dd210c769c' // seed Booked block on 2026-10-10

const render = async (searchParams: Record<string, string>) =>
  renderToStaticMarkup(await ProviderSchedulePage({ params: { providerId: BAT_TRANG }, searchParams }))
const firstDayRow = (html: string) => html.indexOf('2026-10-06')

describe('#222 | SCH139 actions and selected booking before the day rows (OQ #70 layout kept)', () => {
  beforeEach(() => demoRepository().reset())

  it('Create booking and Operating hours are rendered before the first day row', async () => {
    const html = await render({ date_from: '2026-10-06' })
    const create = html.indexOf(`href="/provider/${BAT_TRANG}/bookings/new"`)
    const hours = html.indexOf(`href="/provider/${BAT_TRANG}/edit"`)
    expect(create).toBeGreaterThan(-1)
    expect(hours).toBeGreaterThan(-1)
    expect(create).toBeLessThan(html.indexOf('<span>2026-10-06 → '))
    expect(hours).toBeLessThan(html.indexOf('<span>2026-10-06 → '))
  })

  it('a selected booking panel (with its quick actions) comes before the day rows', async () => {
    const html = await render({ date_from: '2026-10-06', booking: BOOKED })
    const panel = html.indexOf('Booking đã chọn')
    expect(panel).toBeGreaterThan(-1)
    expect(panel).toBeLessThan(html.indexOf('<span>2026-10-06 → '))
    expect(html.indexOf(`href="/provider/${BAT_TRANG}/bookings/${BOOKED}"`)).toBeLessThan(html.indexOf('<span>2026-10-06 → '))
    expect(firstDayRow(html)).toBeGreaterThan(-1)
  })
})
