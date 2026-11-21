import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import AutoRefresh from '@/app/components/AutoRefresh'
import { listAgencyBookings } from '@/lib/booking/agency-bookings'
import { STATE_LABEL, scheduleModel } from '@/lib/booking/agency-schedule'
import { hanoiDate } from '@/lib/booking/clock'
import { BookingError } from '@/lib/booking/create-booking'
import { agencyPageSession } from '../agency-booking-gate'
import '@/app/provider/[providerId]/bookings/list-v3.css'
import './schedule-v3.css'

export const dynamic = 'force-dynamic'

const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const LONG = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
const validMonth = (value: string | undefined) => (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : '')

// Screen 27 (SCH141) "Lịch Công ty", mockup 19/11: summary chips, month grid with three trip states, selected day, month list.
// Own Bookings only, read-only. Month and day are links (?thang=YYYY-MM, ?ngay=YYYY-MM-DD): no client state.
export default async function AgencySchedulePage({ params, searchParams }: { params: { agencyId: string }; searchParams: Record<string, string | undefined> }) {
  const session = await agencyPageSession(params.agencyId)
  if (!session) {
    return <main className="v3l"><h1 className="v3l-h1">Lịch Công ty</h1><p>Chỉ công ty lữ hành của tài khoản này mới xem được lịch này.</p><Link href="/login" className="v3l-btn">Đăng nhập</Link></main>
  }
  const base = `/agency/${params.agencyId}/schedule`
  const today = hanoiDate(Date.now())
  let rows
  try {
    rows = (await listAgencyBookings(session, {})).bookings
  } catch (error) {
    return <main className="v3l"><h1 className="v3l-h1">Lịch Công ty</h1><p role="alert">{error instanceof BookingError ? error.message : 'Không tải được lịch.'}</p></main>
  }
  const month = validMonth(searchParams.thang) || today.slice(0, 7)
  const model = scheduleModel(rows, month, today)
  const selected = model.days.find(day => day.date === searchParams.ngay) ?? model.days.find(day => day.state === 'hold' || day.state === 'booked') ?? null
  const trip = selected?.bookingId ? model.events.find(event => event.bookingId === selected.bookingId) : null
  const detail = (id: string) => `/agency/${params.agencyId}/bookings/${id}`
  const longDate = selected ? `${LONG[new Date(`${selected.date}T00:00:00Z`).getUTCDay()]}, ${selected.day}/${month.slice(5, 7)}/${month.slice(0, 4)}` : 'Chọn một ngày trên lịch'

  return <main className="v3l">
    <AutoRefresh />
    <Link className="v3l-link" href={`/agency/${params.agencyId}/bookings`}>‹ Lịch sử đặt chỗ</Link>
    <div className="v3l-head"><h1 className="v3l-h1">Lịch Công ty</h1></div>
    <div className="v3s-chips">
      <span className="v3s-chip">Sắp tới <b>{model.summary.upcoming}</b> chuyến</span>
      <span className="v3s-chip">Chờ thanh toán <b>{model.summary.pending}</b></span>
    </div>
    <div className="v3s-grid">
      <section className="v3s-cal" aria-label="Lịch tháng">
        <div className="v3s-head">
          <Link className="v3s-nav" href={`${base}?thang=${model.prev}`} aria-label="Tháng trước"><ChevronLeft size={20} aria-hidden="true" /></Link>
          <h2>{model.title}</h2>
          <Link className="v3s-nav" href={`${base}?thang=${model.next}`} aria-label="Tháng sau"><ChevronRight size={20} aria-hidden="true" /></Link>
        </div>
        <div className="v3s-legend">
          <span><i className="v3s-sw k-hold" />Chờ thanh toán</span><span><i className="v3s-sw k-booked" />Đã thanh toán</span>
          <span><i className="v3s-sw k-done" />Hoàn thành tour</span><span><i className="v3s-sw k-sel" style={{ background: '#fff' }} />Ngày đang chọn</span>
        </div>
        <div className="v3s-mgrid">
          {WD.map(name => <span key={name} className="v3s-wd">{name}</span>)}
          {Array.from({ length: model.leading }, (_, index) => <span key={`b${index}`} className="v3s-cell v3s-blank" aria-hidden="true" />)}
          {model.days.map(day => <Link key={day.date} href={`${base}?thang=${month}&ngay=${day.date}`} scroll={false}
            className={`v3s-cell k-${day.state}${day.date === selected?.date ? ' k-sel' : ''}`} aria-current={day.date === selected?.date ? 'date' : undefined}
            aria-label={`${day.day}/${month.slice(5, 7)}${day.state === 'hold' || day.state === 'booked' || day.state === 'done' ? ` ${STATE_LABEL[day.state]}` : ''}`}>{day.day}</Link>)}
        </div>
      </section>
      <aside className="v3s-side" aria-label="Ngày đã chọn">
        <p className="v3s-eb">NGÀY ĐÃ CHỌN</p>
        <p className="v3s-date">{longDate}</p>
        {trip ? <>
          <span className={`v3l-pill v3l-pill--${trip.state === 'hold' ? 'hold' : trip.state === 'booked' ? 'booked' : 'done'}`} style={{ alignSelf: 'flex-start' }}>{STATE_LABEL[trip.state]}</span>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>{trip.name}</p>
          <p style={{ margin: 0 }}>{trip.time} · {trip.provider} · {trip.guests} khách</p>
          <Link className="v3l-link" href={detail(trip.bookingId)}>Xem chi tiết ›</Link>
        </> : selected && <>
          <p style={{ margin: 0 }}>Chưa có chuyến nào trong ngày này.</p>
          <Link className="v3l-btn" href="/explore">Tìm trải nghiệm cho ngày này</Link>
        </>}
      </aside>
    </div>
    <section className="v3s-list" aria-label={model.title}>
      <h2 style={{ margin: 0, fontSize: 22, color: '#0F3D2A' }}>{model.title}</h2>
      {model.events.length === 0 ? <p className="v3l-empty" style={{ marginTop: 12 }}>Chưa có chuyến nào trong tháng này.</p>
        : model.events.map(event => <div key={event.bookingId} className={`v3s-ev k-${event.state}`}>
          <div className="v3s-evdate">{event.weekday}<b>{event.day}</b></div>
          <div className="v3s-evbody"><span className={`v3l-pill v3l-pill--${event.state === 'hold' ? 'hold' : event.state === 'booked' ? 'booked' : 'done'}`}>{STATE_LABEL[event.state]}</span>
            <p style={{ fontWeight: 700 }}>{event.name}</p><p>{event.time} · {event.provider} · {event.guests} khách</p></div>
          <Link className="v3l-link" href={detail(event.bookingId)}>Xem chi tiết</Link>
        </div>)}
    </section>
  </main>
}
