'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthShell, { AuthAlert } from '../components/AuthShell'
import { prototypeLoginEnabled } from '@/lib/auth/prototype-login'

const demoAccounts = [
  ['Tour Agency', 'thanhvien13@example.invalid'],
  ['Local Provider', 'thanhvien19@example.invalid'],
  ['UBND Admin', 'thanhvien8@example.invalid'],
  ['HDT Admin', 'thanhvien9@example.invalid'],
] as const

export default function LoginPage() {
  return <main><Suspense fallback={<AuthShell title="Đăng nhập"><p>Đang tải…</p></AuthShell>}><LoginForm /></Suspense></main>
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ code?: string; message: string } | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError(null)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
      })
      const payload = await response.json() as { data?: { redirectTo: string }; error?: { code?: string; message?: string } }
      if (!response.ok || !payload.data) { setError({ code: payload.error?.code, message: payload.error?.message || 'Không thể đăng nhập.' }); setBusy(false); return }
      const requested = searchParams.get('next')
      const safeRequested = requested?.startsWith('/') && !requested.startsWith('//') ? requested : null
      router.replace(payload.data.redirectTo === '/account/change-password' ? payload.data.redirectTo : safeRequested || payload.data.redirectTo)
      router.refresh()
    } catch (cause) {
      setError({ message: cause instanceof Error ? cause.message : 'Không thể đăng nhập.' })
      setBusy(false)
    }
  }

  // AUT009 elements: Email, Password, Login, Forgot password, Register (Figma "Màn 1 · Đăng nhập").
  return <AuthShell title="Đăng nhập">
    <form className="auth-v9__form" onSubmit={submit} noValidate={false}>
      {error && (error.code === 'INVALID_CREDENTIALS'
        ? <AuthAlert title="Sai email hoặc mật khẩu.">Kiểm tra lại hoặc đặt lại mật khẩu.</AuthAlert>
        : <AuthAlert title={error.message} />)}
      <label className="auth-v9__field">Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" required aria-describedby="login-email-hint" /><small id="login-email-hint">Email đã đăng ký với cổng</small></label>
      <label className="auth-v9__field">Mật khẩu<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></label>
      <button className="auth-v9__primary" type="submit" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
      <div className="auth-v9__links"><a href="/forgot-password">Quên mật khẩu?</a><a href="/register">Đăng ký Agency</a></div>
    </form>
    {/* #102: the demo panel only where the prototype login works (same condition as the server) */}
    {prototypeLoginEnabled() && <aside className="auth-v9__demo">
      <strong>Tài khoản thử nghiệm</strong>
      <p>Chọn một email mẫu bên dưới. Ở prototype hiện tại, nhập bất kỳ mật khẩu không rỗng.</p>
      <div>{demoAccounts.map(([label, value]) => <button type="button" key={value} onClick={() => setEmail(value)}><span>{label}</span><small>{value}</small></button>)}</div>
    </aside>}
  </AuthShell>
}
