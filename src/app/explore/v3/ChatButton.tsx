'use client'
// "Nhắn tin cho xưởng" (mockup 04/24): the existing Chat handoff (FR-007, source_context "Detail Page").
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { handoffBody } from '../ExperienceActions'

export default function ChatButton({ experienceId, className = 'hab-btn hab-btn--secondary hab-btn--sm', label = 'Nhắn tin cho xưởng', children }: { experienceId: string; className?: string; label?: string; children?: React.ReactNode }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function open() {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/demo/handoff', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(handoffBody('chat', experienceId, 'Detail Page')) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error?.message || 'Không thể mở hội thoại')
      router.push(`/messages?chat_session_id=${encodeURIComponent(body.data.chat_session_id)}`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể mở hội thoại'); setBusy(false) }
  }
  return <>
    <button type="button" className={className} disabled={busy} onClick={open} aria-label={children ? label : undefined}>{children ?? (busy ? 'Đang mở…' : label)}</button>
    {error && <p role="alert" className="v3-error">{error}</p>}
  </>
}
