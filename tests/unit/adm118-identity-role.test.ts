/**
 * Issue #186 — ADM118 "Selected account identity and current status" (screen-spec-ADM118.md:33, §3 #7) shows the
 * account's role next to email and organization, as the ADM095 list already does (`{user.role} {user.admin_type}`).
 * The panel renders after a client fetch and a click, so the check reads the page source.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync('src/app/admin/users/[userId]/page.tsx', 'utf8') // v3 screen 40 replaced the modal

describe('#186 | ADM118 identity block includes the role', () => {
  it('the selected-account panel lists "Vai trò" with role and admin type, before the status', () => {
    expect(page.indexOf('<dt>Vai trò</dt>')).toBeGreaterThan(-1)
    expect(page.indexOf('<dt>Vai trò</dt>')).toBeLessThan(page.indexOf('<dt>Trạng thái</dt>'))
    expect(page).toContain('roleLabel(account.role, account.admin_type)')
  })
})
