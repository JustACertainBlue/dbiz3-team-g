'use client'
// Tour Agency cancels its own On hold booking, reason required (UI v3 decision #5). Once Booked there is no button.
// The server decides (assertTransition); this form is only the guide.
import React, { useState } from 'react'
import './agency-booking-v3.css'
import { useRouter } from 'next/navigation'

export default function AgencyCancel({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function submit() {
    setPending(true); setError('')
    try {
      const response = await fetch(`/api/bkg/bookings/${bookingId}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_status: 'Cancelled', cancellation_reason: reason }) })
      const json = await response.json() as { error?: { message: string } }
      if (!response.ok) { setError(json.error?.message ?? 'Không huỷ được đặt chỗ.'); return }
      setOpen(false); router.refresh()
    } catch { setError('Không kết nối được máy chủ. Thử lại.') } finally { setPending(false) }
  }
  if (!open) return <button type="button" className="v3a-btn v3a-btn--d" onClick={() => setOpen(true)}>Huỷ đặt chỗ</button>
  return <div className="v3a-f" role="group" aria-label="Huỷ đặt chỗ">
    <label htmlFor="v3a-rs">Lý do huỷ <span className="v3a-req">*</span></label><input id="v3a-rs" value={reason} onChange={event => { setReason(event.target.value); setError('') }} />
    <div className="v3a-actions" style={{ marginTop: 8 }}>
      <button type="button" className="v3a-btn v3a-btn--d" disabled={pending || !reason.trim()} onClick={submit}>Xác nhận huỷ</button>
      <button type="button" className="v3a-btn v3a-btn--s" onClick={() => setOpen(false)}>Giữ đặt chỗ</button>
    </div>
    {error && <p className="v3a-err" role="alert">{error}</p>}
  </div>
}
