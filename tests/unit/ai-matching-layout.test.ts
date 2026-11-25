/** Screen 22: independent history/chat scrolling, an anchored composer and responsive result cards. */
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
  it('keeps the shared navigation fixed in view and gives history/chat separate scroll areas', () => {
    expect(shell).toMatch(/\.hab-nav\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0/)
    expect(css).toMatch(/\.aim\s*\{[^}]*height:\s*calc\(100dvh\s*-\s*var\(--nav-h\)\)/)
    expect(css).toMatch(/\.aim\s*\{[^}]*overflow:\s*hidden/)
    expect(rule('.aim__hist')).toMatch(/overflow-y:\s*auto/)
    expect(rule('.aim__stream')).toMatch(/overflow-y:\s*auto/)
    expect(rule('.aim__stream')).toMatch(/overscroll-behavior:\s*contain/)
  })
  it('keeps the composer as a non-scrolling flex footer of the chat pane', () => {
    const dock = rule('.aim__dock')
    expect(dock).toMatch(/flex:\s*none/)
    expect(rule('.aim__pane')).toMatch(/min-height:\s*0/)
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
