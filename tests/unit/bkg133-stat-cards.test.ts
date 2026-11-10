/**
 * Issue #190 — BKG133 Booking Management: four stat cards and Create at the top.
 * screen-spec-BKG133.md:70 §8 "the four stat cards stack to a single column"; §3 #3 "Status/date filters and action
 * highlights" (F-SCHED-10); §3 #4 "Create | Button / navigation | Always On hold". The cards use the F-SCHED-10
 * `status_counts` of the four canonical statuses and filter the list by that status.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

;(globalThis as { React?: typeof React }).React = React

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => ({ value: 'provider' }) }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }), redirect: () => { throw new Error('redirect') }, notFound: () => { throw new Error('notFound') } }))

import { demoRepository } from '@/lib/demo/json-repository'
import { currentServerSession } from '@/lib/auth/server-session'
import { listProviderBookings } from '@/lib/booking/list-bookings'
import BookingManagementPage from '@/app/provider/[providerId]/bookings/page'

const BAT_TRANG = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const decode = (s: string) => s.replace(/&amp;/g, '&')

describe('#190 | BKG133 stat cards and Create at the top', () => {
  beforeEach(() => demoRepository().reset())

  it('four stat cards show the status_counts and link to that status filter; the current one is marked', async () => {
    const searchParams = { date_from: '', status: 'Booked', date_to: '', page: '1' }
    const expected = (await listProviderBookings((await currentServerSession()), searchParams)).status_counts
    const html = renderToStaticMarkup(await BookingManagementPage({ params: { providerId: BAT_TRANG }, searchParams }))
    const cards = html.match(/<nav[^>]*class="bkg-stat-cards"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? ''
    const links = [...cards.matchAll(/<a([^>]*)>([\s\S]*?)<\/a>/g)].map(m => ({ attrs: decode(m[1]), text: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }))
    expect(links.map(l => l.text)).toEqual([
      `Tạm giữ ${expected['On hold']}`, `Đã đặt ${expected.Booked}`, `Hoàn tất ${expected.Completed}`, `Đã huỷ ${expected.Cancelled}`,
    ])
    expect(links[0].attrs).toContain('status=On+hold')
    expect(links.filter(l => l.attrs.includes('aria-current="page"')).map(l => l.text)).toEqual([`Đã đặt ${expected.Booked}`])
    expect(html.indexOf('class="bkg-stat-cards"')).toBeLessThan(html.indexOf('class="bkg-filters"'))
  })

  it('Create (to BKG134) is in the header area, before the filters', async () => {
    const html = renderToStaticMarkup(await BookingManagementPage({ params: { providerId: BAT_TRANG }, searchParams: {} }))
    const create = html.indexOf(`href="/provider/${BAT_TRANG}/bookings/new"`)
    expect(create).toBeGreaterThan(-1)
    expect(create).toBeLessThan(html.indexOf('class="bkg-filters"'))
  })
})
