'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import type { BookingDetail } from '@/lib/booking/booking-detail'
import { hanoiInputValue } from '@/lib/time/hanoi-time'
import '../../new/create-v3.css'

type ApiError = { error?: { code: string; message: string } }

// BKG144 form. Duration is not in the F-SCHED-07 output (#57), so it is prefilled from end_at − start_at.
export default function EditBookingForm({ detail, backHref }: { detail: BookingDetail; backHref: string }) {
  const router = useRouter()
  const initial = {
    start: hanoiInputValue(detail.start_at), // read as Hanoi time; saved back with +07:00 (#87)
    duration: Math.round((Date.parse(detail.end_at) - Date.parse(detail.start_at)) / 60_000),
    groupSize: detail.group_size,
    price: detail.agreed_price,
  }
  const [start, setStart] = useState(initial.start)
  const [duration, setDuration] = useState(initial.duration)
  const [groupSize, setGroupSize] = useState(initial.groupSize)
  const [price, setPrice] = useState(initial.price)
  // F-SCHED-05 targets only; Completed is never offered (SR-003). The chosen card; the current status = keep it.
  const [choice, setChoice] = useState(detail.status)
  const target = choice === detail.status ? '' : choice
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)


  const send = async (url: string, method: string, body: Record<string, unknown>): Promise<string | null> => {
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (response.ok) return null
    const json = await response.json() as ApiError
    return json.error ? `${json.error.code}: ${json.error.message}` : 'Không lưu được.'
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    // F-SCHED-04 takes only the changed fields (#48).
    const changes: Record<string, unknown> = {}
    if (start !== initial.start) changes.start_at = `${start}:00+07:00`
    if (duration !== initial.duration) changes.duration = duration
    if (groupSize !== initial.groupSize) changes.group_size = groupSize
    if (price !== initial.price) changes.agreed_price = price
    if (!Object.keys(changes).length && !target) {
      setError('Chưa có thay đổi nào để lưu.')
      return
    }
    setSaving(true)
    try {
      // Two calls on purpose: F-SCHED-04 never changes status (BR-007), F-SCHED-05 does.
      const url = `/api/bkg/bookings/${detail.booking_id}`
      const patched = Object.keys(changes).length > 0
      if (patched) {
        const failed = await send(url, 'PATCH', changes)
        if (failed) {
          setError(failed)
          return
        }
      }
      if (target) {
        const failed = await send(`${url}/status`, 'POST', target === 'Cancelled' ? { target_status: target, cancellation_reason: reason } : { target_status: target })
        if (failed) {
          // Partial save: never report it as a general success.
          setError(patched ? `Chi tiết đã lưu, trạng thái chưa đổi (vẫn ${detail.status}). ${failed}` : failed)
          router.refresh()
          return
        }
      }
      router.push(backHref)
      router.refresh()
    } catch {
      setError('Không kết nối được máy chủ. Thử lại.')
    } finally {
      setSaving(false)
    }
  }

  // Cards of the mockup "Trạng thái". Hoàn thành is only reached through "Xác nhận đoàn đã đến" (SR-003).
  const cards: { value: string; title: string; sub: string }[] = [
    { value: 'On hold', title: 'Đang giữ chỗ', sub: detail.status === 'On hold' ? 'Hiện tại' : 'Không quay lại được' },
    { value: 'Booked', title: 'Đã thanh toán', sub: detail.status === 'Booked' ? 'Hiện tại' : 'Bấm khi đã nhận tiền' },
    { value: 'Cancelled', title: 'Huỷ', sub: 'Cần ghi lý do' },
  ]
  // Same edges as assertTransition for the Provider: On hold → Booked | Cancelled, Booked → Cancelled.
  const allowed = (value: string) => value === detail.status || (detail.status === 'On hold' && value !== 'On hold') || (detail.status === 'Booked' && value === 'Cancelled')
  const locked = (value: string) => value === detail.status || !allowed(value)
  // Any field change clears the previous server error.
  return <form className="v3b-form" method="post" onSubmit={submit} onChange={() => setError(null)} aria-label="Sửa đặt chỗ">
    <section className="v3b-card">
      <h2 className="v3b-h2">Trạng thái</h2>
      <div className="v3b-row" role="radiogroup" aria-label="Trạng thái đặt chỗ">
        {cards.map(card => <label key={card.value} className="v3b-st" data-on={choice === card.value ? 'true' : 'false'}>
          <input type="radio" name="s" value={card.value} checked={choice === card.value} disabled={locked(card.value) && card.value !== choice} onChange={() => setChoice(card.value)} />
          <span><b>{card.title}</b><br /><span className="v3b-help">{card.sub}</span></span>
        </label>)}
        <div className="v3b-st v3b-st--off" aria-disabled="true"><span><b>Hoàn thành</b><br /><span className="v3b-help">Chỉ qua “Xác nhận đoàn đã đến”</span></span></div>
      </div>
      {choice === 'Cancelled' && <div className="v3b-f"><label htmlFor="rs">Lý do huỷ <span className="v3b-req">*</span></label><input id="rs" value={reason} onChange={event => setReason(event.target.value)} required /></div>}
    </section>
    <section className="v3b-card">
      <h2 className="v3b-h2">Đoàn &amp; trải nghiệm</h2>
      <div className="v3b-row">
        <div className="v3b-f"><label htmlFor="st">Bắt đầu (giờ Hà Nội) <span className="v3b-req">*</span></label><input id="st" type="datetime-local" value={start} onChange={event => setStart(event.target.value)} required /><p className="v3b-help">Đổi giờ không gia hạn thời gian giữ chỗ.</p></div>
        <div className="v3b-f"><label htmlFor="du">Thời lượng (phút) <span className="v3b-req">*</span></label><input id="du" type="number" min={1} step={1} value={duration} onChange={event => setDuration(Number(event.target.value))} required /></div>
        <div className="v3b-f"><label htmlFor="gs">Số khách <span className="v3b-req">*</span></label><input id="gs" type="number" min={1} step={1} value={groupSize} onChange={event => setGroupSize(Number(event.target.value))} required /></div>
      </div>
    </section>
    <section className="v3b-card">
      <h2 className="v3b-h2">Giá đã thống nhất</h2>
      <div className="v3b-f"><label htmlFor="pr">Tổng giá cho cả đoàn (₫) <span className="v3b-req">*</span></label><input id="pr" type="number" min={1} step="any" value={price} onChange={event => setPrice(Number(event.target.value))} required /></div>
      {error && <p className="v3b-err" role="alert">{error}</p>}
      <div className="v3b-actions">
        <Link className="v3b-btn v3b-btn--s" href={backHref}>Huỷ</Link>
        <button type="submit" className="v3b-btn v3b-btn--p" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
      </div>
    </section>
  </form>
}
