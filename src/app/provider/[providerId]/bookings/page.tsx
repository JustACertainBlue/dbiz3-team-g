import Link from 'next/link'
import { cookies } from 'next/headers'
import { DEMO_SESSION_COOKIE, demoSessionFor } from '@/lib/auth/demo-session'
import { hanoiDate } from '@/lib/booking/clock'
import { BookingError, canOpenCreateBooking } from '@/lib/booking/create-booking'
import { BOOKING_STATUSES, countActionsOutsideFilter, listProviderBookings, type ListQuery } from '@/lib/booking/list-bookings'
import { bookingListRowView } from '@/lib/booking/list-row-view'
import { bookingDetailStyles } from './[bookingId]/BookingDetailView'

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | undefined>

// Screen BKG133 Booking Management (F-SCHED-10, Local Provider). Same gate as BKG134: the owning
// Provider on its own URL (analyze L2).
export default async function BookingManagementPage({ params, searchParams }: { params: { providerId: string }; searchParams: SearchParams }) {
  const session = demoSessionFor(cookies().get(DEMO_SESSION_COOKIE)?.value)
  if (!canOpenCreateBooking(session, params.providerId)) {
    return <main className="bkg-page bkg-state"><h1>Booking Management</h1><p>Chỉ Local Provider sở hữu hồ sơ này mới xem được danh sách Booking.</p><Link href="/login">Chọn tài khoản demo</Link><style>{bookingDetailStyles + listStyles}</style></main>
  }

  // UI choice (plan.md): date_from defaults to today in Asia/Ho_Chi_Minh; an empty value means no filter.
  const query: ListQuery = {
    status: searchParams.status ?? '',
    date_from: searchParams.date_from ?? hanoiDate(Date.now()),
    date_to: searchParams.date_to ?? '',
    page: searchParams.page ?? '1',
  }
  const base = `/provider/${params.providerId}/bookings`
  const href = (changes: SearchParams) => {
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries({ ...query, ...changes })) next.set(key, String(value ?? ''))
    return `${base}?${next.toString()}`
  }
  const allHref = `${base}?date_from=&status=&date_to=&page=1`

  let list
  let outside = 0
  try {
    list = await listProviderBookings(session, query)
    outside = await countActionsOutsideFilter(session, query) // analyze H2
  } catch (error) {
    const message = error instanceof BookingError ? `${error.code}: ${error.message}` : 'Không tải được danh sách Booking.'
    return <main className="bkg-page bkg-state"><h1>Booking Management</h1><p className="bkg-error" role="alert">{message}</p><Link href={allHref}>Xoá bộ lọc</Link><style>{bookingDetailStyles + listStyles}</style></main>
  }

  const page = Number(query.page)
  const lastPage = Math.max(1, Math.ceil(list.total_count / 20))
  const rows = list.bookings.map(row => bookingListRowView(row, params.providerId))

  return <main className="bkg-page bkg-list">
    <header><p>HANOI ARTISAN BRIDGE · BKG133</p><h1>Booking Management</h1><span>{session.displayName} · sắp theo giờ bắt đầu</span></header>

    <form className="bkg-filters" method="get" action={base}>
      <label>Trạng thái
        <select name="status" defaultValue={String(query.status ?? '')}>
          <option value="">Tất cả</option>
          {BOOKING_STATUSES.map(status => <option key={status} value={status}>{status} ({list.status_counts[status]})</option>)}
        </select>
      </label>
      <label>Từ ngày<input type="date" name="date_from" defaultValue={String(query.date_from ?? '')} /></label>
      <label>Đến ngày<input type="date" name="date_to" defaultValue={String(query.date_to ?? '')} /></label>
      <input type="hidden" name="page" value="1" />
      <div className="bkg-actions"><button type="submit">Lọc</button><Link href={allHref}>Xoá bộ lọc</Link></div>
    </form>

    <p className="bkg-panel bkg-outside">⚑ <strong>{outside}</strong> Booking cần xử lý nằm ngoài bộ lọc · <Link href={allHref}>Xem tất cả</Link></p>

    {rows.length === 0
      ? <p className="bkg-panel bkg-empty">Không có Booking nào khớp bộ lọc này. Thử “Xoá bộ lọc” để xem cả lịch sử.</p>
      : <table className="bkg-table">
          <thead><tr><th>Thời gian</th><th>Agency</th><th>Experience</th><th>Khách</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {rows.map(row => <tr key={row.booking_id} className={row.needs_action_label ? 'bkg-needs' : undefined}>
              <td>{row.when}{row.hold_expiry && <small>Giữ chỗ đến {row.hold_expiry}</small>}</td>
              <td>{row.agency_name}</td>
              <td>{row.experience_name}</td>
              <td>{row.group_size}</td>
              <td><strong className="bkg-status">{row.status}</strong>{row.needs_action_label && <span className="bkg-flag">⚑ {row.needs_action_label}</span>}</td>
              <td><Link href={row.detail_href}>Detail</Link></td>
            </tr>)}
          </tbody>
        </table>}

    <p className="bkg-actions">
      {page > 1 && <Link href={href({ page: String(page - 1) })}>← Trang trước</Link>}
      <span>Trang {page}/{lastPage} · {list.total_count} Booking</span>
      {page < lastPage && <Link href={href({ page: String(page + 1) })}>Trang sau →</Link>}
    </p>
    <p className="bkg-actions">
      <Link className="bkg-link-btn" href={`/provider/${params.providerId}/bookings/new`}>Create</Link>
      <Link href="/messages">Messages</Link>
    </p>
    <style>{bookingDetailStyles + listStyles}</style>
  </main>
}

const listStyles = `.bkg-list{max-width:1080px}.bkg-filters{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin-top:20px;padding:16px;background:#f4efe5;border-radius:14px}.bkg-filters label{display:grid;gap:4px;font-weight:700;font-size:13px}.bkg-filters input,.bkg-filters select{padding:8px 10px;border:1px solid #ddd6ca;border-radius:10px;font:inherit;background:white}.bkg-filters .bkg-actions{margin-top:0}.bkg-outside{margin-top:14px}.bkg-empty{margin-top:14px}.bkg-table{width:100%;border-collapse:collapse;margin-top:14px;font-size:14px}.bkg-table th,.bkg-table td{padding:10px 8px;border-bottom:1px solid #e4ddd0;text-align:left;vertical-align:top}.bkg-table small{display:block;color:#66746d}.bkg-needs{background:#fff4e0}.bkg-needs td:first-child{border-left:4px solid #9a4a2a}.bkg-flag{display:inline-block;margin-left:8px;font-weight:800;color:#8a1f11}@media(max-width:720px){.bkg-table thead{display:none}.bkg-table tr{display:grid;padding:8px 0}.bkg-table td{border:0;padding:2px 8px}}`
