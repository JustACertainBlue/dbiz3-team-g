import Link from 'next/link'
import BookingDetailView, { bookingDetailStyles } from './BookingDetailView'
import BookingActionsBar from './BookingActionsBar'
import { loadProviderBooking } from './load-provider-booking'

export const dynamic = 'force-dynamic'

// Screen BKG135 Booking Detail (F-SCHED-07, Local Provider).
export default async function ProviderBookingDetailPage({ params }: { params: { providerId: string; bookingId: string } }) {
  const detail = await loadProviderBooking(params.providerId, params.bookingId)
  if (!detail) {
    return <main className="bkg-page bkg-state"><h1>Booking Detail</h1><p>Chỉ Local Provider sở hữu Booking này mới xem được trang này.</p><Link href="/login">Chọn tài khoản demo</Link><style>{bookingDetailStyles}</style></main>
  }
  return <main className="bkg-page">
    <header><p>HANOI ARTISAN BRIDGE · BKG135</p><h1>Booking Detail</h1></header>
    <BookingDetailView detail={detail} />
    <BookingActionsBar providerId={params.providerId} bookingId={detail.booking_id} actions={detail.actions} />
    <p className="bkg-actions"><Link href="/messages">Chat</Link><Link href={`/provider/${params.providerId}`}>← Về trang Provider</Link></p>
    <style>{bookingDetailStyles}</style>
  </main>
}
