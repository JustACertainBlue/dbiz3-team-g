import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Issue #102. docs/build/demo-login.md and ADR 0001: the "any non-empty password" prototype login is a
// development aid; production refuses it (authenticatePrototype). The /login page must offer the demo panel
// under exactly the same condition, so testers on the hosted version are not told to use a login that fails.
;(globalThis as { React?: typeof React }).React = React
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: () => {}, refresh: () => {} }), useSearchParams: () => new URLSearchParams() }))

import LoginPage from '@/app/login/page'
import { authenticatePrototype } from '@/lib/auth/product-session'

const render = () => renderToStaticMarkup(React.createElement(LoginPage))
const PANEL = 'Tài khoản thử nghiệm'
const ANY_PASSWORD = 'nhập bất kỳ mật khẩu không rỗng'

describe('#102 AUT /login | demo panel only where the prototype login works', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('production (error case of the old page): no demo panel, no seed emails, no "any password" text', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const html = render()
    expect(html).toContain('type="password"')
    expect(html).not.toContain(PANEL)
    expect(html).not.toContain(ANY_PASSWORD)
    expect(html).not.toContain('thanhvien13@example.invalid')
  })

  it('development (normal): the demo panel and the four seed identities are offered', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const html = render()
    expect(html).toContain(PANEL)
    for (const email of ['thanhvien13', 'thanhvien19', 'thanhvien8', 'thanhvien9']) expect(html).toContain(`${email}@example.invalid`)
  })

  it('same condition as the server: in production the panel is hidden and the prototype login is refused', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(render()).not.toContain(PANEL)
    expect(await authenticatePrototype('thanhvien13@example.invalid', 'demo')).toEqual({ ok: false, reason: 'INVALID_CREDENTIALS' })
  })
})
