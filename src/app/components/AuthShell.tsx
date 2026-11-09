// Sign-in layout for AUT009 Login and REG115 OTP (design wave 4, Figma "Màn 1", v9 §6e "Trang Đăng nhập"):
// a dark brand panel with soft rings on the left (a top banner on phones) and the form card on the right.
import Link from 'next/link'
import React from 'react'
import '../auth-v9.css'

export default function AuthShell({ children, title }: { children: React.ReactNode; title: string }) {
  // A <div>: the login page wraps it in <main>; REG115 already sits inside the registration layout's <main>.
  return <div className="auth-v9">
    <section className="auth-v9__brand" aria-label="Hanoi Artisan Bridge">
      <div className="auth-v9__rings" aria-hidden="true" />
      <div className="auth-v9__brand-text">
        <Link href="/explore" className="auth-v9__logo">Hanoi Artisan Bridge</Link>
        <p className="auth-v9__headline">Cầu nối đại lý du lịch và làng nghề Hà Nội</p>
        <p className="auth-v9__sub">Xưởng đã xác minh: Bát Tràng, Vạn Phúc, Chuông, Quất Động…</p>
      </div>
    </section>
    <section className="auth-v9__panel">
      <div className="auth-v9__card">
        <h1>{title}</h1>
        {children}
      </div>
    </section>
  </div>
}

export function AuthAlert({ title, children, tone = 'danger' }: { title: string; children?: React.ReactNode; tone?: 'danger' | 'success' }) {
  return <div className={`auth-v9__alert auth-v9__alert--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
    <span className="auth-v9__alert-icon" aria-hidden="true">{tone === 'danger' ? '!' : '✓'}</span>
    <div><strong>{title}</strong>{children && <p>{children}</p>}</div>
  </div>
}
