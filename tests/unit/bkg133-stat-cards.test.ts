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

describe('#190 (screen 34, mockup 19/11) | tabs with counts and Tạo đặt chỗ at the top', () => {
  beforeEach(() => demoRepository().reset())

  it('six tabs show the status counts and link to their filter; the current one is marked', async () => {
    const searchParams = { tab: 'booked', page: '1' }
    const expected = (await listProviderBookings((await currentServerSession()), {})).status_counts
    const html = renderToStaticMarkup(await BookingManagementPage({ params: { providerId: BAT_TRANG }, searchParams }))
    const nav = html.match(/<nav[^>]*class="v3l-tabs"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? ''
    const links = [...nav.matchAll(/<a([^>]*)>([\s\S]*?)<\/a>/g)].map(m => ({ attrs: decode(m[1]), text: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }))
    const total = expected['On hold'] + expected.Booked + expected.Completed + expected.Cancelled
    expect(links.map(l => l.text)).toEqual([
      `Tất cả (${total})`, `Cần xử lý (${expected['On hold']})`, `Đang giữ chỗ (${expected['On hold']})`, `Đã thanh toán (${expected.Booked})`, `Hoàn thành tour (${expected.Completed})`, `Đã huỷ (${expected.Cancelled})`,
    ])
    expect(links[1].attrs).toContain('tab=todo')
    expect(links.filter(l => l.attrs.includes('aria-current="page"')).map(l => l.text)).toEqual([`Đã thanh toán (${expected.Booked})`])
  })

  it('Tạo đặt chỗ (to screen 35) is in the header, before the tabs', async () => {
    const html = renderToStaticMarkup(await BookingManagementPage({ params: { providerId: BAT_TRANG }, searchParams: {} }))
    const create = html.indexOf(`href="/provider/${BAT_TRANG}/bookings/new"`)
    expect(create).toBeGreaterThan(-1)
    expect(create).toBeLessThan(html.indexOf('class="v3l-tabs"'))
  })
})
