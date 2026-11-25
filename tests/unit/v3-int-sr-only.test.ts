/**
 * UI v3 integration (21/11), Step 2 item 4: shared .sr-only utility class.
 * Source: hab-mockup-v3 png/41 (ReviewList), human decisions 2026-11-18 / 2026-11-21.
 * Screen-reader only text hides visually while remaining accessible to assistive tech.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const css = (file: string) => readFileSync(`src/app/${file}`, 'utf8')

describe('.sr-only', () => {
  it('is defined in the shared globals.css with standard accessible hiding rules', () => {
    const globals = css('globals.css')
    // Must define .sr-only with absolute positioning, 1px box, overflow hidden, and clip
    expect(globals).toMatch(/\.sr-only\s*\{[^}]*position:\s*absolute/)
    expect(globals).toMatch(/\.sr-only\s*\{[^}]*width:\s*1px/)
    expect(globals).toMatch(/\.sr-only\s*\{[^}]*height:\s*1px/)
    expect(globals).toMatch(/\.sr-only\s*\{[^}]*overflow:\s*hidden/)
    expect(globals).toMatch(/\.sr-only\s*\{[^}]*clip/)
  })

  it('ReviewList uses .sr-only for the action column header and no longer hides text inline', () => {
    const reviewList = readFileSync('src/app/admin/_v3/ReviewList.tsx', 'utf8')
    // No legacy inline style with large negative offset
    expect(reviewList).not.toContain('left: -9999')
    // Must use .sr-only on the action column header for screen readers
    expect(reviewList).toMatch(/<span\s+className="sr-only">\s*Thao tác\s*<\/span>/)
  })
})
