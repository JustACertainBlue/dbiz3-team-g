/**
 * Issue #253 — a Guest lands on EXP120 Explore, not on AUT009 Login, and Login / OTP show the Guest navigation.
 * screen-spec-AUT009.md:15 "Guests are redirected here when attempting a restricted action."; shared navigation
 * (screen-spec-AUT009.md:52) "Guest has EXP120 and AUT009/REG003, with no AI navigation."; EXP120 = public discovery.
 * Signed-in users keep the F-AUTH-08 routing (spec-AUT.md:366) exactly as before.
 */
import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

;(globalThis as { React?: typeof React }).React = React

const cookie = vi.hoisted(() => ({ account: 'guest' }))
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => ({ value: cookie.account }) }) }))
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw new Error(`REDIRECT ${to}`) } }))

import HomePage from '@/app/page'
import AuthShell from '@/app/components/AuthShell'
import { guestNavLinks } from '@/app/components/nav/nav-model'

const landing = async (account: string) => {
  cookie.account = account
  try { await HomePage(); return 'no redirect' } catch (error) { return (error as Error).message }
}

describe('#253 | "/" landing', () => {
  it('a Guest goes to /explore (EXP120)', async () => {
    expect(await landing('guest')).toBe('REDIRECT /explore')
  })

  it('signed-in users keep their routing', async () => {
    expect(await landing('agency')).toBe('REDIRECT /explore')
    expect(await landing('provider')).toMatch(/^REDIRECT \/provider\/[0-9a-f-]+\/dashboard$/)
    expect(await landing('hdt')).toBe('REDIRECT /admin')
    expect(await landing('ubnd')).toBe('REDIRECT /admin/providers')
  })
})

describe('#253 | Guest navigation on Login / OTP', () => {
  it('guestNavLinks are Khám phá · Đăng nhập · Đăng ký Agency, with no AI entry', () => {
    expect(guestNavLinks()).toEqual([
      { href: '/explore', label: 'Khám phá' },
      { href: '/login', label: 'Đăng nhập' },
      { href: '/register', label: 'Đăng ký Agency' },
    ])
  })

  it('AuthShell (AUT009, REG115) renders that navigation', () => {
    const html = renderToStaticMarkup(React.createElement(AuthShell, { title: 'Đăng nhập', children: null }))
    const nav = html.match(/<nav[^>]*aria-label="Điều hướng"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? ''
    expect([...nav.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(m => [m[1], m[2]])).toEqual([
      ['/explore', 'Khám phá'], ['/login', 'Đăng nhập'], ['/register', 'Đăng ký Agency'],
    ])
  })
})
