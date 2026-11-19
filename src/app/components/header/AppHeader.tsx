'use client'

// Shared app header, mockup v3: one full-width bar (68 px, content in the 1100 px frame) with four variants.
// Guest png/01, Tour Agency png/21, Local Provider png/29 (bar #0F3D2A); Admin HDT/UBND png/38 (bar #1F2A25, replaces
// the old sidebar). Account menu png/20, logout confirmation png/20a. Items come from nav-model.ts; styles: header.css.
// Pure props (no fetching) so it renders in tests; SessionHeader supplies session, account and unread count.
import Link from 'next/link'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { BriefcaseBusiness, ChevronDown, ChevronUp, LogOut, Menu, MessageSquareText, User, X } from 'lucide-react'
import type { SessionContext } from '@/lib/auth/session'
import { accountLinks, activeHref, headerVariant, homeHref, initials, navItems } from '../nav/nav-model'
import { buttonClass } from '../ui/Button'
import Modal from '../ui/Modal'

export type HeaderAccount = { full_name?: string; title?: string; organization?: string }

export default function AppHeader({ session, pathname, account = {}, unread = 0, accountMenuOpen = false }: {
  session: SessionContext | null; pathname: string; account?: HeaderAccount; unread?: number
  /** Initial state of the account menu (tests render it open). */
  accountMenuOpen?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(accountMenuOpen)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const menuButton = useRef<HTMLButtonElement>(null)
  const chipButton = useRef<HTMLButtonElement>(null)
  const accountBox = useRef<HTMLDivElement>(null)

  const firstPath = useRef(pathname)
  useEffect(() => { if (pathname === firstPath.current) return; firstPath.current = pathname; setMenuOpen(false); setAccountOpen(false) }, [pathname])
  useEffect(() => {
    if (!accountOpen) return
    const outside = (event: MouseEvent) => { if (!accountBox.current?.contains(event.target as Node)) setAccountOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setAccountOpen(false); chipButton.current?.focus() } }
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape) }
  }, [accountOpen])
  const closeMenu = useCallback(() => { setMenuOpen(false); menuButton.current?.focus() }, [])

  const variant = headerVariant(session)
  const items = navItems(session)
  const current = activeHref(items, pathname)
  const links = accountLinks(session)
  const signedIn = Boolean(session?.authenticated)
  const org = account.organization || (variant === 'admin' ? (session?.adminType === 'HDT' ? 'Sở Du lịch Hà Nội' : 'UBND') : '')
  const chipName = org || account.full_name || ''
  const avatar = initials((variant === 'provider' ? account.full_name || org : org || account.full_name) || '')
  const unreadLabel = unread > 0 ? `Tin nhắn, ${unread} tin chưa đọc` : 'Tin nhắn'

  async function logout() {
    setLoggingOut(true); setLogoutError('')
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Logout failed')
      sessionStorage.clear()
      window.location.assign('/login')
    } catch { setLogoutError('Không thể đăng xuất. Vui lòng thử lại.'); setLoggingOut(false) }
  }
  const askLogout = () => { setMenuOpen(false); setAccountOpen(false); setConfirmLogout(true) }

  function menuKeys(event: React.KeyboardEvent<HTMLElement>, close: () => void) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const entries = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    const at = entries.indexOf(document.activeElement as HTMLElement)
    event.preventDefault()
    entries[(at + (event.key === 'ArrowDown' ? 1 : -1) + entries.length) % entries.length]?.focus()
  }

  const navLinks = (onNavigate?: () => void) => items.map(item => {
    const active = current === item.href
    return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={active ? 'is-active' : undefined} onClick={onNavigate}>{item.label}</Link>
  })

  return <>
    <header className={`hab-nav ${variant === 'admin' ? 'hab-nav--admin' : 'hab-nav--green'}`}>
      {variant === 'admin'
        ? <span className="hab-nav__brand hab-nav__brand--admin">HAB · Quản trị</span>
        : <Link href={homeHref(session)} className={`hab-nav__brand${variant === 'guest' ? ' hab-nav__brand--guest' : ''}`}>Hanoi Artisan Bridge</Link>}
      <nav className="hab-nav__items" aria-label={variant === 'admin' ? 'Điều hướng quản trị' : 'Điều hướng chính'}>{navLinks()}</nav>
      <div className="hab-nav__end">
        {variant === 'guest' && <>
          <Link href="/login" className="hab-nav__login">Đăng nhập</Link>
          <Link href="/register" className={buttonClass('white', 'md', 'hab-nav__register')}>Đăng ký tài khoản</Link>
        </>}
        {signedIn && variant !== 'admin' && <Link href="/messages" aria-label={unreadLabel} title="Tin nhắn" className="hab-nav__msg">
          <MessageSquareText aria-hidden="true" size={22} />
          {unread > 0 && <span className="hab-nav__badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
        </Link>}
        {signedIn && <div className="hab-account" ref={accountBox}>
          {variant === 'admin'
            // Admin (human decision 2026-11-18): the unit name is the menu button, with an arrow.
            ? <button ref={chipButton} type="button" className="hab-nav__org" aria-haspopup="menu" aria-expanded={accountOpen} onClick={() => setAccountOpen(open => !open)}>
                <span className="hab-nav__org-name">{org}</span>
                {accountOpen ? <ChevronUp className="hab-nav__caret" aria-hidden="true" size={18} /> : <ChevronDown className="hab-nav__caret" aria-hidden="true" size={18} />}
              </button>
            : <button ref={chipButton} type="button" className="hab-chip" aria-haspopup="menu" aria-expanded={accountOpen} onClick={() => setAccountOpen(open => !open)}>
                <span className="hab-chip__avatar" aria-hidden="true">{avatar}</span>
                <span className="hab-chip__name">{chipName}</span>
                <span className="hab-chip__caret" aria-hidden="true">{accountOpen ? '▴' : '▾'}</span>
              </button>}
          {accountOpen && <div className="hab-account__menu" role="menu" aria-label="Tài khoản"
            onKeyDown={event => menuKeys(event, () => { setAccountOpen(false); chipButton.current?.focus() })}>
            <div className="hab-account__who"><p className="hab-account__person">{account.full_name || chipName}</p>{org && <p className="hab-account__org">{org}</p>}</div>
            {links.map((link, index) => <Link key={link.href} role="menuitem" href={link.href} className="hab-account__item" autoFocus={index === 0} onClick={() => setAccountOpen(false)}>
              {index === 0 ? <User aria-hidden="true" size={20} /> : <BriefcaseBusiness aria-hidden="true" size={20} />}{link.label}
            </Link>)}
            <div className="hab-account__divider" role="separator" />
            <button type="button" role="menuitem" className="hab-account__item hab-account__item--danger" onClick={askLogout}>
              <LogOut aria-hidden="true" size={20} />Đăng xuất
            </button>
          </div>}
        </div>}
        <button ref={menuButton} type="button" className="hab-nav__burger" aria-expanded={menuOpen} aria-label="Mở menu" onClick={() => setMenuOpen(true)}>
          <Menu aria-hidden="true" size={24} />
        </button>
      </div>
    </header>

    {/* Below 900 px the items collapse into this panel (human decision 2026-11-18; the mockup has no phone frame). */}
    {menuOpen && <div className="hab-menu" role="dialog" aria-modal="true" aria-label="Menu" onKeyDown={event => menuKeys(event, closeMenu)}>
      <div className="hab-menu__head"><strong>Menu</strong>
        <button type="button" className="hab-menu__close" autoFocus onClick={closeMenu} aria-label="Đóng menu"><X aria-hidden="true" size={22} /></button>
      </div>
      <nav aria-label="Điều hướng chính (thu gọn)">{navLinks(() => setMenuOpen(false))}</nav>
      <div className="hab-menu__account">
        {!signedIn && <><Link href="/login" onClick={() => setMenuOpen(false)}>Đăng nhập</Link><Link href="/register" onClick={() => setMenuOpen(false)}>Đăng ký tài khoản</Link></>}
        {signedIn && variant !== 'admin' && <Link href="/messages" onClick={() => setMenuOpen(false)}>{unreadLabel}</Link>}
        {links.map(link => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</Link>)}
        {signedIn && <button type="button" className="hab-menu__logout" onClick={askLogout}>Đăng xuất</button>}
      </div>
    </div>}

    <Modal open={confirmLogout} onClose={() => setConfirmLogout(false)} closeDisabled={loggingOut} tone="danger" width={460}
      title="Đăng xuất khỏi tài khoản?" icon={<LogOut size={28} />}
      actions={<button type="button" className={buttonClass('danger')} disabled={loggingOut} onClick={logout} data-autofocus>{loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</button>}>
      <p>Bạn sẽ cần đăng nhập lại để xem giá, tin nhắn và đặt chỗ.</p>
      {logoutError && <p role="alert" className="hab-modal__error">{logoutError}</p>}
    </Modal>
  </>
}
