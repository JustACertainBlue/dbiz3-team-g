import Link from 'next/link'
import { currentServerSession } from '@/lib/auth/server-session'
import { BookingError, canOpenCreateBooking } from '@/lib/booking/create-booking'
import { listProviderBookings } from '@/lib/booking/list-bookings'
import { bookingTourPill, LIST_TABS, PAY_LABEL, parseTab, tabCount } from '@/lib/booking/list-tabs'
import { hanoiClock, hanoiDate } from '@/lib/time/hanoi-time'
import './list-v3.css'

export const dynamic = 'force-dynamic'

const PAGE = 5
const dmy = (value: string) => hanoiDate(value).split('-').reverse().join('/')

// Screen 34 (BKG133) Quản lý đặt chỗ, mockup 19/11: tabs with counts, table, "Hiển thị x–y / N đặt chỗ".
// "Cần xử lý" = On hold, soonest hold_expires_at first (UI v3 decision #10).
export default async function BookingManagementPage({ params, searchParams }: { params: { providerId: string }; searchParams: { tab?: string; page?: string } }) {
  const session = await currentServerSession()
  if (!(await canOpenCreateBooking(session, params.providerId))) {
    return <main className="v3l"><h1 className="v3l-h1">Lịch sử đặt chỗ</h1><p>Chỉ xưởng sở hữu hồ sơ này mới xem được danh sách đặt chỗ.</p><Link href="/login" className="v3l-btn">Đăng nhập</Link></main>
  }
  const tab = parseTab(searchParams.tab)
  const def = LIST_TABS.find(item => item.id === tab)!
  const page = Math.max(1, Number(searchParams.page) || 1)
  const base = `/provider/${params.providerId}/bookings`
  let list
  try {
    list = await listProviderBookings(session, { tab: def.todo ? 'todo' : undefined, status: def.todo ? undefined : def.status, page: String(page), page_size: String(PAGE) })
  } catch (error) {
    return <main className="v3l"><h1 className="v3l-h1">Lịch sử đặt chỗ</h1><p role="alert">{error instanceof BookingError ? error.message : 'Không tải được danh sách đặt chỗ.'}</p></main>
  }
  const last = Math.max(1, Math.ceil(list.total_count / PAGE))
  const from = (page - 1) * PAGE
  const now = new Date()
  const href = (nextTab: string, nextPage = 1) => `${base}?tab=${nextTab}&page=${nextPage}`
  return <main className="v3l">
    <div className="v3l-head">
      <div><h1 className="v3l-h1">Lịch sử đặt chỗ</h1><p className="v3l-sub">Tạo đặt chỗ sau khi đã thống nhất với công ty lữ hành trong tin nhắn.</p></div>
      <Link className="v3l-btn" href={`${base}/new`}>Tạo đặt chỗ</Link>
    </div>
    <nav className="v3l-tabs" aria-label="Lọc đặt chỗ">
      {LIST_TABS.map(item => <Link key={item.id} className="v3l-tab" href={href(item.id)} aria-current={item.id === tab ? 'page' : undefined}>{item.label} ({tabCount(item.id, list.status_counts)})</Link>)}
    </nav>
    {list.bookings.length === 0
      ? <p className="v3l-empty">Chưa có đặt chỗ.</p>
      : <table className="v3l-table">
        <thead><tr><th scope="col">Ngày</th><th scope="col">Công ty lữ hành</th><th scope="col">Trải nghiệm</th><th scope="col">Khách</th><th scope="col">Đặt chỗ</th><th scope="col">Thanh toán</th><th scope="col">Thao tác</th></tr></thead>
        <tbody>{list.bookings.map(row => {
          const pill = bookingTourPill(row.status, 'provider', row.start_at, now)
          return <tr key={row.booking_id}>
            <td>{dmy(row.start_at)}<span className="v3l-time">{hanoiClock(row.start_at)} – {hanoiClock(row.end_at)}</span></td>
            <td>{row.agency_name}</td><td>{row.experience_name}</td><td>{row.group_size}</td>
            <td><span className={`v3l-pill v3l-pill--${pill.cls}`}>{pill.label}</span></td>
            <td>{PAY_LABEL[row.status]}</td>
            <td><Link className="v3l-link" href={`${base}/${row.booking_id}`}>Xem chi tiết</Link></td>
          </tr>
        })}</tbody>
      </table>}
    <div className="v3l-foot">
      <p className="v3l-note">{list.total_count ? `Hiển thị ${from + 1}–${from + list.bookings.length} / ${list.total_count} đặt chỗ` : 'Chưa có đặt chỗ'}</p>
      <div className="v3l-arrows">
        <Link className="v3l-arrow" href={href(tab, page - 1)} aria-label="Trang trước" aria-disabled={page <= 1}>‹</Link>
        <Link className="v3l-arrow" href={href(tab, page + 1)} aria-label="Trang sau" aria-disabled={page >= last}>›</Link>
      </div>
    </div>
  </main>
}
