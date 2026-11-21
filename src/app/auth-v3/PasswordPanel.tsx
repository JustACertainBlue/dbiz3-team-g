'use client'

// Screen 19, password panel (png/19). Same request as the old page: POST /api/auth/change-password, then /login?password_changed=1.
import React, { useState } from 'react'
import { useHydrated } from './useHydrated'
import './auth-v3.css'

export default function PasswordPanel({ forced }: { forced: boolean }) {
  const hydrated = useHydrated()
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
  return <section className="av3-card av3-card--account">
    <h2 className="av3-sub">Đổi mật khẩu</h2>
    {forced && <p className="av3-lead">Mật khẩu tạm phải được đổi trước khi vào không gian làm việc.</p>}
    <form method="post" onSubmit={submit} className="av3-form av3-form--edit">
      <div className="av3-field"><label htmlFor="cp-current">Mật khẩu hiện tại</label><input id="cp-current" name="current_password" type="password" autoComplete="current-password" required /></div>
      <div className="av3-field"><label htmlFor="cp-new">Mật khẩu mới</label><input id="cp-new" name="new_password" type="password" autoComplete="new-password" required minLength={8} maxLength={64} value={fresh} onChange={event => setFresh(event.target.value)} aria-describedby="cp-rules" /></div>
      <p id="cp-rules" className="av3-field__hint">Ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt (!@#…).</p>
      <div className="av3-field"><label htmlFor="cp-confirm">Nhập lại mật khẩu mới</label><input id="cp-confirm" name="confirm_password" type="password" autoComplete="new-password" required /></div>
      <p className="av3-caption">Sau khi đổi, bạn cần đăng nhập lại.</p>
      {error && <div className="av3-alert av3-alert--danger" role="alert"><strong>{error}</strong></div>}
      <div className="av3-actions"><button className="av3-btn av3-btn--primary" disabled={!hydrated || busy}>{busy ? 'Đang lưu…' : 'Đổi mật khẩu'}</button></div>
    </form>
  </section>
}
