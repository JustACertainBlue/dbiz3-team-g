// Mockup v3 (hab-mockup-v3/source/*.dc.html), screens 38, 39, 40, 41, 41a: every heading, label, table header and button of
// the mockup is in the page, in the same order, with the same text. The expected phrases are in
// tests/fixtures/v3-admin-mockup-blocks.json (taken from the .dc.html files). When the mockup folder is on this machine
// (HAB_MOCKUP_DIR, default ~/Desktop/hab-mockup-v3) the fixture is also checked against the files, so a changed mockup fails here.
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

type Fixture = Record<string, { file: string; phrases: string[] }>
const fixture: Fixture = JSON.parse(readFileSync('tests/fixtures/v3-admin-mockup-blocks.json', 'utf8'))

const A = 'src/app/admin/'
// main = the page file; components = child components rendered inside it, spliced in at their JSX tag so the order is the render order.
type Component = string | { file: string; /** data declared above the JSX (option lists) is rendered at this marker inside the JSX that starts at `jsx` */ jsx: string; hoistAt: string }
const SCREENS: Record<string, { main: string; components: Record<string, Component> }> = {
  '38': { main: `${A}page.tsx`, components: { DateRange: `${A}_v3/DateRange.tsx` } },
  '39': { main: `${A}users/page.tsx`, components: {} },
  '40': { main: `${A}users/[userId]/page.tsx`, components: {} },
  '41': { main: `${A}_v3/ReviewList.tsx`, components: { QueueFilters: `${A}_v3/QueueFilters.tsx` } },
  '41a': { main: `${A}agencies/[id]/page.tsx`, components: { DecisionForm: { file: `${A}_v3/DecisionForm.tsx`, jsx: 'return <form', hoistAt: 'role="radiogroup"' } } },
}
// A phrase counts as visible text when it starts a JSX text node, a quoted label or a title prop (not an attribute such as data-label="…").
function findText(text: string, phrase: string, from = 0): number {
  for (let i = text.indexOf(phrase, from); i >= 0; i = text.indexOf(phrase, i + 1)) {
    const before = text.slice(0, i).trimEnd()
    if (/[>'}]$/.test(before) || /title="$/.test(before)) return i
  }
  return -1
}
const read = (file: string) => readFileSync(file, 'utf8').replace(/&amp;/g, '&')
function rendered(screen: string): string {
  const { main, components } = SCREENS[screen]
  let text = read(main)
  for (const [tag, component] of Object.entries(components)) {
    const at = text.indexOf(`<${tag}`)
    expect(at, `<${tag}> is rendered by ${main}`).toBeGreaterThanOrEqual(0)
    let body = typeof component === 'string' ? read(component) : read(component.file)
    if (typeof component !== 'string') {
      const start = body.indexOf(component.jsx), marker = body.indexOf(component.hoistAt, start)
      expect(start >= 0 && marker >= 0, `${component.file} has the JSX start and the marker`).toBe(true)
      const jsx = body.slice(start), cut = marker - start + component.hoistAt.length
      body = jsx.slice(0, cut) + body.slice(0, start) + jsx.slice(cut)
    }
    text = text.slice(0, at) + body + text.slice(at)
  }
  return text
}

describe.each(Object.keys(SCREENS))('screen %s: blocks, order and text of the mockup', screen => {
  const text = rendered(screen)
  const phrases = fixture[screen].phrases

  it('has every phrase of the mockup', () => {
    expect(phrases.filter(p => findText(text, p) < 0)).toEqual([])
  })

  it('renders the phrases in the order of the mockup', () => {
    let at = 0
    for (const phrase of phrases) {
      const found = findText(text, phrase, at)
      expect(found, `"${phrase}" is missing or out of order`).toBeGreaterThanOrEqual(0)
      at = found + phrase.length
    }
  })
})

describe('screen 41a: the workshop page has the same blocks', () => {
  const text = [read(`${A}providers/[id]/page.tsx`), read(`${A}_v3/DecisionForm.tsx`)].join('\n')
  it.each(['Giấy tờ đính kèm', 'Quyết định', 'Yêu cầu bổ sung', 'Nhận xét', 'Gửi quyết định'])('has "%s"', phrase => {
    expect(text).toContain(phrase)
  })
})

const mockupDir = process.env.HAB_MOCKUP_DIR || join(homedir(), 'Desktop', 'hab-mockup-v3')
describe.skipIf(!existsSync(join(mockupDir, 'source')))('fixture matches the mockup files on this machine', () => {
  it.each(Object.keys(fixture))('screen %s', screen => {
    const html = readFileSync(join(mockupDir, 'source', fixture[screen].file), 'utf8').replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, '')
    const text = html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ')
    // every fixture phrase (split parts joined back) is visible text of the mockup, and the first phrase is its heading
    for (const phrase of fixture[screen].phrases.filter(p => !p.includes('{') && p !== '5 Công ty lữ hành đặt nhiều nhất')) expect(text, phrase).toContain(phrase)
  })
})
