import Link from 'next/link'
import { listAgencyBookings } from '@/lib/booking/agency-bookings'
import { BookingError } from '@/lib/booking/create-booking'
import { BOOKING_STATUSES } from '@/lib/booking/list-bookings'
import { bookingDetailStyles, formatVnd, hanoiTime } from '@/app/provider/[providerId]/bookings/[bookingId]/BookingDetailView'
import { agencyPageSession, ownVillages } from '../agency-booking-gate'
import { sessionDisplayName } from '@/lib/auth/session'
import { hanoiClock } from '@/lib/time/hanoi-time'
import StatusBadge from '@/app/components/StatusBadge'
import AutoRefresh from '@/app/components/AutoRefresh'
import { statusLabel } from '@/lib/status-labels'

export const dynamic = 'force-dynamic'

// Screen BKG137 Booking History (F-SCHED-02, Tour Agency, #68): own Bookings only, read-only.
export default async function AgencyBookingHistoryPage({ params, searchParams }: { params: { agencyId: string }; searchParams: Record<string, string | undefined> }) {
  const session = (await agencyPageSession(params.agencyId))
  const styles = bookingDetailStyles + historyStyles
  if (!session) {
    return <main className="bkg-page bkg-state"><h1>Booking History</h1><p>Chỉ Tour Agency của tài khoản này mới xem được lịch sử Booking.</p><Link href="/login">Đăng nhập</Link><style>{styles}</style></main>
  }
  const base = `/agency/${params.agencyId}/bookings`
  const query = { status: searchParams.status ?? '', village_id: searchParams.village_id ?? '', date_from: searchParams.date_from ?? '', date_to: searchParams.date_to ?? '' }
  let rows
  try {
    rows = (await listAgencyBookings(session, query)).bookings
  } catch (error) {
    const message = error instanceof BookingError ? `${error.code}: ${error.message}` : 'Không tải được danh sách Booking.'
    return <main className="bkg-page bkg-state"><h1>Booking History</h1><p className="bkg-error" role="alert">{message}</p><Link href={base}>Xoá bộ lọc</Link><style>{styles}</style></main>
  }

  return <main className="bkg-page bkg-list">
    {/* BKG FR-002: Provider changes show within ~10 s without a reload (#157 hook) */}
    <AutoRefresh />
    <header><p>HANOI ARTISAN BRIDGE · BKG137</p><h1>Booking History</h1><span>{(await sessionDisplayName(session))} · chỉ xem, sắp theo giờ bắt đầu</span></header>
    <form className="bkg-filters" method="get" action={base}>
      {query.status && <input type="hidden" name="status" value={query.status} />}
      <label>Làng nghề
        <select name="village_id" defaultValue={query.village_id}>
          <option value="">Tất cả</option>
          {(await ownVillages(params.agencyId)).map(village => <option key={village.village_id} value={village.village_id}>{village.name}</option>)}
        </select>
      </label>
      <label>Từ ngày<input type="date" name="date_from" defaultValue={query.date_from} /></label>
      <label>Đến ngày<input type="date" name="date_to" defaultValue={query.date_to} /></label>
      <div className="bkg-actions"><button type="submit">Lọc</button><Link href={base}>Xoá bộ lọc</Link></div>
    </form>
    {/* #193, screen-spec-BKG137 §8: status filter tabs below the date/village filters; each tab keeps those filters. */}
    <nav className="bkg-status-tabs" aria-label="Lọc theo trạng thái">
      {['', ...BOOKING_STATUSES].map(status => {
        const params = new URLSearchParams(Object.entries({ ...query, status }).filter(([, value]) => value))
        const href = params.size ? `${base}?${params}` : base
        return <Link key={status || 'all'} href={href} aria-current={query.status === status ? 'page' : undefined}>{status ? statusLabel('booking', status) : 'Tất cả'}</Link>
      })}
    </nav>
    {rows.length === 0
      ? <p className="bkg-panel" style={{ marginTop: 14 }}>Không có Booking nào khớp bộ lọc này.</p>
      : <table className="bkg-table">
          <thead><tr><th>Thời gian</th><th>Làng · Provider</th><th>Experience</th><th>Khách</th><th>Giá</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {rows.map(row => <tr key={row.booking_id}>
              <td>{hanoiTime(row.start_at)} → {hanoiClock(row.end_at)}<small>Cập nhật {hanoiTime(row.last_updated_at)}</small></td>
              <td>{row.village_name} · {row.provider_name}</td>
              <td>{row.experience_name}</td>
              <td>{row.group_size}</td>
              <td>{formatVnd(row.agreed_price)}</td>
              <td><StatusBadge family="booking" status={row.status} /></td>
              <td><Link href={`${base}/${row.booking_id}`}>Booking detail</Link></td>
            </tr>)}
          </tbody>
        </table>}
    <p className="bkg-actions"><Link href={`/agency/${params.agencyId}/schedule`}>Schedule</Link><Link href="/messages">Chat</Link></p>
    <style>{styles}</style>
  </main>
}

const historyStyles = `.bkg-list{max-width:1080px}.bkg-filters{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin-top:20px;padding:16px;background:#f4efe5;border-radius:14px}.bkg-filters label{display:grid;gap:4px;font-weight:700;font-size:13px}.bkg-filters input,.bkg-filters select{padding:8px 10px;border:1px solid #ddd6ca;border-radius:10px;font:inherit;background:white}.bkg-filters .bkg-actions{margin-top:0}.bkg-status-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.bkg-status-tabs a{padding:8px 16px;border:1px solid #ddd6ca;border-radius:999px;color:#203229;font-weight:700;font-size:14px;text-decoration:none;background:white}.bkg-status-tabs a[aria-current="page"]{background:#203229;border-color:#203229;color:white}.bkg-table{width:100%;border-collapse:collapse;margin-top:14px;font-size:14px}.bkg-table th,.bkg-table td{padding:10px 8px;border-bottom:1px solid #e4ddd0;text-align:left;vertical-align:top}.bkg-table small{display:block;color:#66746d}@media(max-width:720px){.bkg-table thead{display:none}.bkg-table tr{display:grid;padding:8px 0}.bkg-table td{border:0;padding:2px 8px}}`
