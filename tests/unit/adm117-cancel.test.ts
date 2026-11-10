/**
 * Issue #185 — ADM117 Create Account has a Cancel control next to the create action: no mutation, goes to ADM095
 * (screen-spec-ADM117.md:39 §3 #13 "Cancel | Button / navigation | No mutation"; :56 §5 "| 2 | Cancel | Select |
 * No mutation | ADM095 |"). The page renders its form only after a client fetch, so the check reads its source.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync('src/app/admin/create-account/page.tsx', 'utf8')

describe('#185 | ADM117 Cancel next to "Tạo tài khoản"', () => {
  it('the form ends with the create button followed by a "Huỷ" link to /admin/users (no submit, no handler)', () => {
    expect(page).toMatch(/'Tạo tài khoản'\}<\/button>\s*<a href="\/admin\/users"[^>]*>Huỷ<\/a>\s*<\/form>/)
  })
})
