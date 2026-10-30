'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { BookingDetail } from '@/lib/booking/booking-detail'

type ApiError = { error?: { code: string; message: string } }

// BKG144 form. Duration is not in the F-SCHED-07 output (#57), so it is prefilled from end_at − start_at.
export default function EditBookingForm({ detail, backHref }: { detail: BookingDetail; backHref: string }) {
  const router = useRouter()
  const initial = {
    start: detail.start_at.slice(0, 16),
    duration: Math.round((Date.parse(detail.end_at) - Date.parse(detail.start_at)) / 60_000),
    groupSize: detail.group_size,
    price: detail.agreed_price,
    notice: detail.notice_period,
    policy: JSON.stringify(detail.cancellation_policy),
  }
  const [start, setStart] = useState(initial.start)
  const [duration, setDuration] = useState(initial.duration)
  const [groupSize, setGroupSize] = useState(initial.groupSize)
  const [price, setPrice] = useState(initial.price)
  const [notice, setNotice] = useState(initial.notice)
  const [policy, setPolicy] = useState(initial.policy)
  // F-SCHED-05 targets only; Completed is never offered (SR-003). Empty = keep the current status.
  const [target, setTarget] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targets = detail.status === 'On hold' ? ['Booked', 'Cancelled'] : ['Cancelled']

  const send = async (url: string, method: string, body: Record<string, unknown>): Promise<string | null> => {
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (response.ok) return null
    const json = await response.json() as ApiError
    return json.error ? `${json.error.code}: ${json.error.message}` : 'Không lưu được.'
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    let cancellationPolicy: unknown
    try {
      cancellationPolicy = JSON.parse(policy)
    } catch {
      setError('Cancellation policy phải là JSON hợp lệ.')
      return
    }
    // F-SCHED-04 takes only the changed fields (#48).
    const changes: Record<string, unknown> = {}
    if (start !== initial.start) changes.start_at = `${start}:00+07:00`
    if (duration !== initial.duration) changes.duration = duration
    if (groupSize !== initial.groupSize) changes.group_size = groupSize
    if (price !== initial.price) changes.agreed_price = price
    if (notice !== initial.notice || policy !== initial.policy) changes.booking_conditions = { notice_period: notice, cancellation_policy: cancellationPolicy }
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

  // Any field change clears the previous server error.
  return <form className="bkg-form" onSubmit={submit} onChange={() => setError(null)}>
    <div className="bkg-grid">
      <label>Bắt đầu (giờ Hà Nội)
        <input type="datetime-local" value={start} onChange={event => setStart(event.target.value)} required />
      </label>
      <label>Thời lượng (phút)
        <input type="number" min={1} step={1} value={duration} onChange={event => setDuration(Number(event.target.value))} required />
      </label>
      <label>Số khách
        <input type="number" min={1} step={1} value={groupSize} onChange={event => setGroupSize(Number(event.target.value))} required />
      </label>
      <label>Giá thỏa thuận cho cả đoàn (VND)
        <input type="number" min={1} step="any" value={price} onChange={event => setPrice(Number(event.target.value))} required />
      </label>
      <label>Notice period (giờ)
        <input type="number" min={0} step={1} value={notice} onChange={event => setNotice(Number(event.target.value))} required />
      </label>
      <label>Cancellation policy (JSON)
        <textarea rows={2} value={policy} onChange={event => setPolicy(event.target.value)} required />
      </label>
      <label>Trạng thái mới
        <select value={target} onChange={event => setTarget(event.target.value)}>
          <option value="">Giữ nguyên ({detail.status})</option>
          {targets.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      {target === 'Cancelled' && <label>Lý do hủy (bắt buộc)
        <input value={reason} onChange={event => setReason(event.target.value)} required />
      </label>}
    </div>
    {error && <p className="bkg-error" role="alert">{error}</p>}
    <div className="bkg-actions">
      <button type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Save'}</button>
      <Link href={backHref}>Discard</Link>
    </div>
  </form>
}
