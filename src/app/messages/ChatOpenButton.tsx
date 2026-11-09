'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { chatOpenOutcome } from './chat-open'

// BKG135 / BKG138 "Chat": open (or reuse) the pair's Active Chat with source Booking (spec-IAC #19, #24).
export default function ChatOpenButton({ bookingId, label = 'Chat', className = 'bkg-chat-button' }: { bookingId: string; label?: string; className?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function open() {
    setBusy(true)
    setError('')
    const result = await fetch('/api/iac/chats', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source: 'Booking', booking_id: bookingId }),
    }).then(async response => ({ ok: response.ok, status: response.status, body: await response.json().catch(() => null) }))
      .catch(() => ({ networkError: true as const }))
    const outcome = chatOpenOutcome(result)
    if (outcome.kind === 'success') return router.push(outcome.navigateTo)
    setError(outcome.message)
    setBusy(false)
  }

  return <>
    <button type="button" className={className} disabled={busy} onClick={open}>{busy ? 'Đang mở Chat…' : label}</button>
    {error && <small role="alert">{error}</small>}
  </>
}
