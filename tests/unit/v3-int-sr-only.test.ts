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

describe('.sr-only', () => {
  it('is defined in the shared CSS and ReviewList no longer hides text inline', () => {
    expect(css('globals.css')).toMatch(/\.sr-only\s*\{[^}]*clip/)
    expect(readFileSync('src/app/admin/_v3/ReviewList.tsx', 'utf8')).not.toContain('left: -9999')
  })
})
