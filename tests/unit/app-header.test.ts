/**
 * UI v3 foundation (Đợt 0): one shared header with four variants taken from the session.
 * Source: hab-mockup-v3 png/01 (Guest), png/21 (Tour Agency), png/29 (Local Provider), png/38 (Admin HDT/UBND),
 * png/20 (account menu) and png/20a (logout confirmation). Human decisions 2026-11-18; 2026-11-19 (new mockup pack):
 * Tour Agency bar Khám phá · Lịch sử đặt chỗ · Lịch (SCH141) · Ghép tour AI (png/05, png/27); provider and admin unchanged;
 * HDT "Duyệt hồ sơ" → /admin/agencies and stays selected on /admin/providers; UBND "Duyệt hồ sơ" → /admin/providers;
 * guest button label "Đăng ký tài khoản"; bar colour #0F3D2A (guest, agency, provider) and #1F2A25 (admin).
 */
import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { SessionContext } from '@/lib/auth/session'
import AppHeader, { type HeaderAccount } from '@/app/components/header/AppHeader'
import { accountLinks, footerVisible, headerVariant, navItems } from '@/app/components/nav/nav-model'

;(globalThis as { React?: typeof React }).React = React

const AG = 'ag-1'
const PV = 'pv-1'
const base: SessionContext = {
  authenticated: true, userId: 'u-1', role: null, adminType: null, agencyId: null, providerId: null,
  assignedVillageId: null, permissions: [], dataScope: null,
}
const guest: SessionContext = { ...base, authenticated: false, userId: null }
const agency: SessionContext = { ...base, role: 'Tour_Agency', agencyId: AG }
const provider: SessionContext = { ...base, role: 'Local_Provider', providerId: PV }
const hdt: SessionContext = { ...base, role: 'ADMIN', adminType: 'HDT' }
const ubnd: SessionContext = { ...base, role: 'ADMIN', adminType: 'UBND', assignedVillageId: 'v-1' }

function render(session: SessionContext, pathname: string, account: HeaderAccount = {}, unread = 0, accountMenuOpen = false) {
  return renderToStaticMarkup(React.createElement(AppHeader, { session, pathname, account, unread, accountMenuOpen }))
}

/** Text of every item in the open account menu. */
function menuItems(html: string) {
  const menu = html.match(/<div[^>]*role="menu"[^>]*>([\s\S]*)<\/div>/)?.[1] ?? ''
  return [...menu.matchAll(/<(a|button)\b([^>]*role="menuitem"[^>]*)>([\s\S]*?)<\/\1>/g)].map(m => [
    m[2].match(/href="([^"]+)"/)?.[1] ?? null, m[3].replace(/<[^>]+>/g, ''),
  ])
}

/** Opening tag of the first <a> whose href is `href` (attribute order independent). */
const linkTag = (html: string, href: string) => [...html.matchAll(/<a\b[^>]*>/g)].map(m => m[0]).find(tag => tag.includes(`href="${href}"`)) ?? ''

/** [href, text, selected] of every link in the main navigation list. */
function mainNav(html: string) {
  const nav = html.match(/<nav[^>]*class="hab-nav__items"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? ''
  return [...nav.matchAll(/<a([^>]*)>([^<]+)<\/a>/g)].map(m => [
    m[1].match(/href="([^"]+)"/)?.[1], m[2], /aria-current="page"/.test(m[1]),
  ])
}

describe('headerVariant', () => {
  it('maps the session to the four mockup variants', () => {
    expect(headerVariant(null)).toBe('guest')
    expect(headerVariant(guest)).toBe('guest')
    expect(headerVariant(agency)).toBe('agency')
    expect(headerVariant(provider)).toBe('provider')
    expect(headerVariant(hdt)).toBe('admin')
    expect(headerVariant(ubnd)).toBe('admin')
  })
})

describe('Guest (png/01)', () => {
  const html = render(guest, '/explore')
  it('shows the logo and only "Khám phá", selected on /explore', () => {
    expect(html).toContain('Hanoi Artisan Bridge')
    expect(mainNav(html)).toEqual([['/explore', 'Khám phá', true]])
  })
  it('keeps "Khám phá" selected on the village pages 03 (png/03) and 03a (png/03a)', () => {
    expect(mainNav(render(guest, '/villages'))).toEqual([['/explore', 'Khám phá', true]])
    expect(mainNav(render(guest, '/village/v-1'))).toEqual([['/explore', 'Khám phá', true]])
  })
  it('shows "Đăng nhập" and the white "Đăng ký tài khoản" button on the right', () => {
    expect(html).toMatch(/<a[^>]*href="\/login"[^>]*>Đăng nhập<\/a>/)
    expect(linkTag(html, '/register')).toMatch(/class="[^"]*hab-btn--white/)
    expect(html).toMatch(/href="\/register"[^>]*>Đăng ký tài khoản<\/a>/)
  })
  it('has no message button and no account chip', () => {
    expect(html).not.toContain('Tin nhắn')
    expect(html).not.toContain('hab-chip')
  })
  it('uses the green bar', () => {
    expect(html).toMatch(/<header[^>]*class="[^"]*hab-nav--green/)
  })
})

describe('Tour Agency (png/21)', () => {
  const account = { full_name: 'Lý Gia Hân', organization: 'Du lịch Tràng An' }
  it('shows Khám phá · Lịch sử đặt chỗ · Lịch · Ghép tour AI (Lịch → SCH141)', () => {
    expect(mainNav(render(agency, '/explore', account))).toEqual([
      ['/explore', 'Khám phá', true],
      [`/agency/${AG}/bookings`, 'Lịch sử đặt chỗ', false],
      [`/agency/${AG}/schedule`, 'Lịch', false],
      ['/ai-matching', 'Ghép tour AI', false],
    ])
  })
  it('selects "Lịch sử đặt chỗ" on a booking detail page and "Ghép tour AI" on /ai-matching', () => {
    expect(mainNav(render(agency, `/agency/${AG}/bookings/b-1`, account)).map(i => i[2])).toEqual([false, true, false, false])
    expect(mainNav(render(agency, '/ai-matching', account)).map(i => i[2])).toEqual([false, false, false, true])
  })
  it('selects "Khám phá" on the village pages 03 and 03a (pack 19/11)', () => {
    expect(mainNav(render(agency, '/villages', account)).map(i => i[2])).toEqual([true, false, false, false])
    expect(mainNav(render(agency, '/village/v-1', account)).map(i => i[2])).toEqual([true, false, false, false])
  })
  it('selects "Lịch" on the schedule page (png/27)', () => {
    expect(mainNav(render(agency, `/agency/${AG}/schedule`, account)).map(i => i[2])).toEqual([false, false, true, false])
  })
  it('has a round message button with an aria-label and the unread count', () => {
    const html = render(agency, '/explore', account, 2)
    expect(linkTag(html, '/messages')).toContain('aria-label="Tin nhắn, 2 tin chưa đọc"')
    expect(html).toMatch(/class="hab-nav__badge"[^>]*>2</)
  })
  it('hides the badge when nothing is unread', () => {
    const html = render(agency, '/explore', account, 0)
    expect(linkTag(html, '/messages')).toContain('aria-label="Tin nhắn"')
    expect(html).not.toContain('hab-nav__badge')
  })
  it('shows the account chip with initials and the organisation name', () => {
    const html = render(agency, '/explore', account)
    expect(html).toMatch(/<button[^>]*class="hab-chip"[^>]*aria-haspopup="menu"[^>]*aria-expanded="false"/)
    // Mockup: "TA" for "Du lịch Tràng An" (initials of the last two words of the organisation).
    expect(html).toMatch(/hab-chip__avatar[^>]*>TA</)
    expect(html).toContain('Du lịch Tràng An')
  })
  it('does not render the Guest buttons', () => {
    expect(render(agency, '/explore', account)).not.toContain('Đăng ký tài khoản')
  })
})

describe('Local Provider (png/29)', () => {
  const account = { full_name: 'Nguyễn Anh Thư', organization: 'Xưởng thủ công Bát Tràng' }
  it('shows Tổng quan · Trải nghiệm · Lịch sử đặt chỗ, with Tổng quan selected on the dashboard', () => {
    expect(mainNav(render(provider, `/provider/${PV}/dashboard`, account))).toEqual([
      [`/provider/${PV}/dashboard`, 'Tổng quan', true],
      [`/provider/${PV}/experiences`, 'Trải nghiệm', false],
      [`/provider/${PV}/bookings`, 'Lịch sử đặt chỗ', false],
    ])
  })
  it('selects "Trải nghiệm" on an experience page and "Lịch sử đặt chỗ" on a booking page', () => {
    expect(mainNav(render(provider, `/provider/${PV}/experiences/e-1/edit`, account)).map(i => i[2])).toEqual([false, true, false])
    expect(mainNav(render(provider, `/provider/${PV}/bookings/new`, account)).map(i => i[2])).toEqual([false, false, true])
  })
  it('has the message button and the account chip, on the green bar', () => {
    const html = render(provider, `/provider/${PV}/dashboard`, account, 3)
    expect(html).toMatch(/aria-label="Tin nhắn, 3 tin chưa đọc"/)
    expect(html).toContain('Xưởng thủ công Bát Tràng')
    // Mockup: "AT" for chị Anh Thư (initials of the last two words of the person's name).
    expect(html).toMatch(/hab-chip__avatar[^>]*>AT</)
    expect(html).toMatch(/<header[^>]*class="[^"]*hab-nav--green/)
  })
})

describe('Admin (png/38)', () => {
  it('HDT: "HAB · Quản trị", Tổng quan · Duyệt hồ sơ · Quản lý tài khoản, organisation on the right, dark bar', () => {
    const html = render(hdt, '/admin', { organization: 'Sở Du lịch Hà Nội' })
    expect(html).toContain('HAB · Quản trị')
    expect(mainNav(html)).toEqual([
      ['/admin', 'Tổng quan', true],
      ['/admin/agencies', 'Duyệt hồ sơ', false],
      ['/admin/users', 'Quản lý tài khoản', false],
    ])
    expect(html).toMatch(/class="hab-nav__org-name"[^>]*>Sở Du lịch Hà Nội</)
    expect(html).toMatch(/<header[^>]*class="[^"]*hab-nav--admin/)
    expect(html).not.toContain('hab-chip__avatar')
    expect(html).not.toContain('href="/messages"')
  })
  it('HDT: "Duyệt hồ sơ" stays selected on /admin/providers and its detail page', () => {
    expect(mainNav(render(hdt, '/admin/providers', {})).map(i => i[2])).toEqual([false, true, false])
    expect(mainNav(render(hdt, '/admin/providers/p-1', {})).map(i => i[2])).toEqual([false, true, false])
    expect(mainNav(render(hdt, '/admin/agencies', {})).map(i => i[2])).toEqual([false, true, false])
  })
  it('HDT: "Quản lý tài khoản" is selected on /admin/users', () => {
    expect(mainNav(render(hdt, '/admin/users', {})).map(i => i[2])).toEqual([false, false, true])
  })
  it('UBND: "Duyệt hồ sơ" goes to /admin/providers', () => {
    const html = render(ubnd, '/admin/providers', { organization: 'UBND xã Bát Tràng' })
    expect(mainNav(html)).toEqual([
      ['/admin', 'Tổng quan', false],
      ['/admin/providers', 'Duyệt hồ sơ', true],
      ['/admin/users', 'Quản lý tài khoản', false],
    ])
    expect(html).toMatch(/class="hab-nav__org-name"[^>]*>UBND xã Bát Tràng</)
  })
  it('HDT without an organisation from the account API shows "Sở Du lịch Hà Nội"', () => {
    expect(render(hdt, '/admin', { organization: '' })).toMatch(/class="hab-nav__org-name"[^>]*>Sở Du lịch Hà Nội</)
  })
  it('the organisation name is a menu button with an arrow (human decision 2026-11-18)', () => {
    const html = render(hdt, '/admin', { organization: 'Sở Du lịch Hà Nội' })
    expect(html).toMatch(/<button[^>]*class="hab-nav__org"[^>]*aria-haspopup="menu"[^>]*aria-expanded="false"/)
    // Updated png/38 (18/11): chevron icon after the name.
    expect(html).toMatch(/<svg[^>]*class="[^"]*hab-nav__caret/)
  })
  it('the open admin menu has exactly Tài khoản của tôi (/account) and Đăng xuất', () => {
    const html = render(ubnd, '/admin', { full_name: 'Hoàng Thùy Linh', organization: 'UBND xã Hạ Thái' }, 0, true)
    expect(html).toMatch(/aria-expanded="true"/)
    expect(menuItems(html)).toEqual([['/account', 'Tài khoản của tôi'], [null, 'Đăng xuất']])
  })
  it('replaces the old sidebar', () => {
    expect(render(hdt, '/admin', {})).not.toContain('shell-sidebar')
  })
})

describe('Account menu (png/20)', () => {
  it('Agency: Tài khoản của tôi · Doanh nghiệp của tôi (company profile)', () => {
    expect(accountLinks(agency)).toEqual([
      { href: '/account', label: 'Tài khoản của tôi' },
      { href: `/agency/${AG}`, label: 'Doanh nghiệp của tôi' },
    ])
  })
  it('Provider: "Doanh nghiệp của tôi" opens the workshop profile', () => {
    expect(accountLinks(provider)).toEqual([
      { href: '/account', label: 'Tài khoản của tôi' },
      { href: `/provider/${PV}`, label: 'Doanh nghiệp của tôi' },
    ])
  })
  it('Guest has no account menu; Admin has only Tài khoản của tôi', () => {
    expect(accountLinks(guest)).toEqual([])
    expect(accountLinks(hdt)).toEqual([{ href: '/account', label: 'Tài khoản của tôi' }])
    expect(accountLinks(ubnd)).toEqual([{ href: '/account', label: 'Tài khoản của tôi' }])
  })
  it('the open Agency menu keeps the png/20 order', () => {
    const html = render(agency, '/explore', { full_name: 'Lý Gia Hân', organization: 'Du lịch Tràng An' }, 0, true)
    expect(menuItems(html)).toEqual([['/account', 'Tài khoản của tôi'], [`/agency/${AG}`, 'Doanh nghiệp của tôi'], [null, 'Đăng xuất']])
  })
})

describe('navItems', () => {
  it('Guest has only Khám phá', () => {
    expect(navItems(guest).map(i => i.label)).toEqual(['Khám phá'])
  })
})

describe('footerVisible (footer only on /explore for Guest and Tour Agency)', () => {
  it('is true for Guest and Agency on /explore only', () => {
    expect(footerVisible(guest, '/explore')).toBe(true)
    expect(footerVisible(null, '/explore')).toBe(true)
    expect(footerVisible(agency, '/explore')).toBe(true)
    expect(footerVisible(agency, '/explore/experiences/x')).toBe(false)
    expect(footerVisible(guest, '/login')).toBe(false)
  })
  it('is false for Provider and Admin, even on /explore', () => {
    expect(footerVisible(provider, '/explore')).toBe(false)
    expect(footerVisible(hdt, '/explore')).toBe(false)
    expect(footerVisible(ubnd, '/explore')).toBe(false)
  })
})
