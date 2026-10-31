import Link from 'next/link'
import BookingDetailView, { bookingDetailStyles } from '../BookingDetailView'
import { loadProviderBooking } from '../load-provider-booking'
import EditBookingForm from './EditBookingForm'

export const dynamic = 'force-dynamic'

// Screen BKG144 Edit Booking Detail (F-SCHED-04 + F-SCHED-05, Local Provider).
export default async function EditBookingPage({ params }: { params: { providerId: string; bookingId: string } }) {
  const detail = await loadProviderBooking(params.providerId, params.bookingId)
  if (!detail) {
    return <main className="bkg-page bkg-state"><h1>Edit Booking Detail</h1><p>Chỉ Local Provider sở hữu Booking này mới sửa được.</p><Link href="/login">Chọn tài khoản demo</Link><style>{bookingDetailStyles}</style></main>
  }
  const back = `/provider/${params.providerId}/bookings/${params.bookingId}`
  if (!detail.actions.update) {
    // BR-011: Completed and Cancelled Bookings are view only.
    return <main className="bkg-page bkg-state"><h1>Edit Booking Detail</h1><p>Booking {detail.status} không thể sửa.</p><Link href={back}>← Về Booking Detail</Link><style>{bookingDetailStyles}</style></main>
  }
  return <main className="bkg-page">
    <header><p>HANOI ARTISAN BRIDGE · BKG144</p><h1>Edit Booking Detail</h1><span>Booking ID {detail.booking_id} · đổi giờ không gia hạn thời gian giữ chỗ</span></header>
    <BookingDetailView detail={detail} />
    <EditBookingForm detail={detail} backHref={back} />
    <style>{bookingDetailStyles}</style>
  </main>
}
