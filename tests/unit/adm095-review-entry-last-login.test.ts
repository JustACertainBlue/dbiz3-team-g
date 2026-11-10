/**
 * Issue #184 — ADM095 User Management.
 * - screen-spec-ADM095.md §3 #2 "Account list: Name, Email, Organization, Role, Status, Last login": the list shows a
 *   Last login column (F-AUTH-21 returns last_login; empty → "Chưa đăng nhập").
 * - §3 #7 "Review submission | Button / navigation | Subtype and village checks"; §5 #3 "Review submission → VER146":
 *   an entry to the review queue the admin may act on — HDT: Agency reviews and the Provider profile queue it views;
 *   UBND: the Provider profile queue of its village (same targets as the admin navigation, nav-model.ts).
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { reviewSubmissionLinks } from '@/app/admin/users/review-links'

describe('#184 | ADM095 Review submission entry (→ VER146)', () => {
  it('HDT gets the Agency review and the Provider profile queue; UBND the Provider queue; others none', () => {
    expect(reviewSubmissionLinks('HDT')).toEqual([
      { href: '/admin/agencies', label: 'Duyệt Agency' },
      { href: '/admin/providers', label: 'Hồ sơ chờ thẩm định' },
    ])
    expect(reviewSubmissionLinks('UBND')).toEqual([{ href: '/admin/providers', label: 'Duyệt hồ sơ' }])
    expect(reviewSubmissionLinks(undefined)).toEqual([])
  })

  it('the page renders those links from the signed-in admin type', () => {
    const page = readFileSync('src/app/admin/users/page.tsx', 'utf8')
    expect(page).toContain('reviewSubmissionLinks(adminType).map(link => <Link key={link.href} href={link.href}>{link.label} →</Link>)')
    expect(page).toMatch(/readSessionContext\(\)\.then\(session => setAdminType\(session\.adminType\)\)/)
  })
})

describe('#184 | ADM095 Last login column', () => {
  it('the account table has a "Đăng nhập gần nhất" column filled from last_login', () => {
    const page = readFileSync('src/app/admin/users/page.tsx', 'utf8')
    expect(page).toContain('<th>Trạng thái</th><th>Đăng nhập gần nhất</th><th>Thao tác</th>')
    expect(page).toContain("<td>{user.last_login || 'Chưa đăng nhập'}</td>")
  })
})
