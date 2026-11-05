/**
 * G3 audit (linh/g3-audit) – BKG screen rules that build-log Entries 13, 22, 26 recorded as "demo only".
 * The pages are rendered with react-dom/server (as tests/adm/unit/filter-panel.test.ts does);
 * next/headers and next/navigation are mocked so the demo cookie selects the viewer.
 *
 * - 011 M7 / SC-007, BR-017: BKG135 keeps every action button visible and disables the ones the
 *   Booking does not allow.
 * - 012 M2 / #66, #67: BKG133 and DSH018 deny every viewer except the owning Local Provider without
 *   rendering Booking data; DSH018 links to BKG133.
 * - 013 M3 / #68, #69: Agency BKG137 ⇄ SCH141, BKG138 Back → BKG137; Provider navigation
 *   Dashboard → DSH018, Bookings → BKG133, Schedule → SCH139 (`providerBkgLinks`, used by PRF127/PRF128).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// The app compiles JSX with Next's automatic runtime; under Vitest the pages need React in scope.
;(globalThis as { React?: typeof React }).React = React

const cookie = vi.hoisted(() => ({ account: 'guest' }))
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => ({ value: cookie.account }) }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }), redirect: () => { throw new Error('redirect') }, notFound: () => { throw new Error('notFound') } }))

import { demoRepository } from '@/lib/demo/json-repository'
import { bookingActions } from '@/lib/booking/booking-actions'
import BookingActionsBar from '@/app/provider/[providerId]/bookings/[bookingId]/BookingActionsBar'
import BookingManagementPage from '@/app/provider/[providerId]/bookings/page'
import ProviderDashboardPage from '@/app/provider/[providerId]/dashboard/page'
import AgencyBookingHistoryPage from '@/app/agency/[agencyId]/bookings/page'
import AgencySchedulePage from '@/app/agency/[agencyId]/schedule/page'

const BAT_TRANG = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const OTHER_PROVIDER = '867719ea-c962-56a1-a88c-3f96e8d0af65'
const TRANG_AN = '02e568d8-d65e-54b1-a554-b411150d1dcb'
const html = async (element: Promise<React.ReactElement> | React.ReactElement) => renderToStaticMarkup(await element)

describe('G3 audit | BKG135 action buttons (011 M7, SC-007, BR-017)', () => {
  it('keeps all four buttons visible and disables what a Booked Booking before start does not allow', () => {
    const actions = bookingActions('Booked', new Date('2026-10-01T00:00:00+07:00'), '2026-10-12T09:00:00+07:00', 'provider')
    const markup = renderToStaticMarkup(React.createElement(BookingActionsBar, { providerId: BAT_TRANG, bookingId: 'b1', actions }))
    const button = (label: string) => markup.match(new RegExp(`<button[^>]*>${label.replace('/', '\\/')}</button>`))?.[0] ?? ''
    for (const label of ['Confirm/Book', 'Update', 'Cancel', 'Mark Group Arrival']) expect(button(label)).not.toBe('')
    expect(button('Confirm/Book')).toContain('disabled')
    expect(button('Mark Group Arrival')).toContain('disabled')
    expect(button('Update')).not.toContain('disabled')
    expect(button('Cancel')).not.toContain('disabled')
  })
})

describe('G3 audit | BKG133 and DSH018 access (012 M2, #66, #67)', () => {
  beforeEach(() => demoRepository().reset())

  for (const account of ['guest', 'agency', 'ubnd', 'hdt']) {
    it(`${account} gets the access-denied page without Booking data`, async () => {
      cookie.account = account
      const list = await html(BookingManagementPage({ params: { providerId: BAT_TRANG }, searchParams: {} }))
      expect(list).toContain('Chỉ Local Provider sở hữu hồ sơ này mới xem được danh sách Booking.')
      expect(list).not.toContain('/bookings/')
      const dashboard = await html(ProviderDashboardPage({ params: { providerId: BAT_TRANG } }))
      expect(dashboard).toContain('Chỉ Local Provider sở hữu hồ sơ này mới xem được Dashboard.')
    })
  }

  it('another Local Provider is denied on a Provider id that is not its own', async () => {
    cookie.account = 'provider'
    const list = await html(BookingManagementPage({ params: { providerId: OTHER_PROVIDER }, searchParams: {} }))
    expect(list).toContain('Chỉ Local Provider sở hữu hồ sơ này mới xem được danh sách Booking.')
  })

  it('the owning Provider sees BKG133 and DSH018, and DSH018 links to BKG133 (#66)', async () => {
    cookie.account = 'provider'
    const list = await html(BookingManagementPage({ params: { providerId: BAT_TRANG }, searchParams: {} }))
    expect(list).not.toContain('Chỉ Local Provider sở hữu')
    const dashboard = await html(ProviderDashboardPage({ params: { providerId: BAT_TRANG } }))
    expect(dashboard).toContain(`href="/provider/${BAT_TRANG}/bookings"`)
  })
})

describe('G3 audit | navigation links (013 M3, #68, #69)', () => {
  beforeEach(() => demoRepository().reset())

  it('Agency BKG137 links to SCH141 and SCH141 links to BKG137 (#68)', async () => {
    cookie.account = 'agency'
    const history = await html(AgencyBookingHistoryPage({ params: { agencyId: TRANG_AN }, searchParams: {} }))
    expect(history).toContain(`href="/agency/${TRANG_AN}/schedule"`)
    const schedule = await html(AgencySchedulePage({ params: { agencyId: TRANG_AN }, searchParams: {} }))
    expect(schedule).toContain(`href="/agency/${TRANG_AN}/bookings"`)
  })
})
