'use client'
// Screen 06 "Thông tin người đặt" + "Ghi chú cho xưởng" + "Hoàn tất đặt chỗ" (mockup ChiTietDatCho).
// Company name and email are read from the profile and shown only. "Ai dẫn đoàn", "Hoá đơn" and "Giờ xe đoàn đến" are not
// built (no column). No payment gateway: "Hoàn tất đặt chỗ" saves the contact and sends "Công ty báo đã thanh toán".
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import AgencyCancel from './AgencyCancel'
import './agency-booking-v3.css'
import { useHydrated } from '@/app/auth-v3/useHydrated'

export default function BookerForm({ bookingId, companyName, email, contactName, contactPhone, note, saved }: {
  bookingId: string; companyName: string; email: string; contactName: string; contactPhone: string; note: string; saved: boolean
}) {
  const hydrated = useHydrated()
  const router = useRouter()
  const [name, setName] = useState(contactName)
  const [phone, setPhone] = useState(contactPhone)
  const [request, setRequest] = useState(note)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(saved)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true); setError('')
    try {
      const response = await fetch(`/api/bkg/bookings/${bookingId}/booker-info`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contact_name: name, contact_phone: phone, note: request }) })
      const json = await response.json() as { error?: { message: string } }
      if (!response.ok) { setError(json.error?.message ?? 'Chưa lưu được thông tin.'); return }
      setDone(true); router.refresh()
    } catch { setError('Không kết nối được máy chủ. Thử lại.') } finally { setPending(false) }
  }
  return <form method="post" onSubmit={submit} className="v3a-right" aria-label="Thông tin người đặt">
    <section className="v3a-card" aria-labelledby="v3a-info">
      <h2 id="v3a-info" className="v3a-h2">Thông tin người đặt</h2>
      <p className="v3a-sm">Gần xong rồi! Chỉ cần kiểm tra phần thông tin <span className="v3a-req">*</span> bắt buộc.</p>
      <div className="v3a-fg" style={{ marginTop: 16 }}>
        <div className="v3a-f"><label htmlFor="v3a-cn">Tên công ty</label><input id="v3a-cn" value={companyName} readOnly /><p className="v3a-help">Lấy từ hồ sơ công ty.</p></div>
        <div className="v3a-f"><label htmlFor="v3a-em">Email</label><input id="v3a-em" type="email" value={email} readOnly /><p className="v3a-help">Lấy từ hồ sơ công ty.</p></div>
        <div className="v3a-f"><label htmlFor="v3a-ct">Người liên hệ <span className="v3a-req">*</span></label><input id="v3a-ct" value={name} maxLength={120} required onChange={event => setName(event.target.value)} /></div>
        <div className="v3a-f"><label htmlFor="v3a-ph">Số điện thoại <span className="v3a-req">*</span></label><input id="v3a-ph" type="tel" value={phone} maxLength={32} required onChange={event => setPhone(event.target.value)} /><p className="v3a-help">Để xưởng liên hệ khi cần, ví dụ đoàn đến muộn</p></div>
      </div>
    </section>
    <section className="v3a-card">
      <p className="v3a-ct">Ghi chú cho xưởng</p>
      <p className="v3a-sm">Xưởng sẽ cố gắng đáp ứng nhưng không đảm bảo. Bạn luôn có thể nhắn thêm cho xưởng sau khi thanh toán.</p>
      <div className="v3a-f" style={{ marginTop: 12 }}><label htmlFor="v3a-nt">Yêu cầu riêng của đoàn <span className="v3a-opt">(không bắt buộc)</span></label><textarea id="v3a-nt" rows={3} maxLength={1000} value={request} onChange={event => setRequest(event.target.value)} /></div>
    </section>
    <section className="v3a-card">
      <p className="v3a-ct">Thanh toán</p>
      <p className="v3a-pay">Thanh toán theo hướng dẫn của xưởng trong tin nhắn.</p>
      {error && <p className="v3a-err" role="alert">{error}</p>}
      {done && <p className="v3a-ok" role="status">Đã gửi xưởng thông báo bạn đã thanh toán. Xưởng sẽ xác nhận khi nhận tiền.</p>}
      <div className="v3a-actions">
        <button type="submit" className="v3a-btn v3a-btn--p" disabled={!hydrated || pending}>{pending ? 'Đang gửi…' : 'Hoàn tất đặt chỗ'}</button>
        <AgencyCancel bookingId={bookingId} />
      </div>
      <p className="v3a-cap" style={{ marginTop: 12 }}>Bạn chưa thanh toán nên báo huỷ lúc này không mất phí.</p>
    </section>
  </form>
}
