'use client'

import { FormEvent, Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthSplit from '../auth-v3/AuthSplit'
import { useHydrated } from '../auth-v3/useHydrated'
import { prototypeLoginEnabled } from '@/lib/auth/prototype-login'
import { ContactDepartmentPopup, RejectedPopup, ReviseDocsPopup, SubmittedPopup } from '../auth-v3/RegistrationPopups'
import { formatViDateTime } from '../auth-v3/rules'

// png/18d. The repo holds no real support contact; these are the mockup's example values (example.invalid).
const DEPARTMENT_CONTACT = { email: 'hotro.sodulich@example.invalid', phone: '(024) 0000 0000', hours: '08:00 – 17:00, Thứ 2 – Thứ 6' }
type RegistrationStatus = { status: 'pending' | 'revise' | 'rejected'; reason: string; reviewed_at: string }

const demoAccounts = [
  ['Tour Agency', 'thanhvien13@example.invalid'],
  ['Local Provider', 'thanhvien19@example.invalid'],
  ['UBND Admin', 'thanhvien8@example.invalid'],
  ['HDT Admin', 'thanhvien9@example.invalid'],
] as const

export default function LoginPage() {
  return <main><Suspense fallback={<AuthSplit><p>Đang tải…</p></AuthSplit>}><LoginForm /></Suspense></main>
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // png/15 "Bạn là": only changes the hint under the button. The sign-in itself needs email and password only.
  const [who, setWho] = useState<'agency' | 'workshop'>('agency')
  const [busy, setBusy] = useState(false)
  const hydrated = useHydrated()
  const [remember, setRemember] = useState(false)
  const [registration, setRegistration] = useState<RegistrationStatus | null>(null)
  const [error, setError] = useState<{ code?: string; message: string } | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError(null)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, remember }),
      })
      const payload = await response.json() as { data?: { redirectTo: string }; error?: { code?: string; message?: string }; registration_status?: RegistrationStatus }
      if (!response.ok && payload.registration_status) { setRegistration(payload.registration_status); setBusy(false); return }
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

  // AUT009 elements: Email, Password, Login, Forgot password, Register (mockup v3 png/15).
  return <AuthSplit>
    <form className="av3-login" method="post" onSubmit={submit} noValidate={false} aria-label="Đăng nhập">
      <Link href="/explore" className="av3-link av3-login__back">‹ Tiếp tục khám phá mà không đăng nhập</Link>
      <h1 className="av3-h1">Đăng nhập</h1>
      <fieldset className="av3-roles">
        <legend>Bạn là:</legend>
        <div>
          <label className={`av3-role${who === 'agency' ? ' av3-role--on' : ''}`}><input type="radio" name="who" checked={who === 'agency'} onChange={() => setWho('agency')} />Công ty lữ hành</label>
          <label className={`av3-role${who === 'workshop' ? ' av3-role--on' : ''}`}><input type="radio" name="who" checked={who === 'workshop'} onChange={() => setWho('workshop')} />Xưởng nghề</label>
        </div>
      </fieldset>
      {error && (error.code === 'INVALID_CREDENTIALS'
        ? <div className="av3-alert av3-alert--danger" role="alert"><strong>Sai email hoặc mật khẩu.</strong><p>Kiểm tra lại hoặc đặt lại mật khẩu.</p></div>
        : <div className="av3-alert av3-alert--danger" role="alert"><strong>{error.message}</strong></div>)}
      <div className="av3-field"><label htmlFor="login-email">Email</label><input id="login-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" required /></div>
      <div className="av3-field"><label htmlFor="login-password">Mật khẩu</label>
        <div className="av3-field__pw"><input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required />
          <button type="button" onClick={() => setShowPassword(value => !value)} aria-pressed={showPassword}>{showPassword ? 'Ẩn' : 'Hiện'}</button></div>
      </div>
      <div className="av3-login__row">
        <label className="av3-check"><input type="checkbox" name="remember" checked={remember} onChange={event => setRemember(event.target.checked)} />Ghi nhớ đăng nhập (30 ngày)</label>
        <Link href="/forgot-password" className="av3-link">Quên mật khẩu?</Link>
      </div>
      <button className="av3-btn av3-btn--primary" type="submit" disabled={!hydrated || busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
      <hr className="av3-login__rule" />
      {who === 'agency'
        ? <p className="av3-login__foot">Công ty lữ hành chưa có tài khoản? <Link href="/register" className="av3-link">Đăng ký tài khoản công ty lữ hành</Link></p>
        : <p className="av3-login__foot">Tài khoản xưởng nghề do UBND xã cấp. Hãy đăng nhập bằng email được cấp.</p>}
      {/* #102: the demo panel only where the prototype login works (same condition as the server) */}
      {prototypeLoginEnabled() && <aside className="av3-demo">
        <strong>Tài khoản thử nghiệm</strong>
        <p>Chọn một email mẫu bên dưới. Ở prototype hiện tại, nhập bất kỳ mật khẩu không rỗng.</p>
        <div>{demoAccounts.map(([label, value]) => <button type="button" key={value} onClick={() => setEmail(value)}><span>{label}</span><small>{value}</small></button>)}</div>
      </aside>}
    </form>
    {registration && <>
      <SubmittedPopup open={registration.status === 'pending'} onClose={() => setRegistration(null)} info={{ email }} />
      <ReviseDocsPopup open={registration.status === 'revise'} onClose={() => setRegistration(null)} note={{ message: registration.reason || 'Sở Du lịch cần bạn bổ sung hồ sơ.', at: formatViDateTime(registration.reviewed_at) }} />
      <RejectedPopup open={registration.status === 'rejected'} onClose={() => setRegistration(null)} note={{ message: registration.reason || 'Không có lý do được ghi lại.', at: formatViDateTime(registration.reviewed_at) }} contact={DEPARTMENT_CONTACT} />
    </>}
  </AuthSplit>
}
