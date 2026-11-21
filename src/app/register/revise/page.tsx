'use client'

// Screen 17a (mockup v3 png/17a): supplement and resubmit a registration. Same requests as before:
// GET /api/register/resubmit?token=… and POST /api/register/resubmit (FormData). Fields the mockup does not list sit under "Thông tin khác".
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useHydrated } from '../../auth-v3/useHydrated'
import ReviseView, { type Revision } from '../../auth-v3/ReviseView'
import '../../auth-v3/auth-v3.css'


function RevisionForm() {
  const hydrated = useHydrated()
  const [files, setFiles] = useState<File[]>([])
  const token = useSearchParams().get('token') || ''
  const [data, setData] = useState<Revision | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(false), [confirmed, setConfirmed] = useState(false)
  useEffect(() => {
    fetch(`/api/register/resubmit?token=${encodeURIComponent(token)}`).then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error_message); setData(body) }).catch(error => setError(error.message))
  }, [token])
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const form = new FormData(); form.set('token', token); form.set('data', JSON.stringify(data)); files.forEach(file => form.append('registration_documents', file))
      const response = await fetch('/api/register/resubmit', { method: 'POST', body: form })
      const body = await response.json(); if (!response.ok) throw new Error(body.error_message)
      setDone(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể nộp lại hồ sơ.') } finally { setBusy(false) }
  }
  if (done) return <main className="av3-center"><section className="av3-card av3-card--narrow av3-center-text">
    <h1 className="av3-h1 av3-h1--card">Đã nộp lại hồ sơ</h1>
    <p className="av3-lead">Hồ sơ tiếp tục chờ Sở Du lịch thẩm định. Đường dẫn chỉnh sửa đã được sử dụng.</p>
    <a href="/login" className="av3-btn av3-btn--primary">Về đăng nhập</a></section></main>
  return <ReviseView data={data} setData={setData} files={files} setFiles={setFiles} confirmed={confirmed} setConfirmed={setConfirmed} hydrated={hydrated} busy={busy} error={error} submit={submit} />
}
export default function ReviseRegistration() { return <Suspense fallback={<p>Đang tải…</p>}><RevisionForm/></Suspense> }
