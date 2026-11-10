'use client'
import { useEffect, useState } from 'react'
import CreateAccountFields from './CreateAccountFields'
import { createAccountPayload } from './create-payload'
type Options = { kind: string; email_configured: boolean; villages: { village_id: string; name: string }[] }
export default function CreateAccountPage() {
  const [options, setOptions] = useState<Options | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  useEffect(() => { fetch('/api/auth/users/create').then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error_message); setOptions(data) }).catch(error => setError(error.message)) }, [])
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    const form = event.currentTarget
    try {
      const data = createAccountPayload(Object.fromEntries(new FormData(form)), options?.kind)
      const response = await fetch('/api/auth/users/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const body = await response.json(); if (!response.ok) throw new Error(body.error_message)
      setNotice('Đã tạo tài khoản. Thông tin đăng nhập được ghi vào dev-outbox; chưa gửi email thật.'); form.reset()
      const updated = await fetch('/api/auth/users/create'); if (updated.ok) setOptions(await updated.json())
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể tạo tài khoản.') } finally { setBusy(false) }
  }
  return <main className="auth-panel"><a href="/admin/users">← Quản lý tài khoản</a><h1>Tạo tài khoản {options?.kind === 'ubnd' ? 'UBND' : 'Local Provider'}</h1>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}{options && <><p>{options.kind === 'ubnd' ? 'HDT cấp tài khoản UBND và phân công một làng nghề.' : 'UBND cấp tài khoản Provider trong làng nghề được phân công. Hồ sơ mới ở trạng thái Draft.'}</p>{!options.email_configured && <p role="note">Chưa cấu hình email. Chức năng cấp mật khẩu tạm đang chờ dịch vụ email; chưa tạo tài khoản khi gửi thất bại.</p>}<form onSubmit={submit}><CreateAccountFields options={options} /><button disabled={busy || !options.email_configured || !options.villages.length}>{busy ? 'Đang tạo…' : 'Tạo tài khoản'}</button><a href="/admin/users" className="auth-cancel">Huỷ</a></form></>}</main>
}
