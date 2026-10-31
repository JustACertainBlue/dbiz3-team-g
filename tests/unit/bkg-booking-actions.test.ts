import { describe, expect, it } from 'vitest'
import { bookingActions } from '@/lib/booking/booking-actions'

// T028: FR-007 button matrix (BR-017, SC-007, US-3 AS-5). Agency is always view-only.
const START = '2026-10-05T09:00:00+07:00'
const before = new Date('2026-10-05T08:59:59+07:00')
const atStart = new Date(START)
const after = new Date('2026-10-05T09:30:00+07:00')
const none = { confirm: false, update: false, cancel: false, mark_arrival: false }

describe('T028 | bookingActions (FR-007 matrix)', () => {
  it('On hold → Confirm/Book, Update, Cancel enabled; Mark Group Arrival disabled', () => {
    expect(bookingActions('On hold', before, START, 'provider')).toEqual({ confirm: true, update: true, cancel: true, mark_arrival: false })
  })

  it('Booked and now < start_at → Update, Cancel enabled; Mark Group Arrival disabled (BR-017)', () => {
    expect(bookingActions('Booked', before, START, 'provider')).toEqual({ confirm: false, update: true, cancel: true, mark_arrival: false })
  })

  it('Booked and now >= start_at (equal included) → Update, Cancel, Mark Group Arrival enabled', () => {
    const enabled = { confirm: false, update: true, cancel: true, mark_arrival: true }
    expect(bookingActions('Booked', atStart, START, 'provider')).toEqual(enabled)
    expect(bookingActions('Booked', after, START, 'provider')).toEqual(enabled)
  })

  it('Completed and Cancelled → all disabled (view only)', () => {
    expect(bookingActions('Completed', after, START, 'provider')).toEqual(none)
    expect(bookingActions('Cancelled', before, START, 'provider')).toEqual(none)
  })

  it('Agency → no action in any status', () => {
    for (const status of ['On hold', 'Booked', 'Completed', 'Cancelled']) {
      expect(bookingActions(status, before, START, 'agency')).toEqual(none)
      expect(bookingActions(status, after, START, 'agency')).toEqual(none)
    }
  })
})
