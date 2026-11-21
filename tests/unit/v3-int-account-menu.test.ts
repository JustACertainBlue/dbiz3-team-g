/**
 * UI v3 integration (21/11), Step 2 items 1-4: screen 17 bar, account menu 20 / logout popup 20a, "Duyệt hồ sơ" nav, .sr-only.
 * Source of the expectations: hab-mockup-v3/source DangKyDaiLy, MenuDangXuat, DangXuatPopup.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { SessionContext } from '@/lib/auth/session'
import AppHeader from '@/app/components/header/AppHeader'
import SimpleAuthBar, { usesSimpleAuthBar } from '@/app/components/header/SimpleAuthBar'
import { activeHref, navItems } from '@/app/components/nav/nav-model'

;(globalThis as { React?: typeof React }).React = React
const css = (file: string) => readFileSync(`src/app/${file}`, 'utf8')
const base: SessionContext = { authenticated: true, userId: 'u', role: null, adminType: null, agencyId: null, providerId: null, assignedVillageId: null, permissions: [], dataScope: null }
const agency: SessionContext = { ...base, role: 'Tour_Agency', agencyId: 'ag-1' }
const hdt: SessionContext = { ...base, role: 'ADMIN', adminType: 'HDT' }
const ubnd: SessionContext = { ...base, role: 'ADMIN', adminType: 'UBND', assignedVillageId: 'v-1' }

describe('20 / 20a account menu and logout popup', () => {
  const html = renderToStaticMarkup(React.createElement(AppHeader, { session: agency, pathname: '/explore', account: { full_name: 'Lý Gia Hân', organization: 'Công ty Du lịch Tràng An' }, accountMenuOpen: true }))
  it('menu: person, organisation, Tài khoản của tôi, Doanh nghiệp của tôi, Đăng xuất', () => {
    const text = html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|')
    expect(text).toContain('Lý Gia Hân|Công ty Du lịch Tràng An|Tài khoản của tôi|Doanh nghiệp của tôi|Đăng xuất')
  })
  it('menu items: 48 px high, icons #4B5851 (danger item keeps its colour)', () => {
    const shell = css('shell.css')
    expect(shell).toMatch(/\.hab-account__item\s*\{[^}]*min-height:\s*48px/)
    expect(shell).toMatch(/\.hab-account__item svg\s*\{[^}]*color:\s*var\(--c-text-3\)/)
    expect(shell).toMatch(/\.hab-account__item--danger svg\s*\{[^}]*color:\s*inherit/)
  })
  it('logout popup text wraps in 285 px as in the mockup', () => {
    expect(readFileSync('src/app/components/header/AppHeader.tsx', 'utf8')).toContain('hab-modal__lead')
    expect(css('components/ui/ui.css')).toMatch(/\.hab-modal__lead\s*\{[^}]*width:\s*285px/)
  })
})
