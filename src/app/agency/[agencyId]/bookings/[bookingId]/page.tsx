import Link from 'next/link'
import { cookies } from 'next/headers'
import { DEMO_SESSION_COOKIE, demoSessionFor } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { canViewAgencyBooking } from '@/lib/booking/booking-access'
import { getBookingDetail } from '@/lib/booking/booking-detail'
import BookingDetailView, { bookingDetailStyles } from '@/app/provider/[providerId]/bookings/[bookingId]/BookingDetailView'

export const dynamic = 'force-dynamic'

// Screen BKG138 Booking Detail (F-SCHED-07, Tour Agency): read-only, no action buttons.
export default async function AgencyBookingDetailPage({ params }: { params: { agencyId: string; bookingId: string } }) {
  const session = demoSessionFor(cookies().get(DEMO_SESSION_COOKIE)?.value)
  const booking = demoRepository().find('bookings', row => row.booking_id === params.bookingId)
  if (!booking || !canViewAgencyBooking(session, params.agencyId, booking)) {
    return <main className="bkg-page bkg-state"><h1>Booking Detail</h1><p>Chỉ Tour Agency của Booking này mới xem được trang này.</p><Link href="/login">Chọn tài khoản demo</Link><style>{bookingDetailStyles}</style></main>
  }
  const detail = await getBookingDetail(session, params.bookingId) // runs expiry first (#50)
  return <main className="bkg-page">
    <header><p>HANOI ARTISAN BRIDGE · BKG138</p><h1>Booking Detail</h1><span>Chỉ xem · mọi thay đổi do Local Provider thực hiện</span></header>
    <BookingDetailView detail={detail} />
    <p className="bkg-actions"><Link href="/messages">Chat</Link><Link href={`/agency/${params.agencyId}/bookings`}>← Back</Link></p>
    <style>{bookingDetailStyles}</style>
  </main>
}
