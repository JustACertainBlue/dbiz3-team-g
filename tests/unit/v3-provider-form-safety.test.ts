/**
 * (1) Forms of the provider screens never fall back to a browser GET: before React is ready, a native submit of a form without
 *     method="post" goes to the URL as GET and puts the fields in the query string. Every <form> here has method="post", and its
 *     submit button stays disabled until the page has hydrated (that also blocks Enter-to-submit, the default button being disabled).
 * (2) GET /api/prf/provider/:id/craft-line is for the owning Local Provider only. A guest, another provider, and a session that must
 *     still change its temporary password (treated as a guest by sessionContextFromRequest) get 403 and no data.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { GET } from '@/app/api/prf/provider/[providerId]/craft-line/route'
import { authenticateAccount, PRODUCT_SESSION_COOKIE } from '@/lib/auth/product-session'
import { hashPassword } from '@/lib/auth/password'
import { demoRepository } from '@/lib/demo/json-repository'

const BAT_TRANG = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const OTHER = '00000000-0000-0000-0000-000000000001'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? (name === 'bookings' ? [] : files(path)) : /\.tsx$/.test(name) ? [path] : []
  })
}
const formFiles = files('src/app/provider').filter(path => /<form[\s>]/.test(readFileSync(path, 'utf8')))

describe('provider forms are POST and wait for hydration', () => {
  it('finds the provider forms (profile edit, experience add and edit)', () => { expect(formFiles.length).toBeGreaterThanOrEqual(3) })
  for (const path of formFiles) {
    it(`${path}: every <form> has method="post"; every submit button is disabled until hydrated`, () => {
      const source = readFileSync(path, 'utf8')
      for (const tag of source.match(/<form[\s>][^>]*>/g) ?? []) expect(tag, 'form tag').toMatch(/method="post"/)
      const submits = source.match(/<button[^>]*type="submit"[^>]*>/g) ?? []
      expect(submits.length).toBeGreaterThan(0)
      for (const button of submits) expect(button).toMatch(/disabled=\{[^}]*!hydrated/)
      expect(source).toMatch(/useHydrated\(\)|setHydrated\(true\)/)
    })
  }
})

describe('GET /api/prf/provider/:id/craft-line access', () => {
  beforeEach(() => demoRepository().reset())
  const call = (providerId: string, cookie?: string) => GET(new Request('http://localhost/api/prf/provider/x/craft-line', { headers: cookie ? { cookie } : {} }), { params: { providerId } })

  it('the owning provider gets the line', async () => {
    const response = await call(BAT_TRANG, 'hab_demo_account=provider')
    expect(response.status).toBe(200)
    expect((await response.json()).craft_line).toMatch(/Làng Bát Tràng$/)
  })
  it('a guest gets 403 and no data', async () => {
    const response = await call(BAT_TRANG)
    expect(response.status).toBe(403)
    expect(JSON.stringify(await response.json())).not.toContain('Bát Tràng')
  })
  it('another provider (or an unknown id) gets 403', async () => {
    expect((await call(OTHER, 'hab_demo_account=provider')).status).toBe(403)
  })
  it('a session that must change its temporary password is treated as a guest', async () => {
    const email = 'thanhvien19@example.invalid', password = 'Temp#2026aaa'
    await demoRepository().update('user_accounts', row => row.email === email, { password_hash: await hashPassword(password), must_change_password: 'true' })
    const login = await authenticateAccount(email, password)
    expect(login.ok).toBe(true)
    const token = login.ok ? login.token : ''
    const response = await call(BAT_TRANG, `${PRODUCT_SESSION_COOKIE}=${token}`)
    expect(response.status).toBe(403)
    expect(JSON.stringify(await response.json())).not.toContain('Bát Tràng')
  })
})
