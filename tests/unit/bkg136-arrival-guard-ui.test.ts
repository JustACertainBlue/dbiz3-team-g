/**
 * Issue #192 — BKG136 "Confirm Group Arrival" is enabled only when the F-SCHED-06 guard succeeds
 * (screen-spec-BKG136.md:31, §3 #5: "Enabled only when the linked permission/validation guard succeeds";
 * guard = Booked and now >= start_at, spec-BKG FR-006 / BR-010). The server already refuses otherwise
 * (src/lib/booking/mark-arrival.ts:49-50); this is the screen side. Cancel (#6) stays available.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }))
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import ConfirmArrival from '@/app/provider/[providerId]/bookings/[bookingId]/arrival/ConfirmArrival'

const render = (allowed: boolean, lockReason = '') => renderToStaticMarkup(React.createElement(ConfirmArrival,
  { bookingId: 'b1', backHref: '/provider/p1/bookings/b1', allowed, lockReason }))
const confirmButton = (html: string) => html.match(/<button[^>]*>[^<]*Confirm Group Arrival<\/button>/)![0]

describe('#192 | BKG136 Confirm Group Arrival follows the F-SCHED-06 guard', () => {
  it('guard fails (e.g. Cancelled): the button is disabled and the reason is shown; Cancel still links back', () => {
    const html = render(false, 'Đánh dấu đoàn đã đến: đặt chỗ đã huỷ, chỉ xem')
    expect(confirmButton(html)).toMatch(/disabled=""/)
    expect(html).toContain('Đánh dấu đoàn đã đến: đặt chỗ đã huỷ, chỉ xem')
    expect(html).toMatch(/<a[^>]*href="\/provider\/p1\/bookings\/b1"[^>]*>Cancel<\/a>/)
  })

  it('guard succeeds (Booked, start reached): the button is enabled and no reason is shown', () => {
    const html = render(true)
    expect(confirmButton(html)).not.toMatch(/disabled/)
    expect(html).not.toContain('Đánh dấu đoàn đã đến:')
  })

  it('the page passes the server-computed guard (detail.actions.mark_arrival) and its reason', () => {
    const page = readFileSync('src/app/provider/[providerId]/bookings/[bookingId]/arrival/page.tsx', 'utf8')
    expect(page).toMatch(/<ConfirmArrival\b[^>]*allowed=\{detail\.actions\.mark_arrival\}/)
    expect(page).toMatch(/<ConfirmArrival\b[^>]*lockReason=\{arrivalLockReason\(detail\.status, detail\.actions\)\}/)
  })
})
