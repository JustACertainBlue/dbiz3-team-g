/**
 * #252 browser check (DEV, 2026-11-10): every seeded village already has a UBND (#64), so the suggestion list is empty;
 * HDT must still be able to type a NEW village name (spec-AUT FR-019 / OQ #22, ADM117 §3 #5 "free text is allowed for a
 * new name"). Only the Provider form (village from the UBND assignment) needs a village option to submit.
 * The page renders its form after a client fetch, so the check reads its source.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync('src/app/admin/create-account/page.tsx', 'utf8')

describe('#252 | ADM117 create button with no village suggestions', () => {
  it('an empty village list disables Create only for the Provider form, not for UBND', () => {
    expect(page).toContain("disabled={busy || !options.email_configured || (options.kind === 'provider' && !options.villages.length)}")
  })
})
