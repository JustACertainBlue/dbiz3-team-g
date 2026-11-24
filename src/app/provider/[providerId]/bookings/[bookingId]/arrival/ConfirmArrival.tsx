'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import '@/app/agency/[agencyId]/bookings/[bookingId]/agency-booking-v3.css'

// BKG136 action. F-SCHED-06 answers 200 even when the arrival is rejected; validation_error says why.
// #192, screen-spec-BKG136 §3 #5: enabled only when the F-SCHED-06 guard succeeds (Booked and start reached);
// `allowed` and `lockReason` come from the server-computed booking actions. The server still re-checks.
export default function ConfirmArrival({ bookingId, backHref, allowed, lockReason = '' }: { bookingId: string; backHref: string; allowed: boolean; lockReason?: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/bkg/bookings/${bookingId}/arrival`, { method: 'POST' })
      const json = await response.json() as { data?: { transition_applied: boolean; validation_error?: string }; error?: { code: string; message: string } }
      if (!response.ok || !json.data) {
        setError(json.error ? `${json.error.code}: ${json.error.message}` : 'Không xác nhận được.')
        return
      }
      if (!json.data.transition_applied) {
        setError(json.data.validation_error ?? 'Không xác nhận được.')
        return
      }
      router.refresh() // the page now shows the completion view (10d)
    } catch {
      setError('Không kết nối được máy chủ. Thử lại.')
    } finally {
      setPending(false)
    }
  }

  return <>
    {error && <p className="v3a-err" role="alert">{error}</p>}
    <div className="v3a-actions">
      <button type="button" className="v3a-btn v3a-btn--p" disabled={!allowed || pending} aria-describedby={!allowed && lockReason ? 'bkg136-lock-reason' : undefined} onClick={confirm}>{pending ? 'Đang xác nhận…' : 'Xác nhận đoàn đã đến'}</button>
      <Link className="v3a-btn v3a-btn--s" href={backHref}>Quay lại</Link>
    </div>
    {!allowed && lockReason && <p id="bkg136-lock-reason" className="v3a-cap">{lockReason}</p>}
  </>
}
