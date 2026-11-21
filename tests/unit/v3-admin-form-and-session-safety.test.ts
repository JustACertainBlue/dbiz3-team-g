// Safety of the v3 admin screens:
// 1. A form must never be sent as GET (it would put the comment in the URL) before the page is interactive.
// 2. A session that must change its temporary password is a guest for every admin page and API.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

let cookieHeader = ''
vi.mock('next/headers', () => ({ cookies: () => ({ get: (name: string) => { const m = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`)); return m ? { value: decodeURIComponent(m[1]) } : undefined } }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {}, refresh() {}, replace() {} }), usePathname: () => '/admin', useSearchParams: () => new URLSearchParams() }))

import DecisionForm from '@/app/admin/_v3/DecisionForm'
import { POST as login } from '@/app/api/auth/login/route'
import { GET as listUsers } from '@/app/api/auth/users/route'
import { GET as agencyReviews } from '@/app/api/auth/agency-reviews/route'
import { currentServerSession } from '@/lib/auth/server-session'
import { PRODUCT_SESSION_COOKIE } from '@/lib/auth/product-session'
import { hashPassword } from '@/lib/auth/password'
import { demoRepository } from '@/lib/demo/json-repository'
import { adminScope, loadOverview, loadReviewQueue } from '@/lib/adm/v3-loaders'

describe('forms of the v3 admin screens', () => {
  it('the decision form is a POST form whose submit button is disabled until the page is interactive', () => {
    const html = renderToStaticMarkup(React.createElement(DecisionForm, { target: { type: 'provider', id: 'p1' }, backHref: '/admin/providers' }))
    expect(html).toMatch(/<form[^>]*method="post"/)
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/)
  })

  it('no <form> in the admin screens lacks method="post" (create-account form, kept unused, is included)', () => {
    const files: string[] = []
    const walk = (dir: string) => { for (const name of readdirSync(dir)) { const p = join(dir, name); statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(name) && files.push(p) } }
    walk('src/app/admin')
    const offenders = files.filter(f => [...readFileSync(f, 'utf8').matchAll(/<form\b[^>]*>/g)].some(m => !/method="post"/i.test(m[0])))
    expect(offenders).toEqual([])
  })
})

describe('a session that must change its temporary password is a guest on the admin screens', () => {
  const email = 'thanhvien10@example.invalid' // seed HDT
  const PASSWORD = 'Staff#2026ok'
  let cookie = ''
  beforeEach(async () => {
    demoRepository().reset()
    await demoRepository().update('user_accounts', r => r.email === email, { password_hash: await hashPassword(PASSWORD), must_change_password: 'false' })
    const res = await login(new Request('http://localhost:3000/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) }))
    cookie = (res.headers.get('set-cookie') ?? '').match(new RegExp(`${PRODUCT_SESSION_COOKIE}=([^;]+)`))![1]
    cookieHeader = `${PRODUCT_SESSION_COOKIE}=${cookie}`
  })
  const mustChange = () => demoRepository().update('user_accounts', r => r.email === email, { must_change_password: 'true' })
  const asRequest = (path: string) => new Request(`http://localhost:3000${path}`, { headers: { cookie: `${PRODUCT_SESSION_COOKIE}=${cookie}` } })

  it('control: the same session is a working admin before the flag is set', async () => {
    const session = await currentServerSession()
    expect(session.authenticated).toBe(true)
    expect(adminScope(session)).not.toBeNull()
    expect((await listUsers(asRequest('/api/auth/users'))).status).toBe(200)
  })

  it('server pages: currentServerSession is a guest, adminScope is null, loaders refuse', async () => {
    await mustChange()
    const session = await currentServerSession()
    expect(session.authenticated).toBe(false)
    expect(adminScope(session)).toBeNull()
    await expect(loadOverview(session, '2026-06-01', '2026-11-15')).rejects.toThrow('FORBIDDEN')
    await expect(loadReviewQueue(session)).rejects.toThrow('FORBIDDEN')
  })

  it('APIs used by the screens refuse it (accounts list, agency reviews)', async () => {
    await mustChange()
    expect((await listUsers(asRequest('/api/auth/users'))).status).toBe(403)
    expect((await agencyReviews(asRequest('/api/auth/agency-reviews'))).status).toBe(403)
  })
})
