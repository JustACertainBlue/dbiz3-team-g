import Link from 'next/link'
import { listAgencyBookings } from '@/lib/booking/agency-bookings'
import { addDays, hanoiDate } from '@/lib/booking/clock'
import { BookingError } from '@/lib/booking/create-booking'
import { BOOKING_STATUSES } from '@/lib/booking/list-bookings'
import CalendarGrid, { calendarStyles } from '@/app/schedule-calendar/CalendarGrid'
import { bookingDetailStyles } from '@/app/provider/[providerId]/bookings/[bookingId]/BookingDetailView'
import { agencyPageSession } from '../agency-booking-gate'

export const dynamic = 'force-dynamic'

// Screen SCH141 Agency Schedule (F-SCHED-02 calendar, #68): own Bookings in all canonical statuses,
// date range (default today .. +29, UI choice #71) and status filter (analyze M1).
export default async function AgencySchedulePage({ params, searchParams }: { params: { agencyId: string }; searchParams: Record<string, string | undefined> }) {
  const session = agencyPageSession(params.agencyId)
  const styles = bookingDetailStyles + calendarStyles + scheduleStyles
  if (!session) {
    return <main className="bkg-page bkg-state"><h1>Agency Schedule</h1><p>Chỉ Tour Agency của tài khoản này mới xem được lịch này.</p><Link href="/login">Chọn tài khoản demo</Link><style>{styles}</style></main>
  }
  const base = `/agency/${params.agencyId}/schedule`
  const dateFrom = searchParams.date_from || hanoiDate(Date.now())
  const dateTo = searchParams.date_to || addDays(dateFrom, 29)
  const status = searchParams.status ?? ''
  let rows
  try {
    rows = (await listAgencyBookings(session, { status, date_from: dateFrom, date_to: dateTo })).bookings
  } catch (error) {
    const message = error instanceof BookingError ? `${error.code}: ${error.message}` : 'Không tải được lịch.'
    return <main className="bkg-page bkg-state"><h1>Agency Schedule</h1><p className="bkg-error" role="alert">{message}</p><Link href={base}>Về hôm nay</Link><style>{styles}</style></main>
  }
  const days: string[] = []
  for (let day = dateFrom; day <= dateTo && days.length < 62; day = addDays(day, 1)) days.push(day)
  const blocks = rows.map(row => ({ start_at: row.start_at, end_at: row.end_at, status: row.status, booking_id: row.booking_id }))

  return <main className="bkg-page bkg-list">
    <header><p>HANOI ARTISAN BRIDGE · SCH141</p><h1>Agency Schedule</h1><span>{session.displayName} · Booking của chính Agency, chỉ xem</span></header>
    <form className="bkg-filters" method="get" action={base}>
      <label>Trạng thái
        <select name="status" defaultValue={status}>
          <option value="">Tất cả</option>
          {BOOKING_STATUSES.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>Từ ngày<input type="date" name="date_from" defaultValue={dateFrom} /></label>
      <label>Đến ngày<input type="date" name="date_to" defaultValue={dateTo} /></label>
      <div className="bkg-actions"><button type="submit">Lọc</button><Link href={base}>Về hôm nay</Link></div>
    </form>
    <p className="bkg-panel" style={{ marginTop: 14 }}>{rows.length} Booking trong khoảng {dateFrom} → {dateTo}</p>
    <CalendarGrid days={days} blocks={blocks} hrefFor={block => `/agency/${params.agencyId}/bookings/${block.booking_id}`} />
    <p className="bkg-actions"><Link href={`/agency/${params.agencyId}/bookings`}>Booking History</Link><Link href="/messages">Chat</Link></p>
    <style>{styles}</style>
  </main>
}

const scheduleStyles = `.bkg-list{max-width:1080px}.bkg-filters{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin-top:20px;padding:16px;background:#f4efe5;border-radius:14px}.bkg-filters label{display:grid;gap:4px;font-weight:700;font-size:13px}.bkg-filters input,.bkg-filters select{padding:8px 10px;border:1px solid #ddd6ca;border-radius:10px;font:inherit;background:white}.bkg-filters .bkg-actions{margin-top:0}`
