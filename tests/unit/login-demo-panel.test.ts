import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Issue #102, changed on purpose (human instruction, round 5): /login no longer has a "Tài khoản thử nghiệm" block,
// sample emails or the "any password" sentence, in any environment. The prototype login stays on the server
// (authenticatePrototype); only its page hint is gone. Production still refuses it.
;(globalThis as { React?: typeof React }).React = React
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: () => {}, refresh: () => {} }), useSearchParams: () => new URLSearchParams() }))

import LoginPage from '@/app/login/page'
import { authenticatePrototype } from '@/lib/auth/product-session'

const render = () => renderToStaticMarkup(React.createElement(LoginPage))

describe('/login has no demo block', () => {
  afterEach(() => vi.unstubAllEnvs())

  it.each(['development', 'production', 'test'])('%s: no demo block, no sample emails, no "any password" text, still a password field', env => {
    vi.stubEnv('NODE_ENV', env)
    const html = render()
    expect(html).toContain('type="password"')
    expect(html).not.toContain('Tài khoản thử nghiệm')
    expect(html).not.toMatch(/nhập bất kỳ mật khẩu/i)
    expect(html).not.toMatch(/thanhvien\d+@example\.invalid/)
    expect(html).not.toMatch(/prototype/i)
  })

  it('production still refuses the prototype login on the server', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(await authenticatePrototype('thanhvien13@example.invalid', 'demo')).toEqual({ ok: false, reason: 'INVALID_CREDENTIALS' })
  })
})
