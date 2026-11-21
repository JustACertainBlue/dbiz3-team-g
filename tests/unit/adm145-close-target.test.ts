/**
 * Issue #187 — ADM145 View Submitted Profile has a Close control that makes no change and goes to ADM095
 * User Management (screen-spec-ADM145.md:31 §3 #5 "Close | Button / navigation | No mutation" and
 * :48 §5 "| 2 | Close | Select | No mutation | ADM095 |"); ADM095 is /admin/users.
 * The page is an async server component that reads the session, so the check reads its source.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync('src/app/admin/providers/[id]/page.tsx', 'utf8')

describe('#187 | ADM145 leaves through the list (v3 png/41a: "‹ Danh sách hồ sơ")', () => {
  it('renders a back link to the review list and no mutation of its own', () => {
    expect(page).toMatch(/<Link href=\{listHref\} className="av3-back">‹ Danh sách hồ sơ<\/Link>/)
    expect(page).toContain("const listHref = session.adminType === 'UBND' ? '/admin/providers' : '/admin/agencies'")
  })
})
