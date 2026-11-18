/**
 * #248 browser check (2026-11-10): on /village (outside the Provider workspace) `.provider-media-grid` has no styles,
 * so each featured Experience image rendered 1440 px wide. VIL030 uses its own card grid with a fixed image ratio.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Rewritten for UI v3 (mockup 03, pack 19/11/2026): the page now uses the shared result card of mockup 02, whose
// image box has a fixed width and height (rendered check: tests/unit/v3-village-pages.test.ts).
const page = readFileSync('src/app/village/[villageId]/page.tsx', 'utf8')
const css = readFileSync('src/app/explore/v3/explore-v3.css', 'utf8')

describe('#248 | VIL030 Experience card grid', () => {
  it('renders the cards in a page-owned list with bounded images', () => {
    expect(page).toContain('<div className="v3v-results">')
    expect(page).toContain('<ResultCard key={item.id} item={item} query={searchParams} />')
    expect(page).not.toContain('className="provider-media-grid"')
    expect(css).toMatch(/\.v3r__media \{ flex: 0 0 220px;[^}]*min-height: 240px;[^}]*overflow: hidden;/)
  })
})
