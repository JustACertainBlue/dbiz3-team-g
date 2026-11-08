'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type React from 'react'
import type { BookingActions } from '@/lib/booking/booking-actions'

// BKG135 buttons from bookingActions (BR-017): disabled buttons stay visible and disabled (SC-007).
// The server re-checks every action (SR-001); the buttons are only a guide.
export default function BookingActionsBar({ providerId, bookingId, actions, status, chat }: {
  providerId: string
  bookingId: string
  actions: BookingActions
  status?: string
  chat?: React.ReactNode
}) {
  const router = useRouter()
  const base = `/provider/${providerId}/bookings/${bookingId}`
  const [pending, setPending] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const changeStatus = async (body: Record<string, string>) => {
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/bkg/bookings/${bookingId}/status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const json = await response.json() as { error?: { code: string; message: string } }
      if (!response.ok) {
        setError(json.error ? `${json.error.code}: ${json.error.message}` : 'Không đổi được trạng thái.')
        return
      }
      setCancelling(false)
      setReason('')
      router.refresh()
    } catch {
      setError('Không kết nối được máy chủ. Thử lại.')
    } finally {
      setPending(false)
    }
  }

  // FR-007 matrix; Figma "Màn 3" order and labels. A disabled Mark Group Arrival says why (FR-006: Booked and start reached).
  const arrivalReason = actions.mark_arrival ? '' : status === 'Booked' ? 'Đánh dấu đoàn đã đến: chưa tới giờ bắt đầu' : status === 'On hold' ? 'Đánh dấu đoàn đã đến: chỉ khi đặt chỗ đã đặt và đã tới giờ bắt đầu' : ''
  return <>
    <div className="bkg-actions bkg-actions--bar">
      {chat}
      <button type="button" className="bkg-btn bkg-btn--outline" disabled={!actions.update || pending} onClick={() => router.push(`${base}/edit`)}>Cập nhật</button>
      <button type="button" className="bkg-btn bkg-btn--danger" disabled={!actions.cancel || pending} onClick={() => setCancelling(true)}>Huỷ</button>
      <button type="button" className="bkg-btn bkg-btn--outline bkg-btn--lockable" disabled={!actions.mark_arrival || pending} aria-describedby={arrivalReason ? 'bkg-arrival-reason' : undefined} onClick={() => router.push(`${base}/arrival`)}>Đánh dấu đoàn đã đến</button>
      <button type="button" className="bkg-btn bkg-btn--primary" disabled={!actions.confirm || pending} onClick={() => changeStatus({ target_status: 'Booked' })}>Xác nhận</button>
    </div>
    {arrivalReason && <p id="bkg-arrival-reason" className="bkg-reason">{arrivalReason}</p>}
    {cancelling && actions.cancel && <form className="bkg-form" onSubmit={event => { event.preventDefault(); changeStatus({ target_status: 'Cancelled', cancellation_reason: reason }) }}>
      <label>Lý do huỷ (bắt buộc)
        <input value={reason} onChange={event => { setReason(event.target.value); setError(null) }} required />
      </label>
      <div className="bkg-actions">
        <button type="submit" className="bkg-btn bkg-btn--danger" disabled={pending || !reason.trim()}>Xác nhận huỷ</button>
        <button type="button" className="bkg-btn bkg-btn--outline" onClick={() => { setCancelling(false); setError(null) }}>Giữ đặt chỗ</button>
      </div>
    </form>}
    {error && <p className="bkg-error" role="alert">{error}</p>}
  </>
}
