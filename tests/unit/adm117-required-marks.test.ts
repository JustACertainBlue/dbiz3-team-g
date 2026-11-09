/**
 * Issue #161 — ADM117 marks Required fields (screen-spec-ADM117.md:28-36, Required = Yes) with a visible
 * "*" and an accessible "required" (aria-required). Presentation only: names, `required`, patterns
 * and limits are unchanged.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import CreateAccountFields from '@/app/admin/create-account/CreateAccountFields'

const villages = [{ village_id: 'v1', name: 'Bát Tràng' }]
const render = (kind: 'ubnd' | 'provider') => {
  const html = renderToStaticMarkup(createElement(CreateAccountFields, { options: { kind, villages } }))
  return new DOMParserLite(html)
}

// Minimal parser for the static markup: one <label> per field, each holding one control.
class DOMParserLite {
  labels: { text: string; html: string }[]
  constructor(public html: string) {
    this.labels = [...html.matchAll(/<label[^>]*>([\s\S]*?)<\/label>/g)].map(m => ({ html: m[1], text: m[1].replace(/<[^>]+>/g, '') }))
  }
  field(name: string) {
    const label = this.labels.find(l => new RegExp(`name="${name}"`).test(l.html))
    if (!label) throw new Error(`no field ${name}`)
    const control = label.html.match(new RegExp(`<(input|select)[^>]*name="${name}"[^>]*>`))![0]
    return { label, control }
  }
}

describe('#161 | every Required field shows * and aria-required', () => {
  it.each([
    ['ubnd', ['name', 'email', 'phone', 'village_id']],
    ['provider', ['name', 'email', 'phone', 'village_id', 'address']],
  ] as const)('%s form: %j', (kind, names) => {
    const page = render(kind)
    for (const name of names) {
      const { label, control } = page.field(name)
      expect(control, name).toMatch(/aria-required="true"/)
      expect(control, name).toMatch(/\srequired=""/)
      expect(label.html, name).toMatch(/<span[^>]*aria-hidden="true"[^>]*>\s*\*\s*<\/span>/)
    }
  })

  it('a legend explains the mark', () => {
    expect(render('ubnd').html).toMatch(/\* bắt buộc/)
  })
})

describe('#161 | no behaviour change', () => {
  it('names, required, pattern and maxLength stay as before', () => {
    const page = render('provider')
    expect(page.field('name').control).toMatch(/maxLength="100"/)
    expect(page.field('email').control).toMatch(/type="email"/)
    expect(page.field('phone').control).toMatch(/pattern="\\\+\?\[0-9\]\{10,15\}"/)
    expect(page.field('address').control).toMatch(/maxLength="500"/)
    expect(render('ubnd').html).not.toMatch(/name="address"/)
  })
})
