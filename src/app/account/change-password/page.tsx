'use client'
import { useState } from 'react'
export default function ChangePasswordPage() {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget))
      const response = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error_message)
      window.location.assign('/login?password_changed=1')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể đổi mật khẩu.'); setBusy(false) }
  }
  return <main className="auth-panel"><h1>Đổi mật khẩu</h1><p>Mật khẩu tạm phải được đổi trước khi vào không gian làm việc. Mật khẩu mới cần 8–64 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p><form onSubmit={submit}><label>Mật khẩu hiện tại<input name="current_password" type="password" autoComplete="current-password" required/></label><label>Mật khẩu mới<input name="new_password" type="password" autoComplete="new-password" required minLength={8} maxLength={64}/></label><label>Nhập lại mật khẩu mới<input name="confirm_password" type="password" autoComplete="new-password" required/></label>{error && <p role="alert">{error}</p>}<button disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu và đăng nhập lại'}</button></form><a href="/login">Về đăng nhập</a></main>
}
