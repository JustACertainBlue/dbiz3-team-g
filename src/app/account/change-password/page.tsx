'use client'

// "Đổi mật khẩu" (png/19 left menu). Same request as before: POST /api/auth/change-password, then /login?password_changed=1.
import { useState } from 'react'
import AccountSidebar from '../../auth-v3/AccountSidebar'
import { passwordChecks } from '../../auth-v3/rules'
import '../../auth-v3/auth-v3.css'

export default function ChangePasswordPage() {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [fresh, setFresh] = useState('')
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget))
      const response = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error_message)
      window.location.assign('/login?password_changed=1')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể đổi mật khẩu.'); setBusy(false) }
  }
  return <main className="av3-page">
    <h1 className="av3-h1">Đổi mật khẩu</h1>
    <div className="av3-account">
      <AccountSidebar active="password" />
      <section className="av3-card av3-card--account">
        <p className="av3-lead">Mật khẩu tạm phải được đổi trước khi vào không gian làm việc. Sau khi đổi, bạn đăng nhập lại bằng mật khẩu mới.</p>
        <form onSubmit={submit} className="av3-form av3-form--edit">
          <div className="av3-field"><label htmlFor="cp-current">Mật khẩu hiện tại</label><input id="cp-current" name="current_password" type="password" autoComplete="current-password" required /></div>
          <div className="av3-field"><label htmlFor="cp-new">Mật khẩu mới</label><input id="cp-new" name="new_password" type="password" autoComplete="new-password" required minLength={8} maxLength={64} value={fresh} onChange={event => setFresh(event.target.value)} aria-describedby="cp-rules" /></div>
          <ul id="cp-rules" className="av3-rules" aria-label="Yêu cầu mật khẩu">
            {passwordChecks(fresh).map(check => <li key={check.id} className={check.ok ? 'av3-rules__ok' : ''}><span aria-hidden="true">{check.ok ? '✓' : '○'}</span>{check.label}<span className="av3-sr">{check.ok ? ' (đã đạt)' : ' (chưa đạt)'}</span></li>)}
          </ul>
          <div className="av3-field"><label htmlFor="cp-confirm">Nhập lại mật khẩu mới</label><input id="cp-confirm" name="confirm_password" type="password" autoComplete="new-password" required /></div>
          {error && <div className="av3-alert av3-alert--danger" role="alert"><strong>{error}</strong></div>}
          <div className="av3-actions"><button className="av3-btn av3-btn--primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu và đăng nhập lại'}</button></div>
        </form>
      </section>
    </div>
  </main>
}
