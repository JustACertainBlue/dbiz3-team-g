'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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
      <aside>
        <strong>Tài khoản thử nghiệm</strong>
        <p>Chọn một email mẫu bên dưới. Ở prototype hiện tại, nhập bất kỳ mật khẩu không rỗng.</p>
        <div>{demoAccounts.map(([label, value]) => <button type="button" key={value} onClick={() => setEmail(value)}><span>{label}</span><small>{value}</small></button>)}</div>
      </aside>
    </section>
    <style jsx>{`
      .login-page{min-height:100vh;display:grid;place-items:center;padding:var(--space-32);background:var(--palette-amber-93);color:var(--palette-teal-12)}.login-card{width:min(980px,100%);display:grid;grid-template-columns:1fr 1fr;gap:var(--space-32);padding:var(--space-40);border:var(--border-width-1) solid var(--palette-amber-81);border-radius:var(--radius-22);background:var(--palette-white);box-shadow:0 18px 55px var(--alpha-teal-12-11)}.login-intro{grid-column:1/-1}.eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:var(--font-size-12);font-weight:800;color:var(--palette-orange-41)}.login-intro h1{font:700 48px/1.1 Georgia,serif;margin:var(--space-8) 0}.login-intro p{color:var(--palette-gray-39);max-width:650px;line-height:1.6}form{display:flex;flex-direction:column;gap:var(--space-18)}label{display:flex;flex-direction:column;gap:var(--space-8);font-weight:700}input{padding:var(--space-13) var(--space-14);border:var(--border-width-1) solid var(--palette-gray-74-2);border-radius:var(--radius-9);font:inherit}form button{padding:var(--space-13);border:0;border-radius:var(--radius-9);background:var(--palette-teal-23);color:var(--palette-white);font:700 15px inherit;cursor:pointer}form button:disabled{opacity:.6}.error{margin:0;color:var(--palette-red-40)}aside{padding:var(--space-20);border-radius:var(--radius-14);background:var(--palette-amber-93)}aside>p{font-size:var(--font-size-13);line-height:1.5;color:var(--palette-gray-43)}aside>div{display:grid;gap:var(--space-8)}aside button{text-align:left;padding:var(--space-10) var(--space-12);border:var(--border-width-1) solid var(--palette-amber-81);border-radius:var(--radius-8);background:var(--palette-white);cursor:pointer}aside button span,aside button small{display:block}aside button span{font-weight:700}aside button small{margin-top:var(--space-3);color:var(--palette-gray-43)}@media(max-width:720px){.login-card{grid-template-columns:1fr;padding:var(--space-24)}.login-intro h1{font-size:var(--font-size-38)}}
    `}</style>
  </main>
}
