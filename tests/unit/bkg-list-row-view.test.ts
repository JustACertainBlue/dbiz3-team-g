import { describe, expect, it } from 'vitest'
import { bookingListRowView } from '@/lib/booking/list-row-view'

// T015: BKG133 row view (analyze C1, M1): AS-4 Detail → F-SCHED-07 (BKG135); SC-011 text label.
const PROVIDER = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const base = {
  booking_id: '4bf17b30-9819-5c47-b745-06be7171087b',
  experience_name: 'Nặn gốm thủ công',
  agency_name: 'Công ty Du lịch Hồng Hà',
  start_at: '2026-10-05T09:00:00+07:00',
  end_at: '2026-10-05T10:00:00+07:00',
  group_size: 6,
  status: 'Booked',
  requires_action: true,
}

describe('T015 | bookingListRowView', () => {
  it('links the row to its BKG135 detail', () => {
    expect(bookingListRowView(base, PROVIDER).detail_href).toBe(`/provider/${PROVIDER}/bookings/${base.booking_id}`)
  })

  it('labels rows that need action with text, not colour alone', () => {
    expect(bookingListRowView(base, PROVIDER).needs_action_label).toBe('Cần xử lý')
    expect(bookingListRowView({ ...base, requires_action: false }, PROVIDER).needs_action_label).toBeNull()
  })

  it('shows hold expiry only for On hold, and the time range', () => {
    const view = bookingListRowView(base, PROVIDER)
    expect(view.hold_expiry).toBeNull()
    expect(view.when).toBe('2026-10-05 09:00 → 10:00')
    const onHold = bookingListRowView({ ...base, status: 'On hold', hold_expires_at: '2026-10-03T08:00:00+07:00' }, PROVIDER)
    expect(onHold.hold_expiry).toBe('2026-10-03 08:00')
  })
})
