/**
 * Issue #186 — ADM118 "Selected account identity and current status" (screen-spec-ADM118.md:33, §3 #7) shows the
 * account's role next to email and organization, as the ADM095 list already does (`{user.role} {user.admin_type}`).
 * The panel renders after a client fetch and a click, so the check reads the page source.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync('src/app/admin/users/page.tsx', 'utf8')

describe('#186 | ADM118 identity block includes the role', () => {
  it('the selected-account panel lists "Vai trò" with role and admin type, before the status', () => {
    expect(page).toMatch(/<dt>Tổ chức<\/dt><dd>\{selected\.organization\}<\/dd><dt>Vai trò<\/dt><dd>\{selected\.role\} \{selected\.admin_type\}<\/dd><dt>Trạng thái<\/dt>/)
  })
})
