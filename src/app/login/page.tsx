'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { prototypeLoginEnabled } from '@/lib/auth/prototype-login'

const demoAccounts = [
  ['Tour Agency', 'thanhvien13@example.invalid'],
  ['Local Provider', 'thanhvien19@example.invalid'],
  ['UBND Admin', 'thanhvien8@example.invalid'],
  ['HDT Admin', 'thanhvien9@example.invalid'],
] as const

export default function LoginPage() {
  return <Suspense fallback={<main className="login-page">Đang tải…</main>}><LoginForm /></Suspense>
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
      })
      const payload = await response.json() as { data?: { redirectTo: string }; error?: { message?: string } }
      if (!response.ok || !payload.data) throw new Error(payload.error?.message || 'Không thể đăng nhập.')
      const requested = searchParams.get('next')
      const safeRequested = requested?.startsWith('/') && !requested.startsWith('//') ? requested : null
      router.replace(payload.data.redirectTo === '/account/change-password' ? payload.data.redirectTo : safeRequested || payload.data.redirectTo)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đăng nhập.')
      setBusy(false)
    }
  }

  return <main className="login-page">
    <section className="login-card">
      <div className="login-intro">
        <p className="eyebrow">Hanoi Artisan Bridge</p><h1>Đăng nhập</h1>
        <p>Truy cập không gian làm việc dành cho công ty du lịch, hộ kinh doanh và cơ quan quản lý.</p>
      </div>
      <form onSubmit={submit}>
        <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" required /></label>
        <label>Mật khẩu<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
        <a href="/forgot-password">Quên mật khẩu?</a>
        <a href="/register">Đăng ký tài khoản Agency</a>
      </form>
      {prototypeLoginEnabled() && <aside>
        <strong>Tài khoản thử nghiệm</strong>
        <p>Chọn một email mẫu bên dưới. Ở prototype hiện tại, nhập bất kỳ mật khẩu không rỗng.</p>
        <div>{demoAccounts.map(([label, value]) => <button type="button" key={value} onClick={() => setEmail(value)}><span>{label}</span><small>{value}</small></button>)}</div>
      </aside>}
    </section>
    <style jsx>{`
      .login-page{min-height:100vh;display:grid;place-items:center;padding:32px;background:#f4f1e8;color:#17251e}.login-card{width:min(980px,100%);display:grid;grid-template-columns:1fr 1fr;gap:32px;padding:40px;border:1px solid #d8d2c3;border-radius:22px;background:#fff;box-shadow:0 18px 55px #17251e1c}.login-intro{grid-column:1/-1}.eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:800;color:#a04c2f}.login-intro h1{font:700 48px/1.1 Georgia,serif;margin:8px 0}.login-intro p{color:#5d6a63;max-width:650px;line-height:1.6}form{display:flex;flex-direction:column;gap:18px}label{display:flex;flex-direction:column;gap:8px;font-weight:700}input{padding:13px 14px;border:1px solid #b9c2bc;border-radius:9px;font:inherit}form button{padding:13px;border:0;border-radius:9px;background:#274d3b;color:#fff;font:700 15px inherit;cursor:pointer}form button:disabled{opacity:.6}.error{margin:0;color:#b42318}aside{padding:20px;border-radius:14px;background:#f4f1e8}aside>p{font-size:13px;line-height:1.5;color:#68736d}aside>div{display:grid;gap:8px}aside button{text-align:left;padding:10px 12px;border:1px solid #d8d2c3;border-radius:8px;background:#fff;cursor:pointer}aside button span,aside button small{display:block}aside button span{font-weight:700}aside button small{margin-top:3px;color:#68736d}@media(max-width:720px){.login-card{grid-template-columns:1fr;padding:24px}.login-intro h1{font-size:38px}}
    `}</style>
  </main>
}
