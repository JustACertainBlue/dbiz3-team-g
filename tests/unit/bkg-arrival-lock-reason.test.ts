import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }))
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { arrivalLockReason, bookingActions } from '@/lib/booking/booking-actions'
import BookingActionsBar from '@/app/provider/[providerId]/bookings/[bookingId]/BookingActionsBar'

// Design wave 4 (Figma "Màn 3"): a locked "Đánh dấu đoàn đã đến" shows why. The line is a Figma addition; the spec
// only defines when the button is enabled (FR-007 matrix, FR-006, BR-017). The text must match those conditions.
const START = '2026-10-05T09:00:00+07:00'
const before = new Date('2026-10-05T08:59:59+07:00')
const atStart = new Date(START)
const after = new Date('2026-10-05T09:30:00+07:00')
const reasonFor = (status: string, now: Date) => arrivalLockReason(status, bookingActions(status, now, START, 'provider'))

describe('BKG135 lock reason for "Đánh dấu đoàn đã đến" (FR-007 / FR-006 / BR-017)', () => {
  it('On hold → locked: arrival needs a Booked booking whose start has been reached', () => {
    expect(bookingActions('On hold', after, START, 'provider').mark_arrival).toBe(false)
    expect(reasonFor('On hold', after)).toBe('Đánh dấu đoàn đã đến: chỉ khi đặt chỗ đã đặt và đã tới giờ bắt đầu')
  })

  it('Booked before start → locked: start not reached (BR-017)', () => {
    expect(reasonFor('Booked', before)).toBe('Đánh dấu đoàn đã đến: chưa tới giờ bắt đầu')
  })

  it('Booked at or after start → enabled, no reason', () => {
    for (const now of [atStart, after]) {
      expect(bookingActions('Booked', now, START, 'provider').mark_arrival).toBe(true)
      expect(reasonFor('Booked', now)).toBe('')
    }
  })

  it('Completed / Cancelled → view only (FR-007): the reason names the final status', () => {
    expect(reasonFor('Completed', after)).toBe('Đánh dấu đoàn đã đến: đặt chỗ đã hoàn tất, chỉ xem')
    expect(reasonFor('Cancelled', after)).toBe('Đánh dấu đoàn đã đến: đặt chỗ đã huỷ, chỉ xem')
  })

  it('invariant: for the Provider, a reason is shown exactly when the button is locked, for every status and time', () => {
    for (const status of ['On hold', 'Booked', 'Completed', 'Cancelled']) {
      for (const now of [before, atStart, after]) {
        const actions = bookingActions(status, now, START, 'provider')
        expect(arrivalLockReason(status, actions) !== '', `${status} @ ${now.toISOString()}`).toBe(!actions.mark_arrival)
      }
    }
  })

  it('render: the locked button points at its reason (aria-describedby); the enabled button has none', () => {
    const locked = renderToStaticMarkup(React.createElement(BookingActionsBar, { providerId: 'p', bookingId: 'b', status: 'Booked', actions: bookingActions('Booked', before, START, 'provider') }))
    expect(locked).toMatch(/<button[^>]*aria-describedby="bkg-arrival-reason"[^>]*>Đánh dấu đoàn đã đến<\/button>/)
    expect(locked).toContain('<p id="bkg-arrival-reason" class="bkg-reason">Đánh dấu đoàn đã đến: chưa tới giờ bắt đầu</p>')
    const enabled = renderToStaticMarkup(React.createElement(BookingActionsBar, { providerId: 'p', bookingId: 'b', status: 'Booked', actions: bookingActions('Booked', after, START, 'provider') }))
    expect(enabled).not.toContain('bkg-arrival-reason')
  })
})
