/**
 * UI v3 integration (21/11), Step 2 item 3: "Duyệt hồ sơ" navigation for HDT and UBND.
 * Source: hab-mockup-v3 png/38 (Admin), human decisions 2026-11-18 / 2026-11-19.
 * HDT "Duyệt hồ sơ" → /admin/agencies and stays selected on /admin/providers;
 * UBND "Duyệt hồ sơ" → /admin/providers and stays selected on /admin/agencies.
 */
import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { SessionContext } from '@/lib/auth/session'
import AppHeader from '@/app/components/header/AppHeader'
import { activeHref, navItems } from '@/app/components/nav/nav-model'

;(globalThis as { React?: typeof React }).React = React

const base: SessionContext = {
  authenticated: true,
  userId: 'u-admin',
  role: 'ADMIN',
  adminType: null,
  agencyId: null,
  providerId: null,
  assignedVillageId: null,
  permissions: ['manage_users'],
  dataScope: null,
}
const hdt: SessionContext = { ...base, adminType: 'HDT' }
const ubnd: SessionContext = { ...base, adminType: 'UBND', assignedVillageId: 'v-1' }

describe('"Duyệt hồ sơ" has one destination per admin type and stays selected on both lists', () => {
  for (const [name, session, href] of [['HDT', hdt, '/admin/agencies'], ['UBND', ubnd, '/admin/providers']] as const) {
    it(`${name}: single link ${href}, active on /admin/agencies/* and /admin/providers/*`, () => {
      const items = navItems(session)
      expect(items.filter(item => item.label === 'Duyệt hồ sơ').map(item => item.href)).toEqual([href])
      for (const path of ['/admin/agencies', '/admin/agencies/a-1', '/admin/providers', '/admin/providers/p-1']) {
        expect(activeHref(items, path), path).toBe(href)
      }
      expect(activeHref(items, '/admin/users')).toBe('/admin/users')
    })

    it(`${name}: AppHeader renders "Duyệt hồ sơ" as active link across review lists and detail pages`, () => {
      for (const path of ['/admin/agencies', '/admin/agencies/a-1', '/admin/providers', '/admin/providers/p-1']) {
        const html = renderToStaticMarkup(React.createElement(AppHeader, { session, pathname: path }))
        const link = [...html.matchAll(/<a\b[^>]*>[^<]*Duyệt hồ sơ<\/a>/g)].map(m => m[0])[0] ?? ''
        expect(link, `${name} link at ${path}`).toContain(`href="${href}"`)
        expect(link, `${name} active state at ${path}`).toContain('aria-current="page"')
        expect(link, `${name} active class at ${path}`).toContain('is-active')
      }

      // On another page (/admin/users), Duyệt hồ sơ must NOT be active, and Quản lý tài khoản is active
      const usersHtml = renderToStaticMarkup(React.createElement(AppHeader, { session, pathname: '/admin/users' }))
      const linkOnUsers = [...usersHtml.matchAll(/<a\b[^>]*>[^<]*Duyệt hồ sơ<\/a>/g)].map(m => m[0])[0] ?? ''
      expect(linkOnUsers).not.toContain('aria-current="page"')
      expect(linkOnUsers).not.toContain('is-active')

      const usersLink = [...usersHtml.matchAll(/<a\b[^>]*>[^<]*Quản lý tài khoản<\/a>/g)].map(m => m[0])[0] ?? ''
      expect(usersLink).toContain('href="/admin/users"')
      expect(usersLink).toContain('aria-current="page"')
      expect(usersLink).toContain('is-active')
    })
  }
})
