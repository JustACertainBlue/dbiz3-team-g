import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Screen 25 (mockup TinNhan) tokens in the desktop override block; the phone rules stay untouched (human decision 21/11).
const css = readFileSync('src/app/messages/chat-v9.css', 'utf8')
const v3 = css.slice(css.indexOf('/* UI v3 screen 25 desktop'))

describe('screen 25 desktop style', () => {
  it('has a desktop-only override block', () => {
    expect(css).toContain('/* UI v3 screen 25 desktop')
    expect(v3).toContain('@media (min-width: 768px)')
  })
  it.each([
    ['own bubble', '#0F3D2A'], ['thread background', '#F8F6F0'], ['selected conversation', '#DCEFE2'], ['border', '#E2DED2'],
    ['unread badge', '#A4452A'], ['system pill border', '#E2DED2'], ['provider avatar ring', '#4FA06E'],
  ])('uses the mockup %s colour %s', (_name, colour) => { expect(v3).toContain(colour) })
  it('own bubble corners 10 10 4 10, their bubble 10 10 10 4', () => {
    expect(v3).toContain('border-radius: 10px 10px 4px 10px')
    expect(v3).toContain('border-radius: 10px 10px 10px 4px')
  })
  it('does not touch the existing phone media rules', () => {
    expect(css.slice(0, css.indexOf('/* UI v3 screen 25 desktop'))).toContain('@media (max-width: 767px)')
  })
})

describe('screen 25 list and header markup (mockup TinNhan)', () => {
  const page = readFileSync('src/app/messages/page.tsx', 'utf8')
  it('the list starts with a search box filtering by name or experience', () => {
    expect(page).toContain('placeholder="Tìm theo tên hoặc trải nghiệm"')
    expect(page).toContain('filterChats(chats, query)')
    expect(page).toContain('className="ch9-search"')
  })
  it('a list item has three lines: organization, experience, time', () => {
    expect(page).toContain('className="ch9-item__exp"')
    expect(page).toContain('chat.experience_name')
    expect(page).toContain('className="ch9-item__time"')
  })
  it('the thread header shows "Trải nghiệm: …"', () => {
    expect(page).toContain('Trải nghiệm: ')
    expect(page).toContain('selected.experience_name')
  })
  it('the old "N hội thoại" counter is gone and the title is kept for screen readers only', () => {
    expect(page).not.toContain('className="ch9-count"')
    expect(page).toContain('className="ch9-sr"')
  })
})
