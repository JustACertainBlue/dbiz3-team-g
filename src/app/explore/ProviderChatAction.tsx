'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProviderChatAction({ experienceId }: { experienceId?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function openChat() {
    if (!experienceId) return router.push('/messages')
    setBusy(true)
    setError('')
    const response = await fetch('/api/demo/handoff', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'chat', experience_id: experienceId }),
    })
    const body = await response.json()
    if (!response.ok) {
      setError(body.error?.message || 'Không thể mở Chat')
      setBusy(false)
      return
    }
    router.push(`/messages?chat_session_id=${encodeURIComponent(body.data.chat_session_id)}`)
  }

  return <><button className="button" disabled={busy} onClick={openChat}>{busy ? 'Đang mở Chat…' : 'Chat với Provider'}</button>{error && <small role="alert">{error}</small>}</>
}
