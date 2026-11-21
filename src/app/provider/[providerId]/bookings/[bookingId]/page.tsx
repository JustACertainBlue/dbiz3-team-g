import React from 'react'
import Link from 'next/link'
import ChatOpenButton from '@/app/messages/ChatOpenButton'
import AutoRefresh from '@/app/components/AutoRefresh'
import { demoRepository } from '@/lib/db/application-store'
import { bookingView } from '@/lib/booking/booking-view'
import { PAID_MESSAGE } from '@/lib/booking/booker-info'
import { adjustmentLine } from '@/lib/booking/display'
import { rulesOf } from '@/lib/booking/group-price'
import { hanoiClock, hanoiDate } from '@/lib/time/hanoi-time'
import { bookingDetailStyles } from './BookingDetailView'
import BookingActionsBar from './BookingActionsBar'
import { loadProviderBooking } from './load-provider-booking'
import '@/app/agency/[agencyId]/bookings/[bookingId]/agency-booking-v3.css'

export const dynamic = 'force-dynamic'

const vnd = (value: number) => `${value.toLocaleString('vi-VN')} ₫`
const stamp = (value: string) => `${hanoiClock(value)}, ${hanoiDate(value).split('-').reverse().join('/')}`
const PAY_LABEL: Record<string, string> = { 'On hold': 'Chờ thanh toán', Booked: 'Đã thanh toán', Completed: 'Đã thanh toán', Cancelled: 'Chưa thanh toán' }
const BOOKING_LABEL: Record<string, string> = { 'On hold': 'Đang giữ chỗ', Booked: 'Tour sắp tới', Completed: 'Hoàn thành tour', Cancelled: 'Đã huỷ' }

// Screens 10c (On hold), 10 (Booked) and the read-only states: BKG135/BKG136 for the Local Provider, mockup 19/11.
// No QR or bank data: payment is arranged in the chat; the Provider presses "Đã nhận tiền" (On hold → Booked).
export default async function ProviderBookingDetailPage({ params }: { params: { providerId: string; bookingId: string } }) {
  const detail = await loadProviderBooking(params.providerId, params.bookingId)
  if (!detail) {
    return <main className="v3a"><h1 className="v3a-name">Chi tiết đặt chỗ</h1><p className="v3a-sm">Chỉ xưởng sở hữu đặt chỗ này mới xem được trang này.</p><Link href="/login">Đăng nhập</Link></main>
  }
  const repository = demoRepository()
  const booking = (await repository.find('bookings', row => row.booking_id === params.bookingId))!
  const experience = await repository.find('experiences', row => row.experience_id === booking.experience_id)
  const agency = await repository.find('agency_profiles', row => row.agency_id === booking.agency_id)
  const user = agency && await repository.find('user_accounts', row => row.user_id === agency.user_id)
  const rules = rulesOf(await repository.all('experience_discount_rules'), booking.experience_id)
  const view = bookingView({ booking, experience, rules, providerName: '', agencyName: agency?.company_name ?? '', now: new Date() })
  const history = (await repository.all('booking_status_history')).filter(row => row.booking_id === booking.booking_id).sort((a, b) => Date.parse(b.changed_at) - Date.parse(a.changed_at))
  const reportedPaid = (await repository.all('chat_messages')).some(row => row.booking_id === booking.booking_id && row.message_kind === 'Booking Update' && row.text.startsWith(PAID_MESSAGE))
  const names = new Map((await repository.all('user_accounts')).map(row => [row.user_id, row.full_name]))
  const who = (id: string) => (id ? names.get(id) ?? '' : 'Hệ thống')
  const wording: Record<string, string> = { 'On hold': 'Giữ chỗ cho đoàn', Booked: 'Xác nhận đã nhận tiền', Completed: 'Xác nhận đoàn đã đến', Cancelled: 'Đặt chỗ đã huỷ' }

  return <main className="v3a">
    <AutoRefresh />
    <Link href={`/provider/${params.providerId}/bookings`} className="v3a-back">‹ Tất cả đặt chỗ</Link>
    <h1 className="v3a-name" style={{ marginTop: 16, fontSize: 34, lineHeight: '42px' }}>{view.agencyName} · {view.price.guests} khách</h1>
    <p className="v3a-sm">{view.experienceName} · {view.dateLong} · {view.range}</p>
    <p className="v3a-cap">Mã {view.code}</p>
    <p className="v3a-actions" style={{ margin: '12px 0 20px' }}><b>{BOOKING_LABEL[view.status]}</b><span aria-hidden="true">·</span><span>{PAY_LABEL[view.status]}</span></p>

    {view.status === 'On hold' && <div className="v3a-banner" role="status">
      <b>Đang chờ công ty lữ hành thanh toán {vnd(view.price.total)}</b>
      <p className="v3a-sm">Giữ chỗ đến {view.holdUntil}. Khi nhận được tiền, bấm “Đã nhận tiền” để chốt lịch.</p>
      {reportedPaid && <p className="v3a-ok">Công ty lữ hành đã báo thanh toán. Hãy kiểm tra và bấm “Đã nhận tiền”.</p>}
      <p className="v3a-cap">Thanh toán theo hướng dẫn của xưởng trong tin nhắn.</p>
    </div>}
    {view.status === 'Booked' && <div className="v3a-banner" role="status"><b>Công ty lữ hành đã thanh toán {vnd(view.price.total)}. Lịch của đoàn đã chốt!</b>
      <p className="v3a-sm">Hãy chuẩn bị cho {view.price.guests} khách lúc {view.range.slice(0, 5)}, {view.dateLong}. Khi đoàn đến, bấm “Đánh dấu đoàn đã đến”.</p></div>}
    {view.status === 'Completed' && <div className="v3a-banner" role="status"><b>Tour đã hoàn thành</b></div>}
    {view.status === 'Cancelled' && <div className="v3a-banner v3a-banner--x" role="status"><b>Đặt chỗ đã huỷ</b><p className="v3a-sm">Lý do: {history.find(row => row.to_status === 'Cancelled')?.reason || '—'}</p></div>}

    <div style={{ margin: '16px 0' }}>
      <BookingActionsBar providerId={params.providerId} bookingId={detail.booking_id} actions={detail.actions} status={detail.status}
        chat={<ChatOpenButton bookingId={detail.booking_id} label="Nhắn tin" className="bkg-btn bkg-btn--outline" />} />
    </div>

    <div className="v3a-grid">
      <section className="v3a-card" style={{ flex: '1 1 420px' }} aria-labelledby="pv-info">
        <h2 id="pv-info" className="v3a-ct">Thông tin đặt chỗ</h2>
        <div className="v3a-sp"><span>Ngày giờ</span><b>{view.dateLong.split(', ')[1]} · {view.range.slice(0, 5)}</b></div>
        <div className="v3a-sp"><span>Số khách</span><b>{view.price.guests} khách</b></div>
        <div className="v3a-sp"><span>Tổng tiền</span><b>{vnd(view.price.total)}</b></div>
        <p className="v3a-cap">{vnd(view.price.perGuest)} × {view.price.guests}{view.price.discount > 0 ? `, giảm ${view.price.discountPct}% giá đoàn (− ${vnd(view.price.discount)})` : ''}{view.price.strike ? <> · giá gốc <s className="v3a-old">{vnd(view.price.listTotal)}</s></> : ''}</p>
        {view.price.adjustment !== 0 && <p className="v3a-cap" data-testid="adjustment">{adjustmentLine(view.price.adjustment)}</p>}
        <div className="v3a-sp"><span>Người phụ trách đoàn</span><b>{view.contactName || 'Chưa có'}</b></div>
        <div className="v3a-sp"><span>Điện thoại công ty lữ hành</span><b>{view.contactPhone || 'Chưa có'}</b></div>
        <div className="v3a-sp"><span>Email</span><b>{user?.email ?? ''}</b></div>
        <div className="v3a-sp"><span>Yêu cầu riêng của đoàn</span><b>{view.note || '—'}</b></div>
        <div className="v3a-sp"><span>Chính sách huỷ</span><b>{view.cancelLine.replace('Huỷ ', 'Báo ').replace(': hoàn', ' hoàn').replace(' số tiền', '') || '—'}</b></div>
      </section>
      <section className="v3a-card" style={{ flex: '1 1 320px' }} aria-labelledby="pv-hist">
        <h2 id="pv-hist" className="v3a-ct">Lịch sử thay đổi</h2>
        {history.map(row => <p key={row.history_id} className="v3a-sm" style={{ marginBottom: 10 }}><b>{row.to_status === 'Cancelled' && row.reason ? `${wording.Cancelled}: ${row.reason}` : wording[row.to_status]}</b><br /><span className="v3a-cap">{who(row.changed_by)} · {stamp(row.changed_at)}</span></p>)}
      </section>
    </div>
    <style>{bookingDetailStyles}</style>
  </main>
}
