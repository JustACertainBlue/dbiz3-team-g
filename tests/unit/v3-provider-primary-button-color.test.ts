/** Hotfix D23: inside the provider area a primary button (<a class="hab-btn hab-btn--primary">) must keep its white text.
 *  Cause: provider-ui.css coloured every link `.provider-workspace :where(a){color:#355b46}`; it loads after ui.css and has the
 *  same specificity as `.hab-btn--primary`, so it won and the text became #355b46 on the #165235 background. */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const css = (path: string) => readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const rules = (source: string) => [...source.matchAll(/([^{}@]+)\{([^{}]*)\}/g)].map(m => ({ selector: m[1].trim(), body: m[2] }))

describe('provider area: primary button text stays white', () => {
  it('ui.css gives .hab-btn--primary white text', () => {
    const rule = rules(css('src/app/components/ui/ui.css')).find(r => r.selector === '.hab-btn--primary')
    expect(rule?.body).toMatch(/color:\s*var\(--c-white\)/)
  })

  it('no generic link colour in provider-ui.css can reach a .hab-btn', () => {
    // a selector that ends in a bare link (`.provider-workspace a`, `.provider-workspace :where(a)`) and sets `color`
    const offenders = rules(css('src/app/provider/provider-ui.css'))
      .filter(r => /(^|[\s>+~])(:where\(\s*)?a(\s*\))?(:(hover|visited|link|focus))?\s*$/.test(r.selector.split(',').pop()!.trim()) || r.selector.split(',').some(s => /(^|[\s>+~])(:where\(\s*)?a(\s*\))?$/.test(s.trim())))
      .filter(r => /(^|;)\s*color\s*:/.test(r.body))
      .filter(r => !r.selector.split(',').every(s => /:not\(\.hab-btn\)/.test(s)))
    expect(offenders.map(r => r.selector)).toEqual([])
  })
})
