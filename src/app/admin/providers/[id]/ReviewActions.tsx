'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ReviewActions({ providerId }: { providerId: string }) {
  const router = useRouter()
  const [comments, setComments] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function review(decision: 'Approve' | 'Request Revision') {
    setBusy(true); setError('')
    const response = await fetch(`/api/prf/provider/${providerId}/verify`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision, revision_comments: decision === 'Request Revision' ? comments : undefined }),
    })
    const body = await response.json()
    if (!response.ok) { setError(body.error || 'Không thể lưu quyết định'); setBusy(false); return }
    router.push('/admin/providers'); router.refresh()
  }

  return <section className="review-actions"><h2>Quyết định thẩm định</h2><label>Nhận xét khi yêu cầu chỉnh sửa<textarea value={comments} onChange={event => setComments(event.target.value)} placeholder="Nêu rõ thông tin Provider cần bổ sung…"/></label>{error && <p role="alert">{error}</p>}<div><button disabled={busy} onClick={() => review('Approve')}>Approve Provider</button><button disabled={busy || !comments.trim()} onClick={() => review('Request Revision')}>Request Revision</button></div></section>
}
