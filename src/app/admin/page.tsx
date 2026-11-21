// ADM079 Tổng quan quản trị, mockup v3 screen 38 (png/38). Server component: the signed-in admin decides the scope
// (HDT whole city, UBND one village); the page never accepts a village from the URL.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentServerSession } from '@/lib/auth/server-session'
import { adminGuestRedirect } from './admin-page-access'
import { adminScope, loadOverview, loadReviewQueue, resolveRange, hanoiToday } from '@/lib/adm/v3-loaders'
import { STATUS_ORDER, type OverviewStatus } from '@/lib/adm/v3-overview'
import { Button, Container, StatusPill } from '@/app/components/ui'
import DateRange from './_v3/DateRange'
import './_v3/admin-v3.css'

export const dynamic = 'force-dynamic'

const COLORS: Record<OverviewStatus, string> = { Completed: '#165235', Booked: '#86C49A', 'On hold': '#E0928A', Cancelled: '#C9C4B5' }
const NAMES: Record<OverviewStatus, string> = { Completed: 'Hoàn thành tour', Booked: 'Đã thanh toán', 'On hold': 'Chờ thanh toán', Cancelled: 'Đã huỷ' }
const vi = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`
const monthsBetween = (from: string, to: string) => (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7)) + 1

export default async function AdminOverviewPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const session = await currentServerSession()
  const guest = adminGuestRedirect(session)
  if (guest) redirect(guest)
  const scope = adminScope(session)
  if (!scope) return <Container as="main" className="av3"><h1>Tổng quan</h1><p className="av3-lead">Đăng nhập bằng tài khoản Sở Du lịch hoặc UBND xã để xem trang này.</p><p><Link href="/login">Đăng nhập</Link></p></Container>

  const today = hanoiToday()
  const { from, to } = resolveRange(today, searchParams.from, searchParams.to)
  const [o, queue] = await Promise.all([loadOverview(session, from, to), loadReviewQueue(session)])
  const pending = queue.rows.filter(r => !r.processed).slice(0, 3)
  const reviewHref = scope.adminType === 'UBND' ? '/admin/providers' : '/admin/agencies'
  const peak = Math.max(1, ...o.monthly.map(m => m.total))
  const fn = [['Cuộc trò chuyện mới', o.funnel.chats, '#165235'], ['Có đặt chỗ', o.funnel.withBooking, '#3A6B52'], ['Đã thanh toán', o.funnel.paid, '#5A8570'], ['Hoàn thành tour', o.funnel.completed, '#7B9A8B']] as const
  const fnMax = Math.max(1, o.funnel.chats)

  return <Container as="main" className="av3">
    <div className="av3-head"><h1>Tổng quan</h1><Button href="/admin/users" variant="secondary" size="sm">Quản lý tài khoản</Button></div>

    <div className="av3-kpis">
      <section className="av3-card av3-kpi" aria-label="Công ty lữ hành"><span className="av3-kpi__name">Công ty lữ hành</span><span className="av3-kpi__value">{o.cards.agencies.total}</span><span className="av3-kpi__sub">{o.cards.agencies.pending} hồ sơ đang chờ duyệt</span></section>
      <section className="av3-card av3-kpi" aria-label="Xưởng nghề"><span className="av3-kpi__name">Xưởng nghề</span><span className="av3-kpi__value">{o.cards.providers.total}</span><span className="av3-kpi__sub">{o.cards.providers.active} đang hoạt động · {o.cards.providers.pending} chờ UBND xã duyệt</span></section>
      <section className="av3-card av3-kpi" aria-label={`Đặt chỗ tháng ${o.cards.monthNumber}`}><span className="av3-kpi__name">Đặt chỗ tháng {o.cards.monthNumber}</span><span className="av3-kpi__value">{o.cards.bookingsThisMonth}</span><span className="av3-kpi__sub">trong phạm vi bạn quản lý</span></section>
    </div>

    <div className="av3-head av3-sect">
      <div><h2>Hợp tác Xưởng nghề &amp; Công ty lữ hành</h2><p className="av3-lead" style={{ marginTop: 4 }}>Từ {vi(from)} đến {vi(to)} · {monthsBetween(from, to)} tháng</p></div>
      <DateRange from={from} to={to} />
    </div>

    <div className="av3-row2 av3-row2--wide">
      <section className="av3-card" aria-labelledby="av3-chart"><h3 id="av3-chart">Đặt chỗ theo tháng</h3>
        <div className="av3-legend">{STATUS_ORDER.map(s => <span key={s}><i className="av3-sw" style={{ background: COLORS[s] }} />{NAMES[s]}</span>)}</div>
        {o.monthly.every(m => m.total === 0) ? <p className="av3-empty">Chưa có đặt chỗ trong khoảng thời gian này.</p> : <>
          <div className="av3-cols" role="img" aria-label={`Đặt chỗ theo tháng: ${o.monthly.map(m => `${m.label} ${m.total}`).join(', ')}`}>{o.monthly.map(m => <div className="av3-col" key={m.key}>
            <span className="av3-col__tot">{m.total}</span>
            <div className="av3-stack-bar" style={{ height: `${(m.total / peak) * 78}%` }}>{STATUS_ORDER.filter(s => m.counts[s] > 0).map(s => <i key={s} style={{ background: COLORS[s], height: `${(m.counts[s] / Math.max(1, m.total)) * 100}%`, flex: m.counts[s] }} />)}</div>
          </div>)}</div>
          <div className="av3-xl" aria-hidden="true">{o.monthly.map(m => <span key={m.key}>{m.label}</span>)}</div></>}
      </section>
      <section className="av3-card" aria-labelledby="av3-funnel"><h3 id="av3-funnel">Từ trò chuyện đến hoàn thành tour</h3>
        <p className="av3-cap" style={{ marginTop: 8 }}>Tính theo cuộc trò chuyện mới giữa công ty lữ hành và xưởng.</p>
        <div style={{ marginTop: 12 }}>{fn.map(([label, n, color]) => <div className="av3-fn" key={label}><span>{label}</span><span className="av3-fn__track"><i className="av3-fn__fill" style={{ width: `${(n / fnMax) * 100}%`, background: color }} /></span><b>{n}</b></div>)}</div>
        <p className="av3-lead">{o.funnel.chats === 0 ? 'Chưa có cuộc trò chuyện mới trong khoảng này.' : `Cứ 100 cuộc trò chuyện thì khoảng ${o.funnel.bookingsPer100Chats} cuộc thành đặt chỗ.`}</p>
      </section>
    </div>

    <div className="av3-row2">
      <Rank title="5 Xưởng nghề nhận nhiều đặt chỗ nhất" rows={o.topProviders} />
      <Rank title="5 Công ty lữ hành đặt nhiều nhất" rows={o.topAgencies} />
    </div>

    <section className="av3-card av3-sect" aria-labelledby="av3-need" style={{ marginTop: 16 }}>
      <div className="av3-head"><h2 id="av3-need">Hồ sơ cần bạn xem</h2><Link href={reviewHref} className="av3-ul">Tất cả ›</Link></div>
      {pending.length === 0 ? <p className="av3-empty">Không có hồ sơ nào đang chờ.</p> : pending.map(r => <div className="av3-need" key={r.key}>
        <StatusPill tone="warn">{r.kindLabel}</StatusPill>
        <div className="av3-need__main"><b>{r.name}</b><span className="av3-cap">{r.subtitle}{r.note ? ` · ${r.note}` : ''}</span></div>
        <Link href={r.href} className="av3-ul">Xem chi tiết</Link>
      </div>)}
    </section>
  </Container>
}

function Rank({ title, rows }: { title: string; rows: Array<{ id: string; name: string; bookings: number; guests: number }> }) {
  const max = Math.max(1, ...rows.map(r => r.bookings))
  return <section className="av3-card" aria-label={title}><h2 style={{ fontSize: 22 }}>{title}</h2><p className="av3-cap" style={{ marginTop: 4 }}>Không tính đặt chỗ đã huỷ</p>
    <div style={{ marginTop: 12 }}>{rows.length === 0 ? <p className="av3-empty">Chưa có đặt chỗ.</p> : rows.map(r => <div className="av3-rank" key={r.id}>
      <span className="av3-rank__name" title={r.name}>{r.name}</span><span className="av3-rank__track"><i className="av3-rank__fill" style={{ width: `${(r.bookings / max) * 100}%` }} /></span>
      <span className="av3-rank__v"><b>{r.bookings}</b> · {r.guests} khách</span></div>)}</div></section>
}
