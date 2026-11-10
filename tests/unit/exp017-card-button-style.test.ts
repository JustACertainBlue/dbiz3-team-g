/**
 * #246 browser check (2026-11-10): on Explore v9 the generic `.button` / `.button--secondary` classes have no styles, so the
 * card's Request Quote / Chat rendered as tiny native buttons. explore-v9.css styles them inside a card like `.xv-button`
 * (primary and outline), without touching the detail page.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/app/explore/explore-v9.css', 'utf8')

describe('#246 | card action buttons use the Explore button look', () => {
  it('styles .stack-actions buttons inside a card as primary / outline pills', () => {
    expect(css).toMatch(/\.xv-card \.stack-actions \{[^}]*display: flex;/)
    expect(css).toMatch(/\.xv-card \.stack-actions \.button \{[^}]*min-height: 44px;[^}]*border-radius: var\(--radius-pill\);[^}]*background: var\(--color-brand-primary\);/)
    expect(css).toMatch(/\.xv-card \.stack-actions \.button--secondary \{[^}]*background: transparent;[^}]*border: 1\.5px solid var\(--color-brand-700\);/)
  })
})
