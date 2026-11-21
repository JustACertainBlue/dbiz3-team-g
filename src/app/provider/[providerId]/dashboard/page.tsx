// Screen 29 (DSH018): "Tổng quan xưởng". Mockup hab-mockup-v3/png/29. The booking numbers only read existing data.
import Link from 'next/link'
import { currentServerSession } from '@/lib/auth/server-session'
import { canOpenCreateBooking } from '@/lib/booking/create-booking'
import { hanoiDate } from '@/lib/booking/clock'
import { providerBookingSummary } from '@/lib/booking/list-bookings'
import { demoRepository } from '@/lib/db/application-store'
import { Button } from '@/app/components/ui'
import { hoursByWeekday, hoursSummary, monthDays, providerStats } from '@/lib/provider/month-calendar'
import { monthWindow } from '@/lib/provider/month-window'
import MonthCalendar from '../../v3/MonthCalendar'
import '../../v3/provider-v3.css'

export const dynamic = 'force-dynamic'

export default async function ProviderDashboardPage({ params }: { params: { providerId: string } }) {
  const session = await currentServerSession()
  if (!(await canOpenCreateBooking(session, params.providerId))) {
    return <main className="pv3-page"><h1 className="pv3-h1">Tổng quan xưởng</h1><p>Chỉ chủ xưởng sở hữu hồ sơ này mới xem được trang này.</p><Button href="/login">Đăng nhập</Button></main>
  }
  const repository = demoRepository()
  const [summary, profile, account, bookings, experiences, allHours, reviews] = await Promise.all([
    providerBookingSummary(session), repository.find('provider_profiles', row => row.provider_id === params.providerId),
    repository.find('user_accounts', row => row.user_id === session.userId), repository.all('bookings'), repository.all('experiences'),
    repository.all('provider_operating_hours'), repository.all('provider_verification_reviews'),
  ])
  const now = Date.now(), today = hanoiDate(now)
  const own = bookings.filter(row => row.provider_id === params.providerId)
  const hours = allHours.filter(row => row.provider_id === params.providerId)
  const ownExperiences = experiences.filter(row => row.provider_id === params.providerId)
  const stats = providerStats({ bookings: own, experiences }, params.providerId, now)
  const { from, to } = monthWindow(today)
  const cells = monthDays({ hours, bookings: own, experiences: ownExperiences }, from, to, today)
  const revision = reviews.filter(row => row.provider_id === params.providerId && row.version_no === profile?.current_version_no && row.revision_comments).sort((a, b) => b.reviewed_at.localeCompare(a.reviewed_at))[0]
  const id = params.providerId
  const name = account?.full_name
  return <main className="pv3-page">
    <div className="pv3-head"><h1 className="pv3-h1">{name ? `Chào ${name}` : 'Tổng quan xưởng'}</h1>
      <div className="pv3-head__btns"><Button variant="secondary" size="sm" href={`/provider/${id}`}>Xem hồ sơ xưởng</Button><Button variant="secondary" size="sm" href={`/provider/${id}/experiences`}>Xem trải nghiệm</Button></div></div>
    {revision && <p className="pv3-notice" role="status"><strong>UBND yêu cầu bổ sung hồ sơ:</strong> {revision.revision_comments} <Link className="pv3-link" href={`/provider/${id}/edit`}>Cập nhật hồ sơ ›</Link></p>}
    <section className="pv3-stats" aria-label="Số liệu">
      <Link className="pv3-stat" href={`/provider/${id}/bookings`}><span className="pv3-stat__t">Cần bạn xử lý</span><b className={summary.requires_action_count ? 'pv3-stat__v pv3-stat__v--alert' : 'pv3-stat__v'}>{summary.requires_action_count} việc</b></Link>
      <div className="pv3-stat"><span className="pv3-stat__t">Đoàn sắp tới (30 ngày)</span><b className="pv3-stat__v">{stats.upcomingGroups} đoàn · {stats.upcomingGuests} khách</b></div>
      <div className="pv3-stat"><span className="pv3-stat__t">Đã nhận qua QR tháng {Number(today.slice(5, 7))}</span><b className="pv3-stat__v">—</b></div>
      <Link className="pv3-stat" href={`/provider/${id}/experiences`}><span className="pv3-stat__t">Trải nghiệm đang hiển thị</span><b className="pv3-stat__v">{stats.activeExperiences}</b></Link>
    </section>
    <div id="lich" className="pv3-head pv3-head--cal"><h2 className="pv3-h2">Lịch xưởng</h2><Button size="sm" href={`/provider/${id}/bookings/new`}>+ Tạo đặt chỗ</Button></div>
    <div className="pv3-dash">
      <MonthCalendar cells={cells} today={today} variant="full" hoursByWeekday={hoursByWeekday(hours)}
        bookingHref={`/provider/${id}/bookings/__ID__`} scheduleHref={`/provider/${id}/schedule`} />
      <aside className="pv3-hours"><div className="pv3-hours__head"><h3>Giờ mở cửa</h3>
        <Link className="pv3-iconbtn" href={`/provider/${id}/edit`} aria-label="Sửa giờ mở cửa"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></Link></div>
        <dl>{hoursSummary(hours).map(row => <div key={row.days}><dt>{row.days}</dt><dd>{row.text}</dd></div>)}</dl></aside>
    </div>
  </main>
}
