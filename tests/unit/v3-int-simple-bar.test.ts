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

describe('17 simple bar', () => {
  it('applies to /register only, not to the OTP, login or other pages', () => {
    expect(usesSimpleAuthBar('/register')).toBe(true)
    expect(usesSimpleAuthBar('/register/otp')).toBe(false)
    expect(usesSimpleAuthBar('/register/revise')).toBe(false)
    expect(usesSimpleAuthBar('/explore')).toBe(false)
  })
  it('shows the logo and "Đã có tài khoản? Đăng nhập", with no nav items', () => {
    const html = renderToStaticMarkup(React.createElement(SimpleAuthBar))
    expect(html).toContain('Hanoi Artisan Bridge')
    expect(html.replace(/<[^>]+>/g, '')).toContain('Đã có tài khoản? Đăng nhập')
    expect(html).toMatch(/href="\/login"[^>]*>Đăng nhập</)
    expect(html).not.toContain('Khám phá')
    expect(html).not.toContain('Đăng ký tài khoản')
  })
})
