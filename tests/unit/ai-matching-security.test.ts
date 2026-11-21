/**
 * Screen 22 security: forms never fall back to a GET (a submit before hydration must not put data in the URL), and a
 * session that must change its temporary password is a Guest for /api/ait/matching and for the screen itself.
 */
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { POST as matching } from '@/app/api/ait/matching/route'
import { authenticateAccount } from '@/lib/auth/product-session'
import { hashPassword } from '@/lib/auth/password'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { demoRepository } from '@/lib/demo/json-repository'

describe('forms use POST', () => {
  it('every <form> in the screen declares method="post" and keeps onSubmit', () => {
    for (const file of ['src/app/ai-matching/page.tsx']) {
      const source = readFileSync(file, 'utf8')
      const forms = source.match(/<form\b[^>]*>|<form\b[\s\S]*?\n\s*>/g) ?? []
      expect(forms.length).toBeGreaterThan(0)
      for (const tag of forms) { expect(tag, tag).toMatch(/method="post"/); expect(tag, tag).toContain('onSubmit') }
    }
  })
  it('no input of the screen is named, so nothing could ever be sent in a URL', () => {
    expect(readFileSync('src/app/ai-matching/page.tsx', 'utf8')).not.toMatch(/<(input|textarea)[^>]*\sname=/)
  })
})

describe('a session that must change its temporary password is a Guest', () => {
  const EMAIL = 'thanhvien13@example.invalid'
  let token = ''
  beforeEach(async () => {
    demoRepository().reset()
    demoRepository().update('user_accounts', row => row.email === EMAIL, { password_hash: await hashPassword('Current#2026a'), must_change_password: 'false' })
    const login = await authenticateAccount(EMAIL, 'Current#2026a')
    if (!login.ok) throw new Error('login failed')
    token = login.token
  })
  const request = (path: string, body?: unknown) => new Request(`http://localhost:3000${path}`, {
    method: body ? 'POST' : 'GET', headers: { cookie: `hab_session=${token}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  })

  it('normal session: the Agency is authenticated (control)', async () => {
    expect((await sessionContextFromRequest(request('/ai-matching'))).role).toBe('Tour_Agency')
  })
  it('after must_change_password: /api/ait/matching answers 401 and returns no recommendations or prices', async () => {
    demoRepository().update('user_accounts', row => row.email === EMAIL, { must_change_password: 'true' })
    const response = await matching(request('/api/ait/matching', { tour_preference_profile: { hard_constraints: { group_size: 10 } } }))
    expect(response.status).toBe(401)
    expect(JSON.stringify(await response.json())).not.toMatch(/top_matches|price|card/)
  })
  it('after must_change_password: the screen (server session) is a Guest, so the layout redirects to login', async () => {
    demoRepository().update('user_accounts', row => row.email === EMAIL, { must_change_password: 'true' })
    const context = await sessionContextFromRequest(request('/internal/session'))
    expect(context.authenticated).toBe(false)
    expect(context.role).not.toBe('Tour_Agency')
  })
})
