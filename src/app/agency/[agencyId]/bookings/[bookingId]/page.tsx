import React from 'react'
import Link from 'next/link'
import AutoRefresh from '@/app/components/AutoRefresh'
import { currentServerSession } from '@/lib/auth/server-session'
import { demoRepository } from '@/lib/db/application-store'
import { canViewAgencyBooking } from '@/lib/booking/booking-access'
import { getBookingDetail } from '@/lib/booking/booking-detail'
import { bookingView } from '@/lib/booking/booking-view'
import { adjustmentLine } from '@/lib/booking/display'
import { rulesOf } from '@/lib/booking/group-price'
import { isPastTourDate } from '@/lib/booking/list-tabs'
import BookerForm from './BookerForm'
import ExperienceCard from './ExperienceCard'
import { resolveViewer } from '@/lib/explore/catalog'
import { detailView } from '@/lib/explore/v3-detail'
import { loadExploreRuntime } from '@/lib/explore/seed-repository'
import './agency-booking-v3.css'

export const dynamic = 'force-dynamic'

const vnd = (value: number) => `${value.toLocaleString('vi-VN')} ₫`
const STEPS = ['Gửi yêu cầu', 'Xưởng giữ chỗ', 'Thanh toán', 'Hoàn thành đặt chỗ']

// Screens 06 (On hold, chờ thanh toán) and 07 (Booked, Completed, Cancelled): BKG138, mockup 19/11.
// The Agency never creates a Booking; it can save booker info and cancel while On hold (UI v3 decisions #1, #5).
export default async function AgencyBookingDetailPage({ params }: { params: { agencyId: string; bookingId: string } }) {
  const session = await currentServerSession()
  const found = await demoRepository().find('bookings', row => row.booking_id === params.bookingId)
  if (!found || !(await canViewAgencyBooking(session, params.agencyId, found))) {
    return <main className="v3a"><h1 className="v3a-name">Chi tiết đặt chỗ</h1><p className="v3a-sm">Chỉ công ty lữ hành của đặt chỗ này mới xem được trang này.</p><Link href="/login">Đăng nhập</Link></main>
  }
  await getBookingDetail(session, params.bookingId) // runs hold expiry first (#50)
  const repository = demoRepository()
  const booking = (await repository.find('bookings', row => row.booking_id === params.bookingId))!
  const experience = await repository.find('experiences', row => row.experience_id === booking.experience_id)
  const provider = await repository.find('provider_profiles', row => row.provider_id === booking.provider_id)
  const version = provider && await repository.find('provider_profile_versions', row => row.provider_id === provider.provider_id && row.version_no === provider.published_version_no)
  const agency = await repository.find('agency_profiles', row => row.agency_id === booking.agency_id)
  const user = agency && await repository.find('user_accounts', row => row.user_id === agency.user_id)
  // Same view model as screen 04 (image, workshop line, tags); null when the experience is no longer listed.
  const seed = await loadExploreRuntime()
  const card = detailView(seed, booking.experience_id, resolveViewer(seed, params.agencyId, true), { date: '', guests: null }, [], false)
  const rules = rulesOf(await repository.all('experience_discount_rules'), booking.experience_id)
  const now = new Date()
  const view = bookingView({ booking, experience, rules, providerName: version?.business_name ?? '', agencyName: agency?.company_name ?? '', now })
  const pastBooked = view.status === 'Booked' && isPastTourDate(booking.start_at, now)
  const history = (await repository.all('booking_status_history')).filter(row => row.booking_id === booking.booking_id).sort((a, b) => Date.parse(b.changed_at) - Date.parse(a.changed_at))
  const cancelled = history.find(row => row.to_status === 'Cancelled')

  return <main className="v3a">
    <AutoRefresh />
    <Link href={`/agency/${params.agencyId}/bookings`} className="v3a-back">‹ Lịch sử đặt chỗ</Link>
    {view.step > 0 && <ol className="v3a-steps" aria-label="Tiến trình đặt chỗ">
      {STEPS.map((label, index) => {
        const n = index + 1, state = view.step === 5 || n < view.step ? 'done' : n === view.step ? 'now' : 'next'
        return <React.Fragment key={label}>{index > 0 && <li className="v3a-line" aria-hidden="true" />}
          <li className={state === 'next' ? 'v3a-step off' : 'v3a-step'} aria-current={state === 'now' ? 'step' : undefined}><span className={`n ${state}`} aria-hidden="true">{state === 'done' ? '✓' : n}</span>{label}</li></React.Fragment>
      })}
    </ol>}
    {view.status === 'Cancelled' && <div className="v3a-banner v3a-banner--x" role="status" style={{ margin: '20px 0' }}><b>Đặt chỗ đã huỷ</b><p className="v3a-sm">Lý do: {cancelled?.reason || '—'}</p></div>}
    <div className="v3a-grid">
      <aside className="v3a-left">
        <ExperienceCard name={view.experienceName} image={card?.images[0] ?? null} providerLine={card?.providerLine ?? view.providerName}
          address={view.address} tags={card?.highlights.map(item => item.title).slice(0, 4) ?? []} />
        <div className="v3a-card">
          <p className="v3a-ct">Chi tiết đặt chỗ của bạn</p>
          <p className="v3a-lbl">Ngày đến</p><p className="v3a-val">{view.dateLong}</p>
          <p className="v3a-lbl">Giờ trải nghiệm</p><p className="v3a-val">{view.range}</p><p className="v3a-cap">{view.period} · {view.minutes} phút</p>
          {view.holdUntil && <p className="v3a-sm" style={{ marginTop: 12 }}>Giữ chỗ còn <b className="v3a-warn">{view.holdLeft}</b>, đến {view.holdUntil}</p>}
          <p className="v3a-lbl">Bạn đã chọn</p><p className="v3a-sm">1 ca, {view.price.guests} khách</p><p className="v3a-sm">{view.experienceName} · {view.period}</p>
          <p className="v3a-cap">Mã đặt chỗ: {view.code}</p>
          <Link className="v3a-sm" href="/messages">Nhắn xưởng để đổi ngày hoặc số khách</Link>
        </div>
        <div className="v3a-card">
          <p className="v3a-ct">Tóm tắt giá</p>
          <div className="v3a-sp"><span>Giá gốc</span><span className="v3a-money">{vnd(view.price.listTotal)}</span></div><p className="v3a-cap">{vnd(view.price.perGuest)} × {view.price.guests} khách</p>
          {view.price.discount > 0 && <><div className="v3a-sp"><span>Giảm giá đoàn</span><span className="v3a-money">− {vnd(view.price.discount)}</span></div><p className="v3a-cap">Đoàn được giảm {view.price.discountPct}%.</p></>}
          {view.price.adjustment !== 0 && <p className="v3a-sm" data-testid="adjustment">{adjustmentLine(view.price.adjustment)}</p>}
          <div className="v3a-tot"><span>Giá</span><span className="v3a-tot__r">{view.price.strike && <span className="v3a-old">{vnd(view.price.listTotal)}</span>}<b>{vnd(view.price.total)}</b></span></div>
        </div>
      </aside>
      {view.status === 'On hold'
        ? <BookerForm bookingId={booking.booking_id} companyName={view.agencyName} email={user?.email ?? ''} contactName={view.contactName || user?.full_name || ''} contactPhone={view.contactPhone || user?.phone || ''} note={view.note} saved={!!view.contactName} />
        : <div className="v3a-right">
          {view.status === 'Booked' && <div className="v3a-banner"><b>Đặt chỗ của đoàn đã được xác nhận!</b>
            <p className="v3a-sm">{pastBooked ? <><b className="v3a-warn">Chờ xưởng xác nhận</b> — Ngày tour ({view.dateLong}) đã qua; đang chờ {view.providerName} xác nhận đoàn đã đến.</> : <>{view.providerName} đã nhận {vnd(view.price.total)} và đang chờ đón đoàn {view.price.guests} khách lúc {view.range.slice(0, 5)}, {view.dateLong}.</>}</p></div>}
          {view.status === 'Completed' && <div className="v3a-banner"><b>Tour đã hoàn thành</b><p className="v3a-sm">Cảm ơn bạn đã đồng hành cùng làng nghề.</p></div>}
          <div className="v3a-card"><p className="v3a-ct">Thông tin người đặt</p>
            <p className="v3a-sm">{view.agencyName}{view.contactName && ` · ${view.contactName}`}{view.contactPhone && ` · ${view.contactPhone}`}</p>
            {view.note && <p className="v3a-cap">Yêu cầu riêng: {view.note}</p>}</div>
          {view.cancelLine && <div className="v3a-card"><p className="v3a-ct">{view.experienceName} · {view.period}</p><p className="v3a-row">{view.cancelLine}</p></div>}
          <div className="v3a-actions"><Link className="v3a-btn v3a-btn--p" href="/explore">Tìm trải nghiệm cho đoàn khác</Link><Link className="v3a-btn v3a-btn--s" href={`/agency/${params.agencyId}/bookings`}>Về lịch sử đặt chỗ</Link></div>
        </div>}
    </div>
  </main>
}
