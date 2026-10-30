import { cookies } from 'next/headers'
import { DEMO_SESSION_COOKIE, demoSessionFor } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { canManageBooking } from '@/lib/booking/booking-access'
import { getBookingDetail, type BookingDetail } from '@/lib/booking/booking-detail'

// Gate for BKG135, BKG144 and BKG136: the owning Local Provider on its own URL (BR-001, BR-014).
export async function loadProviderBooking(providerId: string, bookingId: string): Promise<BookingDetail | null> {
  const session = demoSessionFor(cookies().get(DEMO_SESSION_COOKIE)?.value)
  const booking = demoRepository().find('bookings', row => row.booking_id === bookingId)
  if (!booking || !canManageBooking(session, providerId, booking)) return null
  return getBookingDetail(session, bookingId) // runs expiry first (#50)
}
