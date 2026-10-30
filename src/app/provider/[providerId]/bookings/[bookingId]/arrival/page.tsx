import Link from 'next/link'
import { bookingDetailStyles, hanoiTime } from '../BookingDetailView'
import { loadProviderBooking } from '../load-provider-booking'
import ConfirmArrival from './ConfirmArrival'

export const dynamic = 'force-dynamic'

// Screen BKG136 Confirm Group Arrival (F-SCHED-06, Local Provider).
export default async function ConfirmArrivalPage({ params }: { params: { providerId: string; bookingId: string } }) {
  const detail = await loadProviderBooking(params.providerId, params.bookingId)
  if (!detail) {
    return <main className="bkg-page bkg-state"><h1>Confirm Group Arrival</h1><p>Chỉ Local Provider sở hữu Booking này mới xác nhận được.</p><Link href="/login">Chọn tài khoản demo</Link><style>{bookingDetailStyles}</style></main>
  }
  const back = `/provider/${params.providerId}/bookings/${params.bookingId}`
  return <main className="bkg-page">
    <header><p>HANOI ARTISAN BRIDGE · BKG136</p><h1>Confirm Group Arrival</h1></header>
    <section className="bkg-panel">
      <h2>{detail.experience_name}</h2>
      <dl>
        <dt>Booking ID</dt><dd>{detail.booking_id}</dd>
        <dt>Bắt đầu</dt><dd>{hanoiTime(detail.start_at)}</dd>
        <dt>Số khách</dt><dd>{detail.group_size}</dd>
        <dt>Trạng thái</dt><dd><strong className="bkg-status">{detail.status}</strong></dd>
      </dl>
    </section>
    <p className="bkg-panel">Xác nhận đoàn đã đến sẽ chuyển Booking từ Booked sang Completed. Chỉ làm được khi Booking đang Booked và đã tới giờ bắt đầu.</p>
    <ConfirmArrival bookingId={detail.booking_id} backHref={back} />
    <style>{bookingDetailStyles}</style>
  </main>
}
