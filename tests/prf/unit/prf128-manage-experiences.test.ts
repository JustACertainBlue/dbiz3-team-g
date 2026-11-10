/**
 * Issue #218 — PRF128 Edit Provider Profile links to EXP067 Experience Management
 * (screen-spec-PRF128.md:44 §3 #18 "Manage Experiences | Button / navigation | Create/Update/Delete; no publish toggle";
 * :63 §5 "| 4 | Manage Experiences | Select | … | EXP067 |"). The page loads its data in the browser,
 * so the check reads its source.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync('src/app/provider/[providerId]/edit/page.tsx', 'utf8')

describe('#218 | PRF128 Manage Experiences → EXP067', () => {
  it('renders a "Quản lý trải nghiệm" link to /provider/{providerId}/experiences', () => {
    expect(page).toMatch(/<Link href=\{`\/provider\/\$\{params\.providerId\}\/experiences`\}[^>]*>\s*Quản lý trải nghiệm\s*<\/Link>/)
  })
})
