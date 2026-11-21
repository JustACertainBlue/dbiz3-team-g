'use client'
// Tour Agency cancels its own On hold booking, reason required (UI v3 decision #5). Once Booked there is no button.
// The server decides (assertTransition); this form is only the guide.
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AgencyCancel({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true); setError('')
    try {
      const response = await fetch(`/api/bkg/bookings/${bookingId}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_status: 'Cancelled', cancellation_reason: reason }) })
      const json = await response.json() as { error?: { message: string } }
      if (!response.ok) { setError(json.error?.message ?? 'Không huỷ được đặt chỗ.'); return }
      setOpen(false); router.refresh()
    } catch { setError('Không kết nối được máy chủ. Thử lại.') } finally { setPending(false) }
  }
  if (!open) return <button type="button" className="bkg-btn bkg-btn--danger" onClick={() => setOpen(true)}>Huỷ đặt chỗ</button>
  return <form className="bkg-form" onSubmit={submit}>
    <label>Lý do huỷ (bắt buộc)<input value={reason} onChange={event => { setReason(event.target.value); setError('') }} required /></label>
    <div className="bkg-actions">
      <button type="submit" className="bkg-btn bkg-btn--danger" disabled={pending || !reason.trim()}>Xác nhận huỷ</button>
      <button type="button" className="bkg-btn bkg-btn--outline" onClick={() => setOpen(false)}>Giữ đặt chỗ</button>
    </div>
    {error && <p className="bkg-error" role="alert">{error}</p>}
  </form>
}
