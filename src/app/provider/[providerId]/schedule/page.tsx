import Link from 'next/link'
import { cookies } from 'next/headers'
import { DEMO_SESSION_COOKIE, demoSessionFor } from '@/lib/auth/demo-session'
import { getBookingDetail } from '@/lib/booking/booking-detail'
import { addDays, hanoiDate } from '@/lib/booking/clock'
import { BookingError, canOpenCreateBooking } from '@/lib/booking/create-booking'
import { getProviderSchedule } from '@/lib/booking/provider-schedule'
import CalendarGrid, { calendarStyles } from '@/app/schedule-calendar/CalendarGrid'
import BookingActionsBar from '../bookings/[bookingId]/BookingActionsBar'
import BookingDetailView, { bookingDetailStyles } from '../bookings/[bookingId]/BookingDetailView'

export const dynamic = 'force-dynamic'

// Screen SCH139 Provider Schedule (F-SCHED-01 owner view on F-SCHED-09). Owner gate reused from
// BKG134 (analyze L2): the owning Local Provider on its own URL.
export default async function ProviderSchedulePage({ params, searchParams }: { params: { providerId: string }; searchParams: Record<string, string | undefined> }) {
  const session = demoSessionFor(cookies().get(DEMO_SESSION_COOKIE)?.value)
  const styles = bookingDetailStyles + calendarStyles
  if (!canOpenCreateBooking(session, params.providerId)) {
    return <main className="bkg-page bkg-state"><h1>Provider Schedule</h1><p>Chỉ Local Provider sở hữu hồ sơ này mới xem được lịch này.</p><Link href="/login">Chọn tài khoản demo</Link><style>{styles}</style></main>
  }
  const base = `/provider/${params.providerId}/schedule`
  const dateFrom = searchParams.date_from || hanoiDate(Date.now())
  let schedule
  try {
    schedule = await getProviderSchedule(session, params.providerId, { date_from: dateFrom })
  } catch (error) {
    const message = error instanceof BookingError ? `${error.code}: ${error.message}` : 'Không tải được lịch.'
    return <main className="bkg-page bkg-state"><h1>Provider Schedule</h1><p className="bkg-error" role="alert">{message}</p><Link href={base}>Về hôm nay</Link><style>{styles}</style></main>
  }
  const days = Array.from({ length: 30 }, (_, index) => addDays(dateFrom, index))

  // #76: selecting an own Booking block shows the BKG135 buttons with the same rules.
  const selected = searchParams.booking
    ? await getBookingDetail(session, searchParams.booking).catch(() => null)
    : null

  return <main className="bkg-page bkg-list">
    <header><p>HANOI ARTISAN BRIDGE · SCH139</p><h1>Provider Schedule</h1><span>{session.displayName} · lịch tính từ giờ mở cửa và các Booking On hold / Booked</span></header>
    <p className="bkg-actions">
      <Link href={`${base}?date_from=${addDays(dateFrom, -30)}`}>← 30 ngày trước</Link>
      <span>{dateFrom} → {addDays(dateFrom, 29)}</span>
      <Link href={`${base}?date_from=${addDays(dateFrom, 30)}`}>30 ngày sau →</Link>
    </p>
    <CalendarGrid days={days} blocks={schedule.calendar_blocks}
      hrefFor={block => block.booking_id ? `${base}?date_from=${dateFrom}&booking=${block.booking_id}` : undefined} />
    {selected && <section style={{ marginTop: 20 }}>
      <h2>Booking đã chọn</h2>
      <BookingDetailView detail={selected} />
      <BookingActionsBar providerId={params.providerId} bookingId={selected.booking_id} actions={selected.actions} />
      <p className="bkg-actions"><Link href={`/provider/${params.providerId}/bookings/${selected.booking_id}`}>View → BKG135</Link></p>
    </section>}
    <p className="bkg-actions">
      <Link className="bkg-link-btn" href={`/provider/${params.providerId}/bookings/new`}>Create booking</Link>
      <Link href={`/provider/${params.providerId}/edit`}>Operating hours</Link>
    </p>
    <style>{styles}</style>
  </main>
}
