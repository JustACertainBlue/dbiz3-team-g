import type { BookingDetail } from '@/lib/booking/booking-detail'

// Read-only F-SCHED-07 panels shared by BKG135 (Provider), BKG144, BKG136 and BKG138 (Agency).
// Stored times are already Asia/Ho_Chi_Minh (+07:00), so they are shown as written.
export const hanoiTime = (value: string) => value.slice(0, 16).replace('T', ' ')
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

export const bookingDetailStyles = `.bkg-page{max-width:880px;margin:auto;padding:42px 24px 80px;color:#1e2f27}.bkg-page header p{font-size:11px;letter-spacing:.14em;color:#9a4a2a;font-weight:800}.bkg-page h1{font:600 40px Georgia,serif;margin:8px 0}.bkg-page header span{color:#66746d}.bkg-detail{display:grid;gap:14px;margin-top:24px}.bkg-panel{padding:16px 18px;background:#f4efe5;border-radius:14px;font-size:14px}.bkg-panel h2{font:600 22px Georgia,serif;margin:0 0 8px}.bkg-panel dl{display:grid;grid-template-columns:minmax(120px,auto) 1fr;gap:6px 14px;margin:0}.bkg-panel dt{font-weight:700}.bkg-panel dd{margin:0;overflow-wrap:anywhere}.bkg-status{padding:2px 10px;border:1px solid #243b30;border-radius:999px}.bkg-actions{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:20px}.bkg-actions button,.bkg-actions .bkg-link-btn{padding:12px 20px;border:0;border-radius:999px;background:#243b30;color:white;font-weight:800;cursor:pointer;text-decoration:none;font-size:14px}.bkg-actions button:disabled{opacity:.4;cursor:not-allowed}.bkg-actions button.bkg-danger{background:#8a1f11}.bkg-actions a{color:#9a4a2a;font-weight:800}.bkg-form{display:grid;gap:16px;margin-top:24px;padding:24px;background:#f4efe5;border-radius:14px}.bkg-form label{display:grid;gap:6px;font-weight:700;font-size:14px}.bkg-form input,.bkg-form select,.bkg-form textarea{padding:10px 12px;border:1px solid #ddd6ca;border-radius:10px;font:inherit;background:white}.bkg-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.bkg-error{padding:12px 16px;border-radius:10px;background:#fbe4e1;color:#8a1f11}.bkg-state{text-align:center}@media(max-width:720px){.bkg-grid{grid-template-columns:1fr}.bkg-panel dl{grid-template-columns:1fr}}`
