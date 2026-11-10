/**
 * #248 browser check (2026-11-10): on /village (outside the Provider workspace) `.provider-media-grid` has no styles,
 * so each featured Experience image rendered 1440 px wide. VIL030 uses its own card grid with a fixed image ratio.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync('src/app/village/[villageId]/page.tsx', 'utf8')

describe('#248 | VIL030 Experience card grid', () => {
  it('renders the cards in a page-owned grid with bounded images', () => {
    expect(page).toContain('<div className="vil-exp-grid">')
    expect(page).not.toContain('className="provider-media-grid"')
    expect(page).toMatch(/\.vil-exp-grid\{display:grid;grid-template-columns:repeat\(auto-fill,minmax\(240px,1fr\)\)/)
    expect(page).toMatch(/\.vil-exp-grid img\{[^}]*aspect-ratio:16\/10;[^}]*object-fit:cover/)
  })
})
