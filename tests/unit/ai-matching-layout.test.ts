/**
 * Screen 22 review fixes (21/11): suggestions only in the new-conversation state; the whole page scrolls and only the
 * composer + note stick to the bottom (mockup: position sticky, bottom 0, white fade); phone card = card of screen 02.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync('src/app/ai-matching/page.tsx', 'utf8')
const css = readFileSync('src/app/ai-matching/ai-matching.css', 'utf8')
const rule = (selector: string) => css.split('}').map(r => r.trim()).filter(r => r.startsWith(selector + ' {') || r.startsWith(selector + '{')).join(';')

describe('suggestions only in the new-conversation state', () => {
  it('the old quick-prompt row is gone; the only suggestion chips sit before the chat state', () => {
    expect(page).not.toContain('quickPrompts')
    expect(page.match(/className="aim__sugg"/g)).toHaveLength(1)
    expect(page.indexOf('aim__sugg')).toBeLessThan(page.indexOf('aim__top'))
  })
})

describe('scrolling like the mockup', () => {
  it('no own scroll frame and no fixed viewport height anywhere in the screen CSS', () => {
    expect(css).not.toMatch(/overflow(-y)?\s*:\s*(auto|scroll)/)
    expect(css).not.toMatch(/(^|[^-])height\s*:\s*100vh/)
    expect(page).not.toMatch(/overflowY|height: '100vh'/)
  })
  it('composer + note stick to the bottom with a white fade', () => {
    const dock = rule('.aim__dock')
    expect(dock).toMatch(/position:\s*sticky/)
    expect(dock).toMatch(/bottom:\s*0/)
    expect(dock).toMatch(/linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\),\s*#FFF 28%\)/i)
    expect(dock).toMatch(/padding:\s*20px 0 16px/)
  })
})

describe('phone (< 768 px)', () => {
  it('the card keeps the layout of screen 02: no own phone layout for the card', () => {
    const phone = css.slice(css.indexOf('@media (max-width'))
    expect(phone).not.toMatch(/\.aim__card/)
    expect(rule('.aim__card.v3r')).toBe('')
    expect(css).toMatch(/@media \(min-width: 768px\)\s*\{\s*\.aim__card\.v3r/)
  })
  it('chat composer: one-line textarea that grows while typing, send button on the same row', () => {
    expect(page).toMatch(/rows=\{1\}/)
    expect(page).toMatch(/style\.height/)
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*\.aim__dock \.aim__comp\s*\{[^}]*flex-direction:\s*row/)
  })
})
