'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { SessionContext } from '@/lib/auth/session'

function workspace(session: SessionContext): string {
  if (session.mustChangePassword) return '/account/change-password'
  if (session.role === 'Local_Provider' && session.providerId) return `/provider/${session.providerId}/dashboard`
  if (session.role === 'ADMIN') return session.adminType === 'UBND' ? '/admin/providers' : '/admin'
  return '/explore'
}

function moduleLinks(session: SessionContext): Array<{ href: string; label: string }> {
  if (session.mustChangePassword) return [{ href: '/account/change-password', label: 'Đổi mật khẩu tạm' }]
  if (session.role === 'Local_Provider' && session.providerId) {
    const base = `/provider/${session.providerId}`
    return [
      { href: `${base}/dashboard`, label: 'Tổng quan' },
      { href: base, label: 'Hồ sơ xưởng' },
      { href: `${base}/experiences`, label: 'Trải nghiệm' },
      { href: `${base}/bookings`, label: 'Đặt đoàn' },
      { href: `${base}/schedule`, label: 'Lịch hoạt động' },
      { href: '/messages', label: 'Hộp thư' },
    ]
  }
  if (session.role === 'Tour_Agency' && session.agencyId) {
    return [
      { href: '/explore', label: 'Explore' },
      { href: '/ai-matching', label: 'AI Matching' },
      { href: `/agency/${session.agencyId}/bookings`, label: 'Đặt đoàn' },
      { href: `/agency/${session.agencyId}/schedule`, label: 'Lịch hoạt động' },
      { href: '/messages', label: 'Hộp thư' },
      { href: `/agency/${session.agencyId}`, label: 'Hồ sơ công ty' },
    ]
  }
  if (session.role === 'ADMIN') {
    return [
      { href: '/admin', label: 'Tổng quan' },
      { href: '/admin/providers', label: 'Thẩm định xưởng' },
      { href: '/admin/users', label: 'Quản lý tài khoản' },
      ...(session.adminType === 'HDT' ? [{ href: '/admin/agencies', label: 'Thẩm định công ty' }] : []),
    ]
  }
  return []
}

export default function SessionHeader() {
  const [session, setSession] = useState<SessionContext | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const pathname = usePathname()
  useEffect(() => { fetch('/api/auth/session', { cache: 'no-store' }).then(r => r.json()).then(p => setSession(p.data.session)).catch(() => setSession(null)) }, [pathname])

  async function logout() {
    setLoggingOut(true); setLogoutError('')
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Logout failed')
      sessionStorage.clear()
      window.location.assign('/login')
    } catch { setLogoutError('Không thể đăng xuất. Vui lòng thử lại.'); setLoggingOut(false) }
  }

  if (!session) return null
  const links = moduleLinks(session)
  const activeHref = links.filter(link => pathname === link.href || pathname.startsWith(`${link.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href
  return <header className="session-header">
    <div className="session-header__top">
      <Link href={session.authenticated ? workspace(session) : '/explore'} className="brand">Hanoi Artisan Bridge</Link>
      <nav className="account-nav">{session.authenticated ? <>
        <Link href="/account">Tài khoản của tôi</Link>
        <span>{session.role === 'ADMIN' ? `${session.adminType} Admin` : session.role === 'Tour_Agency' ? 'Tour Agency' : 'Local Provider'}</span>
        <button type="button" onClick={() => setConfirmLogout(true)}>Đăng xuất</button>
      </> : <><Link href="/explore">Khám phá</Link><Link href="/login" className="login-link">Đăng nhập</Link></>}</nav>
    </div>
    {session.authenticated && links.length > 0 && <nav className="module-nav" aria-label="Điều hướng không gian làm việc">
      {links.map(link => <Link key={link.href} href={link.href} aria-current={activeHref === link.href ? 'page' : undefined} className={activeHref === link.href ? 'active' : ''}>{link.label}</Link>)}
    </nav>}
    {confirmLogout && <div className="logout-overlay" onClick={() => { if (!loggingOut) setConfirmLogout(false) }}><div role="dialog" aria-modal="true" aria-labelledby="logout-title" className="logout-dialog" onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape' && !loggingOut) setConfirmLogout(false); if (event.key === 'Tab') { const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')); const first = buttons[0]; const last = buttons[buttons.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() } } }}><h2 id="logout-title">Đăng xuất?</h2><p>Bạn sẽ cần đăng nhập lại để tiếp tục.</p>{logoutError && <p role="alert">{logoutError}</p>}<div><button autoFocus type="button" disabled={loggingOut} onClick={() => setConfirmLogout(false)}>Hủy</button><button type="button" disabled={loggingOut} onClick={logout}>{loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</button></div></div></div>}
    <style jsx>{`
      .logout-overlay{position:fixed;inset:0;background:var(--alpha-black-60);display:grid;place-items:center;padding:var(--space-20);z-index:1100}.logout-dialog{background:var(--palette-gray-99);color:var(--palette-teal-16-2);border-radius:16px;padding:var(--space-26);width:min(100%,420px);box-shadow:0 16px 50px var(--alpha-black-26p7)}.logout-dialog h2{font:700 26px Georgia,serif}.logout-dialog p{margin:var(--space-12) 0 var(--space-22);color:var(--palette-gray-37)}.logout-dialog div{display:flex;justify-content:flex-end;gap:var(--space-10)}.logout-dialog button{padding:var(--space-10) var(--space-16);border:1px solid var(--palette-gray-74);border-radius:8px;background:var(--palette-white);cursor:pointer}.logout-dialog button:last-child{background:var(--palette-teal-16-2);color:var(--palette-white);border-color:var(--palette-teal-16-2)}
      .session-header{position:relative;z-index:1000;background:var(--palette-teal-12);color:var(--palette-white);border-bottom:1px solid var(--alpha-white-12p2)}.session-header__top{min-height:52px;padding:var(--space-9) var(--space-22);display:flex;align-items:center;justify-content:space-between;gap:var(--space-16)}.session-header :global(.brand){font:700 17px Georgia,serif;color:var(--palette-white);text-decoration:none}.account-nav,.module-nav{display:flex;align-items:center;gap:var(--space-15);font-size:var(--font-size-13)}.account-nav :global(a),.module-nav :global(a){color:var(--palette-gray-95);text-decoration:none}.account-nav span{color:var(--palette-gray-82)}.module-nav{padding:0 var(--space-22) var(--space-10);gap:var(--space-5);overflow-x:auto}.module-nav :global(a){white-space:nowrap;padding:var(--space-7) var(--space-11);border-radius:7px;color:var(--palette-green-87)}.module-nav :global(a:hover),.module-nav :global(a.active){background:var(--alpha-white-14p9);color:var(--palette-white)}.account-nav button,.account-nav :global(.login-link){border:1px solid var(--alpha-white-29);border-radius:7px;padding:var(--space-7) var(--space-11);background:transparent;color:var(--palette-white);cursor:pointer;font:inherit}.account-nav :global(.login-link){background:var(--palette-white);color:var(--palette-teal-12);font-weight:700}@media(max-width:620px){.account-nav span{display:none}.session-header__top,.module-nav{padding-inline:var(--space-14)}}
    `}</style>
  </header>
}
