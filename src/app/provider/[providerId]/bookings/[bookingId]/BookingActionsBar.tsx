'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { BookingActions } from '@/lib/booking/booking-actions'

// BKG135 buttons from bookingActions (BR-017): disabled buttons stay visible and disabled (SC-007).
// The server re-checks every action (SR-001); the buttons are only a guide.
export default function BookingActionsBar({ providerId, bookingId, actions }: {
  providerId: string
  bookingId: string
  actions: BookingActions
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

  return <>
    <div className="bkg-actions">
      <button type="button" disabled={!actions.confirm || pending} onClick={() => changeStatus({ target_status: 'Booked' })}>Confirm/Book</button>
      <button type="button" disabled={!actions.update || pending} onClick={() => router.push(`${base}/edit`)}>Update</button>
      <button type="button" className="bkg-danger" disabled={!actions.cancel || pending} onClick={() => setCancelling(true)}>Cancel</button>
      <button type="button" disabled={!actions.mark_arrival || pending} onClick={() => router.push(`${base}/arrival`)}>Mark Group Arrival</button>
    </div>
    {cancelling && actions.cancel && <form className="bkg-form" onSubmit={event => { event.preventDefault(); changeStatus({ target_status: 'Cancelled', cancellation_reason: reason }) }}>
      <label>Lý do hủy (bắt buộc)
        <input value={reason} onChange={event => { setReason(event.target.value); setError(null) }} required />
      </label>
      <div className="bkg-actions">
        <button type="submit" className="bkg-danger" disabled={pending || !reason.trim()}>Xác nhận hủy</button>
        <button type="button" onClick={() => { setCancelling(false); setError(null) }}>Giữ Booking</button>
      </div>
    </form>}
    {error && <p className="bkg-error" role="alert">{error}</p>}
  </>
}
