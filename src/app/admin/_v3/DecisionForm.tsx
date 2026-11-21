'use client'
// Screen 41a "Quyết định": three radio cards (Provider: two, the API has no Reject), a comment that is required for anything but Approve, "Gửi quyết định".
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui'

export type DecisionTarget = { type: 'agency'; id: string; kind: 'registration' | 'change' } | { type: 'provider'; id: string }
const AGENCY = [
  { value: 'Approve', label: 'Duyệt', hint: 'Tài khoản được kích hoạt' },
  { value: 'Request More Information', label: 'Yêu cầu bổ sung', hint: 'Người gửi sửa và gửi lại' },
  { value: 'Reject', label: 'Từ chối', hint: 'Tài khoản không được dùng' },
]
const PROVIDER = [
  { value: 'Approve', label: 'Duyệt', hint: 'Hồ sơ xưởng được công khai' },
  { value: 'Request Revision', label: 'Yêu cầu bổ sung', hint: 'Xưởng sửa và gửi lại' },
]

export default function DecisionForm({ target, backHref }: { target: DecisionTarget; backHref: string }) {
  const router = useRouter()
  const options = target.type === 'agency' ? AGENCY : PROVIDER
  const [decision, setDecision] = useState('Approve')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const needComment = decision !== 'Approve'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (needComment && !comment.trim()) { setError('Hãy nhập nhận xét khi yêu cầu bổ sung hoặc từ chối.'); return }
    setBusy(true); setError('')
    try {
      const response = target.type === 'agency'
        ? await fetch('/api/auth/agency-reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: target.id, kind: target.kind, decision, comment }) })
        : await fetch(`/api/prf/provider/${target.id}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, revision_comments: decision === 'Request Revision' ? comment : undefined }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Không thể lưu quyết định.')
      router.push(`${backHref}?tab=processed`); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu quyết định.'); setBusy(false) }
  }

  return <form className="av3-card av3-card--decide" onSubmit={submit} aria-labelledby="av3-dec-h">
    <h2 id="av3-dec-h">Quyết định</h2>
    <div className={`av3-decs${options.length === 2 ? ' av3-decs--2' : ''}`} role="radiogroup" aria-label="Quyết định">
      {options.map(o => <label key={o.value} className={`av3-dec${decision === o.value ? ' av3-dec--on' : ''}`}>
        <input type="radio" name="decision" value={o.value} checked={decision === o.value} onChange={() => { setDecision(o.value); setError('') }} />
        <span><b>{o.label}</b><span>{o.hint}</span></span></label>)}
    </div>
    <label className="av3-comment"><span><b>Nhận xét</b> (bắt buộc khi yêu cầu bổ sung{target.type === 'agency' ? ' hoặc từ chối' : ''})</span>
      <textarea value={comment} onChange={e => setComment(e.target.value)} disabled={busy} aria-required={needComment} placeholder="VD: Giấy đăng ký doanh nghiệp bị mờ phần mã số thuế, vui lòng tải lại." /></label>
    {error && <p className="av3-alert" role="alert">{error}</p>}
    <div className="av3-submit"><Button type="submit" disabled={busy}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /></svg>
      {busy ? 'Đang gửi…' : 'Gửi quyết định'}</Button></div>
  </form>
}
