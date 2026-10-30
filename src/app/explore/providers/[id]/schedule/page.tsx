import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DEMO_SESSION_COOKIE, demoSessionFor } from '@/lib/auth/demo-session'
import { addDays, hanoiDate } from '@/lib/booking/clock'
import { BookingError } from '@/lib/booking/create-booking'
import { getProviderSchedule, scheduleEntryFor } from '@/lib/booking/provider-schedule'
import CalendarGrid, { calendarStyles } from '@/app/schedule-calendar/CalendarGrid'
import { bookingDetailStyles } from '@/app/provider/[providerId]/bookings/[bookingId]/BookingDetailView'

export const dynamic = 'force-dynamic'

// Screen SCH140 Provider Schedule – Agency View (F-SCHED-01 public view; #74, #75, #82).
export default async function AgencyProviderSchedulePage({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | undefined> }) {
  const session = demoSessionFor(cookies().get(DEMO_SESSION_COOKIE)?.value)
  const styles = bookingDetailStyles + calendarStyles
  const entry = scheduleEntryFor(session, params.id)
  if (entry === 'redirect-owner') redirect(`/provider/${params.id}/schedule`)
  if (entry === 'not-found') {
    return <main className="bkg-page bkg-state"><h1>Provider Schedule – Agency View</h1><p>Không tìm thấy Provider đã xác minh này.</p><Link href="/explore">Về Explore</Link><style>{styles}</style></main>
  }
  if (entry === 'denied') {
    return <main className="bkg-page bkg-state"><h1>Provider Schedule – Agency View</h1><p>Chỉ Tour Agency mới xem được lịch trống của Provider.</p><Link href="/login">Chọn tài khoản demo</Link><style>{styles}</style></main>
  }

  const base = `/explore/providers/${params.id}/schedule`
  const dateFrom = searchParams.date_from || hanoiDate(Date.now())
  let schedule
  try {
    schedule = await getProviderSchedule(session, params.id, { date_from: dateFrom })
  } catch (error) {
    const message = error instanceof BookingError ? `${error.code}: ${error.message}` : 'Không tải được lịch.'
    return <main className="bkg-page bkg-state"><h1>Provider Schedule – Agency View</h1><p className="bkg-error" role="alert">{message}</p><Link href={base}>Về hôm nay</Link><style>{styles}</style></main>
  }
  const days = Array.from({ length: 30 }, (_, index) => addDays(dateFrom, index))

  return <main className="bkg-page bkg-list">
    <header><p>HANOI ARTISAN BRIDGE · SCH140</p><h1>Provider Schedule – Agency View</h1><span>Khung giờ trống và khung giờ đã có đoàn (ẩn thông tin Agency khác)</span></header>
    <p className="bkg-actions">
      <Link href={`${base}?date_from=${addDays(dateFrom, -30)}`}>← 30 ngày trước</Link>
      <span>{dateFrom} → {addDays(dateFrom, 29)}</span>
      <Link href={`${base}?date_from=${addDays(dateFrom, 30)}`}>30 ngày sau →</Link>
    </p>
    <form className="bkg-filters" method="get" action={base}>
      <input type="hidden" name="date_from" value={dateFrom} />
      <label>Chọn ngày
        <select name="day" defaultValue={searchParams.day ?? ''}>
          <option value="">—</option>
          {days.map(day => <option key={day} value={day}>{day}</option>)}
        </select>
      </label>
      <div className="bkg-actions"><button type="submit">Select day</button></div>
    </form>
    <CalendarGrid days={days} blocks={schedule.calendar_blocks} selectedDate={searchParams.day} />
    <p className="bkg-actions"><Link className="bkg-link-btn" href={`/explore/providers/${params.id}`}>Request Quote</Link></p>
    <style>{styles + '.bkg-list{max-width:1080px}.bkg-filters{display:flex;gap:12px;align-items:end;margin-top:12px}.bkg-filters label{display:grid;gap:4px;font-weight:700;font-size:13px}.bkg-filters select{padding:8px 10px;border:1px solid #ddd6ca;border-radius:10px;font:inherit}'}</style>
  </main>
}
