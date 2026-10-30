'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

// BKG136 action. F-SCHED-06 answers 200 even when the arrival is rejected; validation_error says why.
export default function ConfirmArrival({ bookingId, backHref }: { bookingId: string; backHref: string }) {
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
      router.push(backHref)
      router.refresh()
    } catch {
      setError('Không kết nối được máy chủ. Thử lại.')
    } finally {
      setPending(false)
    }
  }

  return <>
    {error && <p className="bkg-error" role="alert">{error}</p>}
    <div className="bkg-actions">
      <button type="button" disabled={pending} onClick={confirm}>{pending ? 'Đang xác nhận…' : 'Confirm Group Arrival'}</button>
      <Link href={backHref}>Cancel</Link>
    </div>
  </>
}
