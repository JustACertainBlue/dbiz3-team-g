/**
 * Screen 22 uses the v2 layout of PR #286 (Khánh Linh, 25/11, replaces mockup v3 for this screen): the shared bar and
 * the chat frame stay in view, the history rail and the chat scroll on their own, the composer is a flex footer.
 * Old (mockup v3) -> new (v2) is listed in docs/build/ui-v3-spec-deviations.md.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync('src/app/ai-matching/page.tsx', 'utf8')
const css = readFileSync('src/app/ai-matching/ai-matching.css', 'utf8')
const shell = readFileSync('src/app/shell.css', 'utf8')
const rule = (selector: string) => css.split('}').map(r => r.trim()).filter(r => r.startsWith(selector + ' {') || r.startsWith(selector + '{')).join(';')

describe('suggestions only in the new-conversation state', () => {
  it('the old quick-prompt row is gone; the only suggestion chips sit before the chat state', () => {
    expect(page).not.toContain('quickPrompts')
    expect(page.match(/className="aim__sugg"/g)).toHaveLength(1)
    expect(page.indexOf('aim__sugg')).toBeLessThan(page.indexOf('aim__top'))
  })
})

describe('Screen 22 scroll behavior', () => {
  it('keeps the shared bar in view for this screen only, and gives history and chat separate scroll areas', () => {
    // The shared header file is not touched: the bar is made sticky by a rule that exists only while screen 22 is shown.
    expect(css).toMatch(/body:has\(\.aim\)\s+\.hab-nav\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0/)
    expect(shell).toMatch(/\.hab-nav\s*\{[^}]*position:\s*relative/)
    expect(css).toMatch(/\.aim\s*\{[^}]*height:\s*calc\(100dvh\s*-\s*var\(--nav-h\)\)/)
    expect(css).toMatch(/\.aim\s*\{[^}]*overflow:\s*hidden/)
    expect(rule('.aim__hist')).toMatch(/overflow-y:\s*auto/)
    expect(rule('.aim__stream')).toMatch(/overflow-y:\s*auto/)
    expect(rule('.aim__stream')).toMatch(/overscroll-behavior:\s*contain/)
    expect(page).not.toMatch(/overflowY|height: '100vh'/)
  })
  it('keeps the composer as a non-scrolling flex footer of the chat pane, with its note', () => {
    const dock = rule('.aim__dock')
    expect(dock).toMatch(/flex:\s*none/)
    expect(dock).toMatch(/position:\s*relative/)
    expect(rule('.aim__pane')).toMatch(/min-height:\s*0/)
  })
  it('the history rail is a static column of the frame (no page-level sticky or 100vh rail)', () => {
    const last = css.slice(css.lastIndexOf('@media (min-width: 900px)'))
    expect(last).toMatch(/\.aim__side\s*\{[^}]*position:\s*static/)
    expect(last).toMatch(/\.aim__side\s*\{[^}]*height:\s*auto/)
  })
})

describe('phone (< 768 px)', () => {
  it('keeps the history and chat in the viewport without page-level scrolling', () => {
    const phone = css.slice(css.indexOf('@media (max-width'))
    expect(phone).toMatch(/\.aim\s*\{[^}]*height:\s*calc\(100dvh\s*-\s*var\(--nav-h\)\)/)
    expect(rule('.aim__side')).toMatch(/overflow:\s*hidden/)
    expect(rule('.aim__pane')).toMatch(/min-height:\s*0/)
    expect(rule('.aim__stream')).toMatch(/overflow-y:\s*auto/)
  })
  it('chat composer: one-line textarea that grows while typing, send button on the same row', () => {
    expect(page).toMatch(/rows=\{1\}/)
    expect(page).toMatch(/style\.height/)
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*\.aim__dock \.aim__comp\s*\{[^}]*flex-direction:\s*row/)
  })
  it('gives mobile card actions room to stay readable and tappable', () => {
    const phone = css.slice(css.lastIndexOf('@media (max-width: 767px)'))
    expect(phone).toMatch(/\.aim__card-footer\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
    expect(phone).toMatch(/\.aim__card-action:last-child\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/)
    expect(phone).toMatch(/\.aim__card-action\s*\{[^}]*font-size:\s*13px/)
  })
})

describe('independent history and chat scroll frames', () => {
  it('keeps both scroll regions bounded by the Screen 22 layout', () => {
    expect(rule('.aim__hist')).toMatch(/min-height:\s*0/)
    expect(rule('.aim__stream')).toMatch(/min-height:\s*0/)
  })
})
