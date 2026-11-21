/**
 * Screen 19: view, personal edit and password change are panels of /account. /account/change-password redirects to the
 * password panel, and the forced change of a temporary password keeps working.
 * Temporary password (spec-AUT): login answers redirectTo "/account/change-password"; until the password is changed the
 * session only reaches /api/auth/change-password, /session and /logout; every other API sees a guest.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
;(globalThis as { React?: typeof React }).React = React
vi.mock('next/navigation', () => ({
  redirect: (to: string) => { throw new Error(`REDIRECT:${to}`) },
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }), useSearchParams: () => new URLSearchParams(''), usePathname: () => '/account',
}))

import { POST as login } from '@/app/api/auth/login/route'
import { GET as sessionRoute } from '@/app/api/auth/session/route'
import { GET as accountRoute } from '@/app/api/auth/account/route'
import { POST as changePassword } from '@/app/api/auth/change-password/route'
import ChangePasswordPage from '@/app/account/change-password/page'
import AccountView, { type Account } from '@/app/auth-v3/AccountView'
import { choosePanel } from '@/app/auth-v3/rules'
import { hashPassword } from '@/lib/auth/password'
import { demoRepository } from '@/lib/demo/json-repository'

const EMAIL = 'thanhvien14@example.invalid'
const TEMP = 'Temp#2026abc'
const NEW = 'Fresh#2026xyz'
const repo = () => demoRepository()
const call = (route: (r: Request) => Promise<Response>, path: string, cookie = '', body?: unknown) =>
  route(new Request(`http://localhost:3000${path}`, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }))
async function signIn(password: string) {
  const response = await call(login, '/api/auth/login', '', { email: EMAIL, password })
  return { status: response.status, body: await response.json() as any, cookie: (response.headers.get('set-cookie') ?? '').split(';')[0] }
}

describe('temporary password flow (must keep working)', () => {
  beforeEach(async () => {
    repo().reset()
    repo().update('user_accounts', row => row.email === EMAIL, { password_hash: await hashPassword(TEMP), must_change_password: 'true' })
  })
  it('login answers the forced redirect to /account/change-password', async () => {
    const res = await signIn(TEMP)
    expect(res.status).toBe(200)
    expect(res.body.data.redirectTo).toBe('/account/change-password')
  })
  it('the session reports mustChangePassword, and every other API treats it as a guest', async () => {
    const { cookie } = await signIn(TEMP)
    expect((await (await call(sessionRoute, '/api/auth/session', cookie)).json() as any).data.session.mustChangePassword).toBe(true)
    expect((await call(accountRoute, '/api/auth/account', cookie)).status).toBe(401)
  })
  it('changing the password clears the flag: the next login goes to the workspace', async () => {
    const { cookie } = await signIn(TEMP)
    const changed = await call(changePassword, '/api/auth/change-password', cookie, { current_password: TEMP, new_password: NEW, confirm_password: NEW })
    expect(changed.status).toBe(200)
    const next = await signIn(NEW)
    expect(next.body.data.redirectTo).not.toBe('/account/change-password')
  })
  it('the old URL /account/change-password redirects to the password panel of /account', () => {
    expect(() => renderToStaticMarkup(React.createElement(ChangePasswordPage))).toThrow('REDIRECT:/account?tab=password')
  })
})

describe('choosePanel', () => {
  it('defaults to the personal info panel', () => { expect(choosePanel(null, false)).toBe('info'); expect(choosePanel('nonsense', false)).toBe('info') })
  it('opens the password panel for ?tab=password', () => { expect(choosePanel('password', false)).toBe('password') })
  it('a forced password change shows the password panel whatever the tab says', () => {
    for (const tab of [null, 'info', 'edit', 'password']) expect(choosePanel(tab, true)).toBe('password')
  })
})

describe('AccountView panels', () => {
  const account: Account = { full_name: 'Lý Gia Hân', title: 'Quản trị viên', phone: '+84932000002', email: 'a@example.invalid', account_status: 'Active', created_at: '2026-11-12T02:02:00.000Z', role: 'Tour_Agency', admin_type: null, data_scope: 'own', organization: 'Công ty X', business_href: '/agency/ag-1' }
  const noop = () => {}
  const view = (changes: Record<string, unknown>) => renderToStaticMarkup(React.createElement(AccountView, { account, panel: 'info', forced: false, error: '', saving: false, saved: false, avatarVersion: 0, avatarFailed: true, onEdit: noop, onCancel: noop, onSubmit: noop, onAvatar: noop, onAvatarError: noop, ...changes } as any))
  it('info panel: profile rows, no password form', () => { const h = view({}); expect(h).toContain('Email đăng nhập'); expect(h).not.toContain('Mật khẩu hiện tại') })
  it('edit panel: the edit form, not the rows', () => { const h = view({ panel: 'edit' }); expect(h).toContain('Sửa thông tin cá nhân'); expect(h).not.toContain('Ngày tạo') })
  it('password panel: the three password fields', () => { const h = view({ panel: 'password' }); for (const t of ['Mật khẩu hiện tại', 'Mật khẩu mới', 'Nhập lại mật khẩu mới']) expect(h).toContain(t) })
  it('forced: only the password panel, no menu to other panels, no account data', () => {
    const h = view({ panel: 'password', forced: true, account: null })
    expect(h).toContain('Mật khẩu hiện tại')
    expect(h).toContain('Mật khẩu tạm phải được đổi')
    for (const t of ['Thông tin cá nhân', 'Doanh nghiệp của tôi', 'Sửa thông tin cá nhân']) expect(h).not.toContain(t)
  })
})
