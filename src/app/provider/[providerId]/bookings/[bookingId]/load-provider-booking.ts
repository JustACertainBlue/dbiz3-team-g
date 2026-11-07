import { currentServerSession } from '@/lib/auth/server-session'
import { demoRepository } from '@/lib/db/application-store'
import { canManageBooking } from '@/lib/booking/booking-access'
import { getBookingDetail, type BookingDetail } from '@/lib/booking/booking-detail'

// Gate for BKG135, BKG144 and BKG136: the owning Local Provider on its own URL (BR-001, BR-014).
export async function loadProviderBooking(providerId: string, bookingId: string): Promise<BookingDetail | null> {
  const session = (await currentServerSession())
  const booking = (await demoRepository().find('bookings', row => row.booking_id === bookingId))
  if (!booking || !(await canManageBooking(session, providerId, booking))) return null
  return (await getBookingDetail(session, bookingId)) // runs expiry first (#50)
}
