// BKG135 (Provider) / BKG138 (Agency, read-only) Booking Detail — design wave 4, Figma "Màn 3".
// Content is F-SCHED-07 output only: experience name, start/end, group size, agreed price, notice period,
// cancellation policy, status, last update, hold expiry, Agency contact (Provider view) or Provider profile link
// (Agency view). Payment, platform fee, artisan, pick-up and history blocks of the mock-up are not in FR-007.
import Link from 'next/link'
import React from 'react'
import { CalendarDays, ChevronLeft, Clock, Users } from 'lucide-react'
import type { BookingDetail } from '@/lib/booking/booking-detail'
import { cancellationLines } from '@/lib/prf/experience-terms'
import { hanoiClock, hanoiDate } from '@/lib/time/hanoi-time'
import StatusBadge from '@/app/components/StatusBadge'
import { statusLabel } from '@/lib/status-labels'
import { hanoiTime } from './BookingDetailView'
import './booking-detail-v9.css'

const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
function dayLabel(value: string) {
  const day = hanoiDate(value) // YYYY-MM-DD in Hanoi
  const weekday = WEEKDAY[new Date(`${day}T12:00:00+07:00`).getUTCDay()]
  const [y, m, d] = day.split('-')
  return `${weekday}, ${d}/${m}/${y}`
}
function durationLabel(start: string, end: string) {
  const minutes = Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 60000))
  const h = Math.floor(minutes / 60), m = minutes % 60
  return h && m ? `${h} giờ ${m} phút` : h ? `${h} giờ` : `${m} phút`
}
const vnd = (value: number) => `${value.toLocaleString('vi-VN')} ₫`
const STEPS = ['On hold', 'Booked', 'Completed'] as const

function contactRows(contact: BookingDetail['agency_contact']): Array<[string, string]> {
  if (!contact) return []
  const info = contact.contact_info
  const labels: Record<string, string> = { contact_person_name: 'Phụ trách', phone_number: 'Điện thoại', business_email: 'Email', email: 'Email', phone: 'Điện thoại' }
  if (info && typeof info === 'object') return Object.entries(info as Record<string, unknown>).filter(([, v]) => typeof v === 'string' && v).map(([k, v]) => [labels[k] ?? k, String(v)])
  return typeof info === 'string' && info ? [['Liên hệ', info]] : []
}

export default function BookingDetailScreen({ detail, back, actions, readOnly }: {
  detail: BookingDetail
  back: { href: string; label: string }
  actions?: React.ReactNode
  readOnly?: boolean
}) {
  const shortId = detail.booking_id.slice(0, 8).toUpperCase()
  const policy = cancellationLines(detail.cancellation_policy)
  const step = STEPS.indexOf(detail.status as typeof STEPS[number])
  const contacts = contactRows(detail.agency_contact)
  return <div className="bd9">
    <div className="bd9-top">
      <nav aria-label="Breadcrumb"><Link href={back.href}><ChevronLeft aria-hidden="true" size={18} />{back.label}</Link><span aria-hidden="true">/</span><span>#{shortId}</span></nav>
      <div className="bd9-top__status"><StatusBadge family="booking" status={detail.status} />{detail.hold_expires_at && detail.status === 'On hold' && <span>Giữ chỗ đến {dayLabel(detail.hold_expires_at)} · {hanoiClock(detail.hold_expires_at)}</span>}</div>
    </div>

    <section className="bd9-title bd9-glass">
      <h1>Chi tiết đặt chỗ <span>#{shortId}</span></h1>
      {readOnly ? <div className="bd9-readonly">{actions}<p>Agency chỉ xem — mọi thay đổi do Local Provider thực hiện.</p></div> : actions}
    </section>

    <div className="bd9-grid">
      <div className="bd9-main">
        <section className="bd9-glass bd9-card">
          <header><h2>01 · Trải nghiệm</h2>{detail.provider_profile_link && <Link href={detail.provider_profile_link}>Xem hồ sơ xưởng</Link>}</header>
          <p className="bd9-exp">{detail.experience_name}</p>
          <dl className="bd9-rows"><div><dt>Số khách</dt><dd>{detail.group_size} khách</dd></div></dl>
        </section>

        <section className="bd9-glass bd9-card">
          <header><h2>02 · Lịch trình</h2></header>
          <div className="bd9-tiles">
            <div className="bd9-tile"><span><CalendarDays aria-hidden="true" size={16} />Ngày</span><strong>{dayLabel(detail.start_at)}</strong></div>
            <div className="bd9-tile"><span><Clock aria-hidden="true" size={16} />Khung giờ</span><strong>{hanoiClock(detail.start_at)}–{hanoiClock(detail.end_at)}</strong><small>Thời lượng {durationLabel(detail.start_at, detail.end_at)}</small></div>
            <div className="bd9-tile"><span><Users aria-hidden="true" size={16} />Số khách</span><strong>{detail.group_size} khách</strong></div>
          </div>
        </section>

        {detail.agency_contact && <section className="bd9-glass bd9-card">
          <header><h2>03 · Liên hệ</h2></header>
          <div className="bd9-tile bd9-tile--wide"><span>Agency</span><strong className="bd9-org">{detail.agency_contact.company_name}</strong>
            <dl className="bd9-rows">{contacts.map(([label, value]) => <div key={label + value}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          </div>
        </section>}
      </div>

      <aside className="bd9-side">
        <section className="bd9-glass bd9-card">
          <header><h2>Trạng thái</h2><StatusBadge family="booking" status={detail.status} /></header>
          {step >= 0 && <ol className="bd9-steps" aria-label="Vòng đời đặt chỗ">{STEPS.map((s, i) => <li key={s} className={i <= step ? 'is-done' : undefined} aria-current={i === step ? 'step' : undefined}>{statusLabel('booking', s)}</li>)}</ol>}
          {detail.status === 'Cancelled' && <p className="bd9-note">Đặt chỗ đã huỷ — chỉ xem.</p>}
          <dl className="bd9-rows">
            <div><dt>Mã đặt chỗ</dt><dd className="bd9-mono">{detail.booking_id}</dd></div>
            {detail.hold_expires_at && detail.status === 'On hold' && <div><dt>Giữ chỗ đến</dt><dd>{dayLabel(detail.hold_expires_at)} · {hanoiClock(detail.hold_expires_at)}</dd></div>}
            <div><dt>Cập nhật lần cuối</dt><dd>{hanoiTime(detail.last_updated_at)}</dd></div>
          </dl>
        </section>

        <section className="bd9-glass bd9-card">
          <header><h2>Điều kiện đặt chỗ</h2><small>VND (₫)</small></header>
          <dl className="bd9-rows">
            <div><dt>Giá thoả thuận</dt><dd className="bd9-num">{vnd(detail.agreed_price)}</dd></div>
            <div><dt>Thời gian báo trước</dt><dd>{detail.notice_period} giờ</dd></div>
          </dl>
          <div className="bd9-policy"><strong>Chính sách huỷ</strong>{policy.length ? <ul>{policy.map(line => <li key={line}>{line}</li>)}</ul> : <p>Không có điều kiện huỷ riêng.</p>}</div>
        </section>
      </aside>
    </div>
  </div>
}
