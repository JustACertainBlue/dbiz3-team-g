import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

;(globalThis as { React?: typeof React }).React = React

const cookie = vi.hoisted(() => ({ account: 'guest' }))
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => ({ value: cookie.account }) }) }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  redirect: () => { throw new Error('redirect') },
  notFound: () => { throw new Error('notFound') },
}))

import { demoRepository } from '@/lib/demo/json-repository'
import { agencyRowChips } from '@/lib/booking/agency-list'
import { bookingTourPill, isPastTourDate } from '@/lib/booking/list-tabs'
import AgencyBookingHistoryPage from '@/app/agency/[agencyId]/bookings/page'
import AgencyBookingDetailPage from '@/app/agency/[agencyId]/bookings/[bookingId]/page'
import BookingManagementPage from '@/app/provider/[providerId]/bookings/page'
import ProviderBookingDetailPage from '@/app/provider/[providerId]/bookings/[bookingId]/page'
import { changeBookingStatus } from '@/lib/booking/change-status'
import { createBooking } from '@/lib/booking/create-booking'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { addSlots } from '../helpers/slots'

const PROVIDER_ID = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const AGENCY_ID = '02e568d8-d65e-54b1-a554-b411150d1dcb'
const EXPERIENCE_ID = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
const html = async (element: Promise<React.ReactElement> | React.ReactElement) => renderToStaticMarkup(await element)

describe('D25 | Booked tour status labels by role and tour date', () => {
  it('detects past tour dates in Asia/Ho_Chi_Minh only when tour date < today', () => {
    const start = '2026-11-24T09:00:00+07:00'
    expect(isPastTourDate(start, new Date('2026-11-23T23:59:00+07:00'))).toBe(false)
    expect(isPastTourDate(start, new Date('2026-11-24T18:00:00+07:00'))).toBe(false)
    expect(isPastTourDate(start, new Date('2026-11-25T00:01:00+07:00'))).toBe(true)

    // UTC timestamps crossing midnight in Hanoi (+07:00)
    expect(isPastTourDate('2026-11-24T16:30:00.000Z', new Date('2026-11-24T17:30:00.000Z'))).toBe(true) // 23:30 24/11 vs 00:30 25/11 Hanoi
    expect(isPastTourDate('2026-11-24T18:00:00.000Z', new Date('2026-11-25T12:00:00.000Z'))).toBe(false) // both 25/11 Hanoi
  })

  it('upcoming or same-day Booked keeps "Tour sắp tới" for both roles', () => {
    const start = '2026-11-24T09:00:00+07:00'
    for (const nowIso of ['2026-11-23T10:00:00+07:00', '2026-11-24T18:00:00+07:00']) {
      const now = new Date(nowIso)
      expect(bookingTourPill('Booked', 'provider', start, now).label).toBe('Tour sắp tới')
      expect(bookingTourPill('Booked', 'agency', start, now).label).toBe('Tour sắp tới')
      expect(agencyRowChips('Booked', start, now)).toEqual({ status: 'Tour sắp tới', pay: 'Đã thanh toán', payNow: false })
    }
  })

  it('past-date Booked shows role-specific pending-arrival confirmation labels', () => {
    const start = '2026-11-24T09:00:00+07:00'
    const after = new Date('2026-11-25T09:00:00+07:00')
    expect(bookingTourPill('Booked', 'provider', start, after).label).toBe('Chờ xác nhận đoàn đã đến')
    expect(bookingTourPill('Booked', 'agency', start, after).label).toBe('Chờ xưởng xác nhận')
    expect(agencyRowChips('Booked', start, after)).toEqual({ status: 'Chờ xưởng xác nhận', pay: 'Đã thanh toán', payNow: false })
  })

  it('never alters labels of On hold, Completed, or Cancelled bookings even when past date', () => {
    const start = '2026-11-20T09:00:00+07:00'
    const after = new Date('2026-11-25T09:00:00+07:00')
    expect(bookingTourPill('On hold', 'provider', start, after).label).toBe('Đang giữ chỗ')
    expect(bookingTourPill('On hold', 'agency', start, after).label).toBe('Đang giữ chỗ')
    expect(bookingTourPill('Completed', 'provider', start, after).label).toBe('Hoàn thành tour')
    expect(bookingTourPill('Completed', 'agency', start, after).label).toBe('Hoàn thành tour')
    expect(bookingTourPill('Cancelled', 'provider', start, after).label).toBe('Đã huỷ')
    expect(bookingTourPill('Cancelled', 'agency', start, after).label).toBe('Đã huỷ')
    expect(agencyRowChips('On hold', start, after).status).toBe('Đang giữ chỗ')
    expect(agencyRowChips('Completed', start, after).status).toBe('Hoàn thành tour')
    expect(agencyRowChips('Cancelled', start, after).status).toBe('Đã huỷ')
  })
})

describe('D25 | screens 05, 07, 10, 34 render role-specific past-date Booked labels without mutating status', () => {
  let bookingId = ''

  beforeEach(async () => {
    demoRepository().reset()
    addSlots()
    const createdAt = { now: () => new Date('2026-11-20T09:00:00+07:00') }
    const created = await createBooking(DEMO_IDENTITIES.provider, {
      experience_id: EXPERIENCE_ID,
      agency_id: AGENCY_ID,
      start_at: '2026-11-23T09:00:00+07:00',
      duration: 60,
      group_size: 10,
      booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
    }, createdAt)
    bookingId = created.booking_id
    await changeBookingStatus(DEMO_IDENTITIES.provider, bookingId, { target_status: 'Booked' }, createdAt)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('screen 05 (agency history): before/on day shows Tour sắp tới; after day shows Chờ xưởng xác nhận', async () => {
    cookie.account = 'agency'
    const q = `HAB-${bookingId.slice(0, 6)}`

    vi.setSystemTime(new Date('2026-11-22T10:00:00+07:00'))
    const beforeHtml = await html(AgencyBookingHistoryPage({ params: { agencyId: AGENCY_ID }, searchParams: { tab: 'all', q } }))
    expect(beforeHtml).toContain('Tour sắp tới')
    expect(beforeHtml).not.toContain('Chờ xưởng xác nhận')

    vi.setSystemTime(new Date('2026-11-23T15:00:00+07:00'))
    const sameDayHtml = await html(AgencyBookingHistoryPage({ params: { agencyId: AGENCY_ID }, searchParams: { tab: 'all', q } }))
    expect(sameDayHtml).toContain('Tour sắp tới')
    expect(sameDayHtml).not.toContain('Chờ xưởng xác nhận')

    vi.setSystemTime(new Date('2026-11-24T09:00:00+07:00'))
    const pastHtml = await html(AgencyBookingHistoryPage({ params: { agencyId: AGENCY_ID }, searchParams: { tab: 'all', q } }))
    expect(pastHtml).toContain('Chờ xưởng xác nhận')
    expect(pastHtml).not.toContain('Tour sắp tới')
    expect(pastHtml).not.toContain('Chờ xác nhận đoàn đã đến')
    expect(demoRepository().find('bookings', r => r.booking_id === bookingId)!.status).toBe('Booked')
  })

  it('screen 34 (provider list): before/on day shows Tour sắp tới; after day shows Chờ xác nhận đoàn đã đến', async () => {
    cookie.account = 'provider'
    const rowFor = (markup: string, id: string) => markup.match(new RegExp(`<tr>(?:(?!<tr>)[\\s\\S])*?${id}[\\s\\S]*?</tr>`))?.[0] ?? ''

    vi.setSystemTime(new Date('2026-11-23T15:00:00+07:00'))
    const sameDayHtml = await html(BookingManagementPage({ params: { providerId: PROVIDER_ID }, searchParams: { tab: 'booked', page: '1' } }))
    const sameDayRow = rowFor(sameDayHtml, bookingId)
    expect(sameDayRow).toContain('Tour sắp tới')
    expect(sameDayRow).not.toContain('Chờ xác nhận đoàn đã đến')

    vi.setSystemTime(new Date('2026-11-24T09:00:00+07:00'))
    const pastHtml = await html(BookingManagementPage({ params: { providerId: PROVIDER_ID }, searchParams: { tab: 'booked', page: '1' } }))
    const pastRow = rowFor(pastHtml, bookingId)
    expect(pastRow).toContain('Chờ xác nhận đoàn đã đến')
    expect(pastRow).not.toContain('Tour sắp tới')
    expect(pastRow).not.toContain('Chờ xưởng xác nhận')
    expect(demoRepository().find('bookings', r => r.booking_id === bookingId)!.status).toBe('Booked')
  })

  it('screen 10 (provider detail): shows Chờ xác nhận đoàn đã đến after tour date and Tour sắp tới on tour day', async () => {
    cookie.account = 'provider'

    vi.setSystemTime(new Date('2026-11-23T15:00:00+07:00'))
    const sameDayHtml = await html(ProviderBookingDetailPage({ params: { providerId: PROVIDER_ID, bookingId } }))
    expect(sameDayHtml).toContain('Tour sắp tới')
    expect(sameDayHtml).not.toContain('Chờ xác nhận đoàn đã đến')

    vi.setSystemTime(new Date('2026-11-24T09:00:00+07:00'))
    const pastHtml = await html(ProviderBookingDetailPage({ params: { providerId: PROVIDER_ID, bookingId } }))
    expect(pastHtml).toContain('Chờ xác nhận đoàn đã đến')
    expect(pastHtml).not.toContain('Tour sắp tới')
    expect(pastHtml).not.toContain('Chờ xưởng xác nhận')
  })

  it('screen 07 (agency detail): shows Chờ xưởng xác nhận after tour date and not before/on tour day', async () => {
    cookie.account = 'agency'

    vi.setSystemTime(new Date('2026-11-23T15:00:00+07:00'))
    const sameDayHtml = await html(AgencyBookingDetailPage({ params: { agencyId: AGENCY_ID, bookingId } }))
    expect(sameDayHtml).not.toContain('Chờ xưởng xác nhận')

    vi.setSystemTime(new Date('2026-11-24T09:00:00+07:00'))
    const pastHtml = await html(AgencyBookingDetailPage({ params: { agencyId: AGENCY_ID, bookingId } }))
    expect(pastHtml).toContain('Chờ xưởng xác nhận')
    expect(pastHtml).not.toContain('Chờ xác nhận đoàn đã đến')
  })
})
