'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { SessionContext } from '@/lib/auth/session'

function workspace(session: SessionContext): string {
  if (session.role === 'Local_Provider' && session.providerId) return `/provider/${session.providerId}/dashboard`
  if (session.role === 'ADMIN') return session.adminType === 'UBND' ? '/admin/providers' : '/admin'
  return '/explore'
}

function moduleLinks(session: SessionContext): Array<{ href: string; label: string }> {
  if (session.role === 'Local_Provider' && session.providerId) {
    const base = `/provider/${session.providerId}`
    return [
      { href: `${base}/dashboard`, label: 'Dashboard' },
      { href: base, label: 'Hồ sơ xưởng' },
      { href: `${base}/experiences`, label: 'Experiences' },
      { href: `${base}/bookings`, label: 'Bookings' },
      { href: `${base}/schedule`, label: 'Schedule' },
      { href: '/messages', label: 'Messages' },
    ]
  }
  if (session.role === 'Tour_Agency' && session.agencyId) {
    return [
      { href: '/explore', label: 'Explore' },
      { href: '/ai-matching', label: 'AI Matching' },
      { href: `/agency/${session.agencyId}/bookings`, label: 'Bookings' },
      { href: `/agency/${session.agencyId}/schedule`, label: 'Schedule' },
      { href: '/messages', label: 'Messages' },
      { href: `/agency/${session.agencyId}`, label: 'Hồ sơ Agency' },
    ]
  }
  if (session.role === 'ADMIN') {
    return [
      { href: '/admin', label: 'Dashboard' },
      { href: '/admin/providers', label: 'Provider review' },
      { href: '/admin/users', label: 'Quản lý tài khoản' },
      ...(session.adminType === 'HDT' ? [{ href: '/admin/agencies', label: 'Thẩm định Agency' }] : []),
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
      .logout-overlay{position:fixed;inset:0;background:#0009;display:grid;place-items:center;padding:20px;z-index:1100}.logout-dialog{background:#fffdf8;color:#203229;border-radius:16px;padding:26px;width:min(100%,420px);box-shadow:0 16px 50px #0004}.logout-dialog h2{font:700 26px Georgia,serif}.logout-dialog p{margin:12px 0 22px;color:#59665e}.logout-dialog div{display:flex;justify-content:flex-end;gap:10px}.logout-dialog button{padding:10px 16px;border:1px solid #b6c3b8;border-radius:8px;background:#fff;cursor:pointer}.logout-dialog button:last-child{background:#203229;color:#fff;border-color:#203229}
      .session-header{position:relative;z-index:1000;background:#17251e;color:#fff;border-bottom:1px solid #ffffff1f}.session-header__top{min-height:52px;padding:9px 22px;display:flex;align-items:center;justify-content:space-between;gap:16px}.session-header :global(.brand){font:700 17px Georgia,serif;color:#fff;text-decoration:none}.account-nav,.module-nav{display:flex;align-items:center;gap:15px;font-size:13px}.account-nav :global(a),.module-nav :global(a){color:#eef5ef;text-decoration:none}.account-nav span{color:#cbd5ce}.module-nav{padding:0 22px 10px;gap:5px;overflow-x:auto}.module-nav :global(a){white-space:nowrap;padding:7px 11px;border-radius:7px;color:#d7e5d9}.module-nav :global(a:hover),.module-nav :global(a.active){background:#ffffff26;color:#fff}.account-nav button,.account-nav :global(.login-link){border:1px solid #ffffff4a;border-radius:7px;padding:7px 11px;background:transparent;color:#fff;cursor:pointer;font:inherit}.account-nav :global(.login-link){background:#fff;color:#17251e;font-weight:700}@media(max-width:620px){.account-nav span{display:none}.session-header__top,.module-nav{padding-inline:14px}}
    `}</style>
  </header>
}
