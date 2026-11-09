import Link from 'next/link'
import ChatOpenButton from '@/app/messages/ChatOpenButton'
import { bookingDetailStyles } from './BookingDetailView'
import BookingDetailScreen from './BookingDetailScreen'
import BookingActionsBar from './BookingActionsBar'
import { loadProviderBooking } from './load-provider-booking'

export const dynamic = 'force-dynamic'

// Screen BKG135 Booking Detail (F-SCHED-07, Local Provider).
export default async function ProviderBookingDetailPage({ params }: { params: { providerId: string; bookingId: string } }) {
  const detail = await loadProviderBooking(params.providerId, params.bookingId)
  if (!detail) {
    return <main className="bkg-page bkg-state"><h1>Booking Detail</h1><p>Chỉ Local Provider sở hữu Booking này mới xem được trang này.</p><Link href="/login">Đăng nhập</Link><style>{bookingDetailStyles}</style></main>
  }
  return <main>
    <BookingDetailScreen detail={detail} back={{ href: `/provider/${params.providerId}/bookings`, label: 'Quay lại đặt chỗ' }}
      actions={<BookingActionsBar providerId={params.providerId} bookingId={detail.booking_id} actions={detail.actions} status={detail.status}
        chat={<ChatOpenButton bookingId={detail.booking_id} label="Nhắn tin" className="bkg-btn bkg-btn--outline" />} />} />
    <style>{bookingDetailStyles}</style>
  </main>
}
