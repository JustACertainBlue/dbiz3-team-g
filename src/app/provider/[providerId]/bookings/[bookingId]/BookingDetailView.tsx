import type { BookingDetail } from '@/lib/booking/booking-detail'
import { hanoiDateTime } from '@/lib/time/hanoi-time'

// Read-only F-SCHED-07 panels shared by BKG135 (Provider), BKG144, BKG136 and BKG138 (Agency).
// Times are shown in Asia/Ho_Chi_Minh whatever form they arrive in (UTC from PostgreSQL or +07:00), #87.
export const hanoiTime = (value: string) => hanoiDateTime(value)
export const formatVnd = (value: number) => `${value.toLocaleString('vi-VN')} VND`

export function contactText(contact: BookingDetail['agency_contact']): string {
  if (!contact) return ''
  const info = contact.contact_info
  if (info && typeof info === 'object') {
    const values = Object.values(info as Record<string, unknown>).filter(value => typeof value === 'string')
    return [contact.company_name, ...values].join(' · ')
  }
  return [contact.company_name, typeof info === 'string' ? info : ''].filter(Boolean).join(' · ')
}

export default function BookingDetailView({ detail }: { detail: BookingDetail }) {
  return <div className="bkg-detail">
    <section className="bkg-panel">
      <h2>{detail.experience_name}</h2>
      <dl>
        <dt>Booking ID</dt><dd>{detail.booking_id}</dd>
        {detail.agency_contact && <><dt>Agency</dt><dd>{contactText(detail.agency_contact)}</dd></>}
        {detail.provider_profile_link && <><dt>Provider</dt><dd><a href={detail.provider_profile_link}>Xem hồ sơ Provider</a></dd></>}
      </dl>
    </section>
    <section className="bkg-panel">
      <dl>
        <dt>Thời gian</dt><dd>{hanoiTime(detail.start_at)} → {hanoiTime(detail.end_at)}</dd>
        <dt>Số khách</dt><dd>{detail.group_size}</dd>
        <dt>Giá thỏa thuận</dt><dd>{formatVnd(detail.agreed_price)}</dd>
        <dt>Notice period</dt><dd>{detail.notice_period} giờ</dd>
        <dt>Cancellation policy</dt><dd><code>{JSON.stringify(detail.cancellation_policy)}</code></dd>
      </dl>
    </section>
    <section className="bkg-panel">
      <dl>
        <dt>Trạng thái</dt><dd><strong className="bkg-status">{detail.status}</strong></dd>
        {detail.hold_expires_at && <><dt>Giữ chỗ đến</dt><dd>{hanoiTime(detail.hold_expires_at)}</dd></>}
        <dt>Cập nhật lần cuối</dt><dd>{hanoiTime(detail.last_updated_at)}</dd>
      </dl>
    </section>
  </div>
}

export const bookingDetailStyles = `.bkg-page{max-width:880px;margin:auto;padding:var(--space-42) var(--space-24) var(--space-80);color:var(--palette-teal-15)}.bkg-page header p{font-size:var(--font-size-11);letter-spacing:.14em;color:var(--palette-orange-38);font-weight:800}.bkg-page h1{font:600 40px Georgia,serif;margin:var(--space-8) 0}.bkg-page header span{color:var(--palette-gray-43-2)}.bkg-detail{display:grid;gap:var(--space-14);margin-top:var(--space-24)}.bkg-panel{padding:var(--space-16) var(--space-18);background:var(--palette-orange-93-3);border-radius:var(--radius-14);font-size:var(--font-size-14)}.bkg-panel h2{font:600 22px Georgia,serif;margin:0 0 var(--space-8)}.bkg-panel dl{display:grid;grid-template-columns:minmax(120px,auto) 1fr;gap:var(--space-6) var(--space-14);margin:0}.bkg-panel dt{font-weight:700}.bkg-panel dd{margin:0;overflow-wrap:anywhere}.bkg-status{padding:var(--space-2) var(--space-10);border:var(--border-width-1) solid var(--palette-teal-19);border-radius:var(--radius-999)}.bkg-actions{display:flex;flex-wrap:wrap;gap:var(--space-12);align-items:center;margin-top:var(--space-20)}.bkg-actions button,.bkg-actions .bkg-link-btn{padding:var(--space-12) var(--space-20);border:0;border-radius:var(--radius-999);background:var(--palette-teal-19);color:white;font-weight:800;cursor:pointer;text-decoration:none;font-size:var(--font-size-14)}.bkg-actions button:disabled{opacity:.4;cursor:not-allowed}.bkg-actions button.bkg-danger{background:var(--palette-red-30-2)}.bkg-actions a{color:var(--palette-orange-38);font-weight:800}.bkg-form{display:grid;gap:var(--space-16);margin-top:var(--space-24);padding:var(--space-24);background:var(--palette-orange-93-3);border-radius:var(--radius-14)}.bkg-form label{display:grid;gap:var(--space-6);font-weight:700;font-size:var(--font-size-14)}.bkg-form input,.bkg-form select,.bkg-form textarea{padding:var(--space-10) var(--space-12);border:var(--border-width-1) solid var(--palette-orange-83);border-radius:var(--radius-10);font:inherit;background:white}.bkg-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-16)}.bkg-error{padding:var(--space-12) var(--space-16);border-radius:var(--radius-10);background:var(--palette-red-93);color:var(--palette-red-30-2)}.bkg-state{text-align:center}@media(max-width:720px){.bkg-grid{grid-template-columns:1fr}.bkg-panel dl{grid-template-columns:1fr}}`
