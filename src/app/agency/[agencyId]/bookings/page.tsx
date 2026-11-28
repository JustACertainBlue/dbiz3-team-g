import { CalendarDays, Search } from 'lucide-react'
import Link from 'next/link'
import AutoRefresh from '@/app/components/AutoRefresh'
import CoverImage from '@/app/explore/v3/CoverImage'
import { listAgencyBookings } from '@/lib/booking/agency-bookings'
import { AGENCY_TABS, agencyRowChips, agencyTabCount, parseAgencyTab } from '@/lib/booking/agency-list'
import { bookingTourPill } from '@/lib/booking/list-tabs'
import { bookingView } from '@/lib/booking/booking-view'
import { adjustmentLine } from '@/lib/booking/display'
import { rulesOf } from '@/lib/booking/group-price'
import { BookingError } from '@/lib/booking/create-booking'
import { demoRepository } from '@/lib/db/application-store'
import { loadExploreRuntime } from '@/lib/explore/seed-repository'
import { experienceImage } from '@/lib/explore/v3-home'
import { agencyPageSession } from '../agency-booking-gate'
import '@/app/provider/[providerId]/bookings/list-v3.css'
import './card-v3.css'

export const dynamic = 'force-dynamic'

const PAGE = 5
const vnd = (value: number) => `${value.toLocaleString('vi-VN')} ₫`

// Screen 05 (BKG137) Lịch sử đặt chỗ, mockup 19/11: search, pay banner, tabs + "Xem lịch" (→ 27), cards, paging.
// Own Bookings only, read-only; the village/date filters of the old screen are not in the mockup.
export default async function AgencyBookingHistoryPage({ params, searchParams }: { params: { agencyId: string }; searchParams: Record<string, string | undefined> }) {
  const session = await agencyPageSession(params.agencyId)
  if (!session) {
    return <main className="v3l"><h1 className="v3l-h1">Lịch sử đặt chỗ</h1><p>Chỉ công ty lữ hành của tài khoản này mới xem được lịch sử đặt chỗ.</p><Link href="/login" className="v3l-btn">Đăng nhập</Link></main>
  }
  const base = `/agency/${params.agencyId}/bookings`
  let all
  try {
    all = (await listAgencyBookings(session, {})).bookings
  } catch (error) {
    return <main className="v3l"><h1 className="v3l-h1">Lịch sử đặt chỗ</h1><p role="alert">{error instanceof BookingError ? error.message : 'Không tải được danh sách đặt chỗ.'}</p></main>
  }
  const repository = demoRepository()
  const seed = await loadExploreRuntime()
  const bookings = new Map((await repository.all('bookings')).filter(row => row.agency_id === params.agencyId).map(row => [row.booking_id, row]))
  const ruleRows = await repository.all('experience_discount_rules')
  const experiences = new Map((await repository.all('experiences')).map(row => [row.experience_id, row]))
  const q = (searchParams.q ?? '').trim().toLowerCase()
  const matches = (row: typeof all[number]) => !q || `HAB-${row.booking_id.slice(0, 6)} ${row.provider_name} ${row.experience_name}`.toLowerCase().includes(q)
  const searched = all.filter(matches)
  const tab = parseAgencyTab(searchParams.tab)
  const def = AGENCY_TABS.find(item => item.id === tab)!
  const visible = searched.filter(row => !def.statuses || def.statuses.includes(row.status))
  const page = Math.max(1, Number(searchParams.page) || 1)
  const last = Math.max(1, Math.ceil(visible.length / PAGE))
  const from = (page - 1) * PAGE
  const pageRows = visible.slice(from, from + PAGE)
  const pending = searched.filter(row => row.status === 'On hold')
  const href = (nextTab: string, nextPage = 1) => `${base}?${new URLSearchParams({ ...(q ? { q: searchParams.q! } : {}), tab: nextTab, page: String(nextPage) })}`
  const history = await repository.all('booking_status_history')

  return <main className="v3l">
    <AutoRefresh />
    <div className="v3l-head">
      <div><h1 className="v3l-h1">Lịch sử đặt chỗ</h1><p className="v3l-sub">Theo dõi mọi chuyến đi làng nghề của đoàn bạn. Cần đổi ngày hay số khách, hãy nhắn xưởng. Chỉ xưởng mới cập nhật được đặt chỗ.</p></div>
      <form method="get" action={base} role="search"><label className="v3g-search"><Search size={18} aria-hidden="true" /><span style={{ position: 'absolute', left: -9999 }}>Tìm đặt chỗ</span>
        <input name="q" defaultValue={searchParams.q ?? ''} placeholder="Tìm theo mã đặt chỗ hoặc tên xưởng" /></label></form>
    </div>
    {pending.length > 0 && <div className="v3g-banner" role="status"><p className="v3g-sm"><b>{pending.length} đặt chỗ đang chờ bạn thanh toán.&nbsp;</b><Link href={`${base}/${pending[0].booking_id}`}>Xem ngay</Link></p></div>}
    <div className="v3l-tabs" style={{ alignItems: 'center' }}>
      <nav className="v3l-tabs" aria-label="Lọc theo trạng thái" style={{ margin: 0, border: 0, flex: 1 }}>
        {AGENCY_TABS.map(item => <Link key={item.id} className="v3l-tab" href={href(item.id)} aria-current={item.id === tab ? 'page' : undefined}>{item.label} ({agencyTabCount(item.id, searched)})</Link>)}
      </nav>
      <Link className="v3g-cal" href={`/agency/${params.agencyId}/schedule`}><CalendarDays aria-hidden="true" size={18} />Xem lịch</Link>
    </div>
    {pageRows.length === 0 ? <p className="v3l-empty">Chưa có đặt chỗ.</p> : <div className="v3g-list">
      {(() => {
        const now = new Date()
        return pageRows.map((row, index) => {
          const booking = bookings.get(row.booking_id)!
          const experience = experiences.get(booking.experience_id)
          const view = bookingView({ booking, experience, rules: rulesOf(ruleRows, booking.experience_id), providerName: row.provider_name, agencyName: '', now })
          const chips = agencyRowChips(row.status, booking.start_at, now)
          const pill = bookingTourPill(row.status, 'agency', booking.start_at, now)
          const reason = row.status === 'Cancelled' ? history.filter(item => item.booking_id === row.booking_id && item.to_status === 'Cancelled').at(-1)?.reason ?? '' : ''
          const detail = `${base}/${row.booking_id}`
          return <article key={row.booking_id} className="v3g-card">
            <Link href={detail} className="v3g-photo" aria-label={row.experience_name}><CoverImage image={experienceImage(seed, booking.experience_id)} alt="" sizes="260px" priority={index === 0 ? 'eager' : 'lazy'} /></Link>
            <div className="v3g-body">
              <div className="v3g-main">
                <div className="v3g-chips"><span className={`v3l-pill v3l-pill--${pill.cls}`}>{chips.status}</span>{chips.pay && <span className="v3l-pill">{chips.pay}</span>}</div>
              <h2 className="v3g-name"><Link href={detail}>{row.experience_name}</Link></h2>
              <p className="v3g-sm">{row.village_name} · {row.provider_name}</p>
              <div className="v3g-tags"><span className="v3g-tag">{view.dateLong}</span><span className="v3g-tag">{view.range}</span><span className="v3g-tag">{view.price.guests} khách</span></div>
              {view.holdUntil && <p className="v3g-note v3g-note--warn">Giữ chỗ đến {view.holdUntil}, còn {view.holdLeft} để thanh toán</p>}
              {reason && <p className="v3g-note">Lý do huỷ: {reason}</p>}
            </div>
            <div className="v3g-side">
              <span className="v3g-cap">Mã đặt chỗ: {view.code}</span>
              <p className="v3g-sm">{view.price.guests} khách</p>
              <b className="v3g-total">{vnd(view.price.total)}</b>
              {view.price.strike && <span className="v3g-old">{vnd(view.price.listTotal)}</span>}
              {view.price.discount > 0 && <span className="v3g-disc">Giảm {view.price.discountPct}% giá đoàn</span>}
              {view.price.adjustment !== 0 && <span className="v3g-cap" data-testid="adjustment">{adjustmentLine(view.price.adjustment)}</span>}
              {chips.payNow && <Link className="v3g-pay" href={detail}>Thanh toán ngay</Link>}
              <div className="v3g-links"><Link href={detail}>Xem chi tiết</Link><Link href="/messages" aria-label="Nhắn xưởng" title="Nhắn xưởng">Nhắn xưởng</Link></div>
            </div>
          </div>
        </article>
        })
      })()}
    </div>}
    <div className="v3l-foot">
      <p className="v3l-note">{visible.length ? `Hiển thị ${from + 1}–${from + pageRows.length} / ${visible.length} đặt chỗ` : 'Chưa có đặt chỗ'}</p>
      <div className="v3l-arrows">
        <Link className="v3l-arrow" href={href(tab, page - 1)} aria-label="Trang trước" aria-disabled={page <= 1}>‹</Link>
        <Link className="v3l-arrow" href={href(tab, page + 1)} aria-label="Trang sau" aria-disabled={page >= last}>›</Link>
      </div>
    </div>
  </main>
}

