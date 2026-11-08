import Link from 'next/link'
import ChatOpenButton from '@/app/messages/ChatOpenButton'
import { currentServerSession } from '@/lib/auth/server-session'
import { demoRepository } from '@/lib/db/application-store'
import { canViewAgencyBooking } from '@/lib/booking/booking-access'
import { getBookingDetail } from '@/lib/booking/booking-detail'
import { bookingDetailStyles } from '@/app/provider/[providerId]/bookings/[bookingId]/BookingDetailView'
import BookingDetailScreen from '@/app/provider/[providerId]/bookings/[bookingId]/BookingDetailScreen'

export const dynamic = 'force-dynamic'

// Screen BKG138 Booking Detail (F-SCHED-07, Tour Agency): read-only, no action buttons.
export default async function AgencyBookingDetailPage({ params }: { params: { agencyId: string; bookingId: string } }) {
  const session = (await currentServerSession())
  const booking = (await demoRepository().find('bookings', row => row.booking_id === params.bookingId))
  if (!booking || !(await canViewAgencyBooking(session, params.agencyId, booking))) {
    return <main className="bkg-page bkg-state"><h1>Booking Detail</h1><p>Chỉ Tour Agency của Booking này mới xem được trang này.</p><Link href="/login">Đăng nhập</Link><style>{bookingDetailStyles}</style></main>
  }
  const detail = await getBookingDetail(session, params.bookingId) // runs expiry first (#50)
  return <main>
    <BookingDetailScreen detail={detail} readOnly back={{ href: `/agency/${params.agencyId}/bookings`, label: 'Quay lại đặt chỗ' }}
      actions={<ChatOpenButton bookingId={params.bookingId} label="Nhắn tin" className="bkg-btn bkg-btn--outline" />} />
    <style>{bookingDetailStyles}</style>
  </main>
}
