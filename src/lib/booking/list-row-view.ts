import type { ListedBooking } from './list-bookings'
import { hanoiClock, hanoiDateTime } from '../time/hanoi-time'

// BKG133 row (analyze C1, M1): Detail → BKG135 (AS-4) and a text "needs action" label (SC-011).
// Times are shown in Asia/Ho_Chi_Minh (UTC from PostgreSQL or +07:00), #87.
export interface BookingListRowView {
  booking_id: string
  detail_href: string
  when: string
  agency_name: string
  experience_name: string
  group_size: number
  status: string
  hold_expiry: string | null
  needs_action_label: string | null
}

export function bookingListRowView(row: ListedBooking, providerId: string): BookingListRowView {
  return {
    booking_id: row.booking_id,
    detail_href: `/provider/${providerId}/bookings/${row.booking_id}`,
    when: `${hanoiDateTime(row.start_at)} → ${hanoiClock(row.end_at)}`,
    agency_name: row.agency_name,
    experience_name: row.experience_name,
    group_size: row.group_size,
    status: row.status,
    hold_expiry: row.status === 'On hold' && row.hold_expires_at ? hanoiDateTime(row.hold_expires_at) : null,
    needs_action_label: row.requires_action ? 'Cần xử lý' : null,
  }
}
