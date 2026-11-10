'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export type SourceContext = 'Card' | 'Detail Page'

/** FR-007 handoff payload: `source_context` is "Card" on an Explore card (#204) or "Detail Page" (spec-EXP #29). */
export function handoffBody(action: 'quote' | 'chat', experienceId: string, sourceContext: SourceContext) {
  return { action, experience_id: experienceId, source_context: sourceContext }
}

// FR-007 (spec-EXP #29): actions carry their source_context ("Detail Page" by default, "Card" on Explore cards).
// FR-011: once this Agency sent a Quote Request for the Experience, Request Quote is hidden.
export default function ExperienceActions({ experienceId, quoteSent = false, sourceContext = 'Detail Page' }: { experienceId: string; quoteSent?: boolean; sourceContext?: SourceContext }) {
  const router = useRouter()
  const [busy, setBusy] = useState<'quote' | 'chat' | null>(null)
  const [error, setError] = useState('')

  async function handoff(action: 'quote' | 'chat') {
    setBusy(action)
    setError('')
    try {
      const response = await fetch('/api/demo/handoff', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(handoffBody(action, experienceId, sourceContext)),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error?.message || 'Không thể mở hội thoại')
      router.push(`/messages?chat_session_id=${encodeURIComponent(body.data.chat_session_id)}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể mở hội thoại')
      setBusy(null)
    }
  }

  return <div className="stack-actions">
    {quoteSent
      ? <p className="handoff-note" data-testid="quote-sent">Đã gửi yêu cầu báo giá cho trải nghiệm này. <button disabled={busy !== null} onClick={() => handoff('chat')}>Mở hội thoại</button></p>
      : <button className="button" disabled={busy !== null} onClick={() => handoff('quote')}>{busy === 'quote' ? 'Đang tạo yêu cầu…' : 'Yêu cầu báo giá'}</button>}
    <button className="button button--secondary" disabled={busy !== null} onClick={() => handoff('chat')}>{busy === 'chat' ? 'Đang mở Chat…' : 'Nhắn tin'}</button>
    {error && <p role="alert" className="handoff-error">{error}</p>}
  </div>
}
