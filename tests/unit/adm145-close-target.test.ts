/**
 * Issue #187 — ADM145 View Submitted Profile has a Close control that makes no change and goes to ADM095
 * User Management (screen-spec-ADM145.md:31 §3 #5 "Close | Button / navigation | No mutation" and
 * :48 §5 "| 2 | Close | Select | No mutation | ADM095 |"); ADM095 is /admin/users.
 * The page is an async server component that reads the session, so the check reads its source.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync('src/app/admin/providers/[id]/page.tsx', 'utf8')

describe('#187 | ADM145 Close goes to ADM095', () => {
  it('renders a "Đóng" (Close) link to /admin/users', () => {
    expect(page).toMatch(/<Link[^>]*href="\/admin\/users"[^>]*>Đóng<\/Link>/)
  })
})
