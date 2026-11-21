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
    // Only the "Gần đây" list of the pinned left rail scrolls on its own (21/11); the page and the chat never do.
    expect(css.replace(/\.aim__hist\s*\{[^}]*\}/g, '')).not.toMatch(/overflow(-y)?\s*:\s*(auto|scroll)/)
    // Except the pinned left rail (21/11): it is exactly one viewport tall.
    expect(css.replace(/\.aim__side\s*\{[^}]*\}/g, '')).not.toMatch(/(^|[^-])height\s*:\s*100vh/)
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

describe('left rail stays in place while the chat scrolls (desktop)', () => {
  const desktop = css.slice(css.indexOf('@media (min-width: 900px)'))
  it('sticky at the top of the screen, as tall as the viewport', () => {
    expect(css).toContain('@media (min-width: 900px)')
    const side = desktop.split('}').find(r => r.includes('.aim__side {')) ?? ''
    expect(side).toMatch(/position:\s*sticky/)
    expect(side).toMatch(/top:\s*0\b/)
    expect(side).toMatch(/height:\s*100vh/)
    expect(side).toMatch(/align-self:\s*flex-start/)
  })
  it('only the "Gần đây" list scrolls inside the rail', () => {
    expect(rule('.aim__hist')).toMatch(/overflow-y:\s*auto/)
    expect(rule('.aim__hist')).toMatch(/min-height:\s*0/)
  })
  it('the stacked layout below 900 px keeps a normal, non-sticky rail', () => {
    expect(css.slice(0, css.indexOf('@media (min-width: 900px)'))).not.toMatch(/\.aim__side\s*\{[^}]*sticky/)
  })
})
