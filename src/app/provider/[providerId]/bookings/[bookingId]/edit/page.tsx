import Link from 'next/link'
import BookingDetailView, { bookingDetailStyles } from '../BookingDetailView'
import { loadProviderBooking } from '../load-provider-booking'
import { demoRepository } from '@/lib/db/application-store'
import EditBookingForm from './EditBookingForm'
import { parseSlots } from '@/lib/explore/vocabulary'

export const dynamic = 'force-dynamic'

// Screen BKG144 Edit Booking Detail (F-SCHED-04 + F-SCHED-05, Local Provider).
export default async function EditBookingPage({ params }: { params: { providerId: string; bookingId: string } }) {
  const detail = await loadProviderBooking(params.providerId, params.bookingId)
  if (!detail) {
    return <main className="bkg-page bkg-state"><h1>Edit Booking Detail</h1><p>Chỉ Local Provider sở hữu Booking này mới sửa được.</p><Link href="/login">Đăng nhập</Link><style>{bookingDetailStyles}</style></main>
  }
  const back = `/provider/${params.providerId}/bookings/${params.bookingId}`
  if (!detail.actions.update) {
    // BR-011: Completed and Cancelled Bookings are view only.
    return <main className="bkg-page bkg-state"><h1>Edit Booking Detail</h1><p>Booking {detail.status} không thể sửa.</p><Link href={back}>← Về Booking Detail</Link><style>{bookingDetailStyles}</style></main>
  }
  // Time slots of the booked experience (the server enforces the same rule, slot-rules.ts).
  const booking = await demoRepository().find('bookings', row => row.booking_id === params.bookingId)
  let slotRows: Awaited<ReturnType<ReturnType<typeof demoRepository>['all']>> = []
  try { slotRows = (await demoRepository().all('experience_slots')).filter(row => row.experience_id === booking?.experience_id) } catch { slotRows = [] }
  const maxGuests = Number((await demoRepository().find('experiences', row => row.experience_id === booking?.experience_id))?.max_participants) || null
  const slots = parseSlots(slotRows).map(slot => ({ start: slot.start, end: slot.end, label: slot.label }))
  return <main className="bkg-page">
    <header><p>HANOI ARTISAN BRIDGE · BKG144</p><h1>Edit Booking Detail</h1><span>Booking ID {detail.booking_id} · đổi giờ không gia hạn thời gian giữ chỗ</span></header>
    <BookingDetailView detail={detail} />
    <EditBookingForm detail={detail} backHref={back} slots={slots} maxGuests={maxGuests} />
    <style>{bookingDetailStyles}</style>
  </main>
}
