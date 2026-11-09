/**
 * Issue #87: on PostgreSQL every timestamptz comes back as UTC ("…Z" string, or a Date from the driver),
 * not as the seed's "+07:00" string. spec-BKG #31: "Weekday and local time are derived in
 * Asia/Ho_Chi_Minh; timestamps are stored as timestamptz". So every screen and the F-SCHED-08 Chat text
 * must show Hanoi local time whatever form the timestamp has. One Booking is used throughout:
 * 2026-11-23 09:00–10:30 Hanoi = 02:00–03:30 UTC. The early-morning case (06:30 Hanoi = 23:30 UTC the
 * day before) checks that the local date is derived too, not only the clock.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

;(globalThis as { React?: typeof React }).React = React

const cookie = vi.hoisted(() => ({ account: 'guest' }))
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => ({ value: cookie.account }) }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }), redirect: () => { throw new Error('redirect') }, notFound: () => { throw new Error('notFound') } }))

import { demoRepository } from '@/lib/demo/json-repository'
import { bookingUpdateOperations } from '@/lib/booking/agency-sync'
import { bookingListRowView } from '@/lib/booking/list-row-view'
import { hanoiTime } from '@/app/provider/[providerId]/bookings/[bookingId]/BookingDetailView'
import EditBookingForm from '@/app/provider/[providerId]/bookings/[bookingId]/edit/EditBookingForm'
import CalendarGrid from '@/app/schedule-calendar/CalendarGrid'
import { PendingVerificationPanel } from '@/app/components/admin/PendingVerificationPanel'
import AgencyBookingHistoryPage from '@/app/agency/[agencyId]/bookings/page'
import type { BookingDetail } from '@/lib/booking/booking-detail'

const START_UTC = '2026-11-23T02:00:00.000Z'
const END_UTC = '2026-11-23T03:30:00.000Z'
const EARLY_UTC = '2026-11-22T23:30:00.000Z' // 2026-11-23 06:30 Hanoi
const PROVIDER = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const TRANG_AN = '02e568d8-d65e-54b1-a554-b411150d1dcb'
const html = async (element: Promise<React.ReactElement> | React.ReactElement) => renderToStaticMarkup(await element)

const listRow = (start_at: string, end_at: string) => ({
  booking_id: '4bf17b30-9819-5c47-b745-06be7171087b', experience_name: 'Nặn gốm thủ công', agency_name: 'Công ty Du lịch Tràng An',
  start_at, end_at, group_size: 7, status: 'Booked', requires_action: false,
})

describe('#87 spec-BKG #31 | Booking times from PostgreSQL (UTC) are shown in Asia/Ho_Chi_Minh', () => {
  beforeEach(() => demoRepository().reset())

  it('FR-008 #49: the Chat Booking Update text shows 09:00–10:30 for a UTC Booking row', async () => {
    const booking = { ...demoRepository().find('bookings', row => row.agency_id === TRANG_AN)!, start_at: START_UTC, end_at: END_UTC, status: 'Booked' }
    const { operations } = await bookingUpdateOperations(booking, '2026-11-07T14:14:18.000Z')
    const message = operations.find(op => 'row' in op && op.table === 'chat_messages')
    expect(message && 'row' in message ? message.row.text : '').toContain('2026-11-23 09:00–10:30')
  })

  it('FR-008 #49: the Chat Booking Update text keeps 09:00–10:30 for a +07:00 Booking row (old data)', async () => {
    const booking = { ...demoRepository().find('bookings', row => row.agency_id === TRANG_AN)!, start_at: '2026-11-23T09:00:00+07:00', end_at: '2026-11-23T10:30:00+07:00' }
    const { operations } = await bookingUpdateOperations(booking, '2026-11-07T21:14:18+07:00')
    const message = operations.find(op => 'row' in op && op.table === 'chat_messages')
    expect(message && 'row' in message ? message.row.text : '').toContain('2026-11-23 09:00–10:30')
  })

  it('FR-010: the Provider Booking list row shows the local date and time (UTC and +07:00 input)', () => {
    expect(bookingListRowView(listRow(START_UTC, END_UTC), PROVIDER).when).toBe('2026-11-23 09:00 → 10:30')
    expect(bookingListRowView(listRow('2026-11-23T09:00:00+07:00', '2026-11-23T10:30:00+07:00'), PROVIDER).when).toBe('2026-11-23 09:00 → 10:30')
    expect(bookingListRowView(listRow(EARLY_UTC, '2026-11-23T00:30:00.000Z'), PROVIDER).when).toBe('2026-11-23 06:30 → 07:30')
  })

  it('BR-004: the Provider Booking list shows the On hold expiry (72 h) in Hanoi time', () => {
    const onHold = { ...listRow(START_UTC, END_UTC), status: 'On hold', hold_expires_at: '2026-11-10T14:13:43.000Z' }
    expect(bookingListRowView(onHold, PROVIDER).hold_expiry).toBe('2026-11-10 21:13')
  })

  it('FR-007: the Booking detail time (hanoiTime) converts UTC strings and Date values, and keeps +07:00', () => {
    expect(hanoiTime(START_UTC)).toBe('2026-11-23 09:00')
    expect(hanoiTime(new Date(START_UTC) as unknown as string)).toBe('2026-11-23 09:00')
    expect(hanoiTime(EARLY_UTC)).toBe('2026-11-23 06:30')
    expect(hanoiTime('2026-11-23T09:00:00+07:00')).toBe('2026-11-23 09:00')
  })

  it('FR-002: the Agency Booking history page shows start and end in Hanoi time', async () => {
    const repo = demoRepository()
    const row = repo.all('bookings').find(b => b.agency_id === TRANG_AN)!
    const startLocal = row.start_at.slice(0, 16).replace('T', ' ')
    const endLocal = row.end_at.slice(11, 16)
    repo.update('bookings', b => b.booking_id === row.booking_id, {
      start_at: new Date(row.start_at).toISOString(), end_at: new Date(row.end_at).toISOString(),
    })
    cookie.account = 'agency'
    const page = await html(AgencyBookingHistoryPage({ params: { agencyId: TRANG_AN }, searchParams: {} }))
    expect(page).toContain(`${startLocal} → ${endLocal}`)
  })

  it('FR-004: the edit form pre-fills the start in Hanoi time, so saving it with +07:00 does not move the Booking', () => {
    const detail = { booking_id: 'b1', start_at: START_UTC, end_at: END_UTC, group_size: 7, agreed_price: 1440000, booking_conditions: { notice_period: 12, cancellation_policy: { before_hours: 24, refund_percent: 80 } } } as unknown as BookingDetail
    const markup = renderToStaticMarkup(React.createElement(EditBookingForm, { detail, backHref: '/back' }))
    expect(markup).toContain('value="2026-11-23T09:00"')
    expect(markup).not.toContain('value="2026-11-23T02:00"')
  })

  it('FR-001 #70: the calendar puts a UTC block on its Hanoi day with Hanoi times', () => {
    const markup = renderToStaticMarkup(React.createElement(CalendarGrid, {
      days: ['2026-11-22', '2026-11-23'],
      blocks: [{ start_at: START_UTC, end_at: END_UTC, status: 'Booked' }, { start_at: EARLY_UTC, end_at: '2026-11-23T00:30:00.000Z', status: 'On hold' }],
    }))
    const day = (d: string) => markup.match(new RegExp(`<section[^>]*aria-label="${d}"[\\s\\S]*?</section>`))?.[0] ?? ''
    // spec đổi (nhãn tiếng Việt, DSH018/SCH139 amended 2026-11-08) → kỳ vọng đổi; phần kiểm giờ #70/#87 không đổi.
    expect(day('2026-11-23')).toContain('09:00–10:30 Đã đặt')
    expect(day('2026-11-23')).toContain('06:30–07:30 Tạm giữ')
    expect(day('2026-11-22')).not.toContain('Tạm giữ')
  })
})

describe('#87 spec-ADM | admin dates from PostgreSQL are Hanoi dates', () => {
  it('pending verification shows the Hanoi submission date of a UTC timestamp', () => {
    const markup = renderToStaticMarkup(React.createElement(PendingVerificationPanel, {
      items: [{ kind: 'Provider', id: 'p1', name: 'Xưởng thử', villageId: 'v1', submittedAt: EARLY_UTC }] as never,
    }))
    expect(markup).toContain('2026-11-23')
    expect(markup).not.toContain('2026-11-22')
  })
})
