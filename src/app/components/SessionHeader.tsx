'use client'

// App shell navigation (design wave 3, Design System v9 §6b/§6d/§6e, Figma "Điều hướng"):
// - Guest / Agency / Provider: floating glass pill bar (64 px, 20 px from the edges; 56 px and 12 px on mobile),
//   collapsed into a menu button below 1,100 px, plus a bottom tab bar on phones for signed-in users.
// - Admin (UBND, HDT): glass sidebar 264 px; on phones a 56 px top bar and a bottom tab bar.
// Content per role comes from nav-model.ts (screen specs); styles live in src/app/shell.css.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Building2, CalendarDays, ChevronDown, CircleCheck, ClipboardList, Compass, KeyRound, LayoutGrid, LogOut, Menu,
  MessageSquare, ShieldCheck, Sparkles, Star, User, Users, X,
} from 'lucide-react'
import type { SessionContext } from '@/lib/auth/session'
import { accountLinks, activeHref, homeHref, initials, navItems, shellFor, tagline, type NavIcon, type NavItem } from './nav/nav-model'

const ICONS: Record<NavIcon, typeof Compass> = {
  compass: Compass, sparkles: Sparkles, clipboard: ClipboardList, calendar: CalendarDays, message: MessageSquare,
  grid: LayoutGrid, star: Star, building: Building2, check: CircleCheck, users: Users, key: KeyRound,
}

type Account = { full_name?: string; title?: string; organization?: string }

function roleLabel(session: SessionContext): string {
  if (session.role === 'ADMIN') return 'Quản trị viên'
  return session.role === 'Tour_Agency' ? 'Tour Agency' : 'Local Provider'
}

/** Keeps Tab inside `container` and closes on Escape (menu panel and dialogs). */
function trapKeys(event: React.KeyboardEvent<HTMLElement>, close: () => void) {
  if (event.key === 'Escape') { event.preventDefault(); close(); return }
  if (event.key !== 'Tab') return
  const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)'))
  const first = focusable[0], last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return <span className="shell-unread" aria-label={`${count} tin chưa đọc`}>{count > 99 ? '99+' : count}</span>
}

function NavLink({ item, active, unread, onNavigate, withIcon }: { item: NavItem; active: boolean; unread: number; onNavigate?: () => void; withIcon?: boolean }) {
  const Icon = ICONS[item.icon]
  return <Link href={item.href} aria-current={active ? 'page' : undefined} className={active ? 'is-active' : undefined} onClick={onNavigate}>
    {withIcon && <Icon aria-hidden="true" size={20} />}
    <span>{item.label}</span>
    {item.unread && <UnreadBadge count={unread} />}
  </Link>
}

export default function SessionHeader() {
  const [session, setSession] = useState<SessionContext | null>(null)
  const [account, setAccount] = useState<Account>({})
  const [unread, setUnread] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const menuButton = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    let alive = true
    fetch('/api/auth/session', { cache: 'no-store' }).then(r => r.json()).then(p => { if (alive) setSession(p.data.session) }).catch(() => { if (alive) setSession(null) })
    setMenuOpen(false); setUserMenuOpen(false)
    return () => { alive = false }
  }, [pathname])

  useEffect(() => {
    if (!session?.authenticated) { setAccount({}); setUnread(0); return }
    let alive = true
    fetch('/api/auth/account', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(p => { if (alive && p?.data) setAccount(p.data) }).catch(() => {})
    if (session.role === 'Tour_Agency' || session.role === 'Local_Provider') {
      fetch('/api/iac/chats', { cache: 'no-store' }).then(r => r.ok ? r.json() : null)
        .then(p => { if (alive && p?.data?.chat_list) setUnread((p.data.chat_list as Array<{ unread_count?: number }>).reduce((sum, chat) => sum + Number(chat.unread_count || 0), 0)) })
        .catch(() => {})
    }
    return () => { alive = false }
  }, [session, pathname])

  const closeMenu = useCallback(() => { setMenuOpen(false); menuButton.current?.focus() }, [])

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
  // AUT009 / REG115 use their own full-screen layout without the app bar (Figma "Màn 1").
  if (pathname === '/login' || pathname === '/register/otp') return null
  const shell = shellFor(session)
  const items = navItems(session)
  const current = activeHref(items, pathname)
  const links = accountLinks(session)
  const orgName = account.organization || (session.role === 'ADMIN' ? (session.adminType === 'HDT' ? 'Sở Du lịch Hà Nội' : 'UBND') : '')
  const who = session.role === 'Local_Provider' ? (account.full_name || orgName) : (orgName || account.full_name || '')
  const whoSub = session.role === 'Local_Provider' ? [account.title, orgName].filter(Boolean).join(', ') : (account.full_name && account.full_name !== who ? account.full_name : roleLabel(session))
  const avatar = initials(who || roleLabel(session))
  const logoutButton = (className: string, withText: boolean) => <button type="button" className={className} onClick={() => { setMenuOpen(false); setUserMenuOpen(false); setConfirmLogout(true) }} aria-label="Đăng xuất">
    <LogOut aria-hidden="true" size={20} />{withText && <span>Đăng xuất</span>}
  </button>

  const menuPanel = menuOpen && <div className="shell-menu glass-menu" role="dialog" aria-modal="true" aria-label="Menu" onKeyDown={event => trapKeys(event, closeMenu)}>
    <div className="shell-menu__head"><strong>Menu</strong><button type="button" className="shell-icon-button" autoFocus onClick={closeMenu} aria-label="Đóng menu"><X aria-hidden="true" size={22} /></button></div>
    {session.authenticated && <p className="shell-menu__who">{[who, whoSub].filter(Boolean).join(' · ')}</p>}
    <nav aria-label="Điều hướng chính">{items.map(item => <NavLink key={item.href} item={item} active={current === item.href} unread={unread} onNavigate={() => setMenuOpen(false)} />)}</nav>
    {session.authenticated
      ? <div className="shell-menu__account">{links.map(link => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.icon === 'user' ? <User aria-hidden="true" size={20} /> : <Building2 aria-hidden="true" size={20} />}<span>{link.label}</span></Link>)}{logoutButton('shell-menu__logout', true)}</div>
      : <div className="shell-menu__account"><Link href="/login" onClick={() => setMenuOpen(false)}>Đăng nhập</Link><Link href="/register" onClick={() => setMenuOpen(false)}>Đăng ký Agency</Link></div>}
  </div>

  const bottomBar = session.authenticated && items.length > 1 && <nav className="shell-tabbar" aria-label="Điều hướng nhanh">
    {items.map(item => { const Icon = ICONS[item.icon]; const active = current === item.href; return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={active ? 'is-active' : undefined}>
      <span className="shell-tabbar__icon"><Icon aria-hidden="true" size={22} />{item.unread && <UnreadBadge count={unread} />}</span><span>{item.short || item.label}</span>
    </Link> })}
  </nav>

  const logoutDialog = confirmLogout && <div className="logout-overlay" onClick={() => { if (!loggingOut) setConfirmLogout(false) }}>
    <div role="dialog" aria-modal="true" aria-labelledby="logout-title" className="logout-dialog glass-menu" onClick={event => event.stopPropagation()} onKeyDown={event => { if (!loggingOut) trapKeys(event, () => setConfirmLogout(false)) }}>
      <h2 id="logout-title">Đăng xuất?</h2><p>Bạn sẽ cần đăng nhập lại để tiếp tục.</p>{logoutError && <p role="alert">{logoutError}</p>}
      <div><button autoFocus type="button" disabled={loggingOut} onClick={() => setConfirmLogout(false)}>Huỷ</button><button type="button" disabled={loggingOut} onClick={logout}>{loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</button></div>
    </div>
  </div>

  if (shell === 'admin') {
    return <>
      <aside className="shell-sidebar glass-sidebar" aria-label="Điều hướng quản trị">
        <Link href={homeHref(session)} className="shell-logo"><strong>Hanoi Artisan Bridge</strong><small>{tagline(session)}</small></Link>
        <nav>{items.map(item => <NavLink key={item.href} item={item} active={current === item.href} unread={0} withIcon />)}</nav>
        <div className="shell-sidebar__foot">
          <Link href="/account" className="shell-avatar" aria-label="Tài khoản cá nhân">{avatar}</Link>
          <span><strong>{who}</strong><small>Quản trị viên</small></span>
          {logoutButton('shell-round-button', false)}
        </div>
      </aside>
      <header className="shell-topbar glass-nav">
        <Link href={homeHref(session)} className="shell-logo"><strong>Hanoi Artisan Bridge</strong></Link>
        <button ref={menuButton} type="button" className="shell-icon-button" aria-expanded={menuOpen} aria-label="Mở menu" onClick={() => setMenuOpen(true)}><Menu aria-hidden="true" size={24} /></button>
      </header>
      {menuPanel}{bottomBar}{logoutDialog}
    </>
  }

  return <>
    <header className={`shell-bar glass-nav${shell === 'guest' ? ' shell-bar--guest' : ''}`}>
      <Link href={homeHref(session)} className="shell-logo"><strong>Hanoi Artisan Bridge</strong>{shell === 'portal' && <small>{tagline(session)}</small>}</Link>
      <nav className="shell-bar__items" aria-label="Điều hướng chính">{items.map(item => <NavLink key={item.href} item={item} active={current === item.href} unread={unread} />)}</nav>
      <div className="shell-bar__end">
        {shell === 'guest'
          ? <><Link href="/login" className="shell-pill shell-pill--outline">Đăng nhập</Link><Link href="/register" className="shell-pill shell-pill--solid">Đăng ký Agency</Link></>
          : <div className="shell-user">
              <button type="button" className="shell-user__button" aria-expanded={userMenuOpen} aria-haspopup="menu" onClick={() => setUserMenuOpen(open => !open)}>
                <span className="shell-user__text"><strong>{who}{session.role === 'Local_Provider' && <ShieldCheck aria-label="Tài khoản Local Provider" size={16} />}</strong><small>{whoSub}</small></span>
                <span className="shell-avatar" aria-hidden="true">{avatar}</span><ChevronDown aria-hidden="true" size={18} />
              </button>
              {userMenuOpen && <div className="shell-user__menu glass-menu" role="menu" onKeyDown={event => trapKeys(event, () => setUserMenuOpen(false))}>
                {links.map(link => <Link key={link.href} role="menuitem" href={link.href} onClick={() => setUserMenuOpen(false)}>{link.icon === 'user' ? <User aria-hidden="true" size={18} /> : <Building2 aria-hidden="true" size={18} />}<span>{link.label}</span></Link>)}
                {logoutButton('shell-user__logout', true)}
              </div>}
            </div>}
        <button ref={menuButton} type="button" className="shell-icon-button shell-bar__menu" aria-expanded={menuOpen} aria-label="Mở menu" onClick={() => setMenuOpen(true)}><Menu aria-hidden="true" size={24} /></button>
      </div>
    </header>
    {menuPanel}{bottomBar}{logoutDialog}
  </>
}
