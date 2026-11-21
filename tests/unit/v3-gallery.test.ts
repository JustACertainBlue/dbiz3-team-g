/**
 * Human review 2026-11-19 (second round, item 2): one gallery for 03/04/23/24 that never shows an empty tile.
 * 5+ images: 1 large + 2×2, the last tile says "+N ảnh"; 4: 1 large + one wide on top right and 2 below;
 * 3: 1 large + 2 stacked; 2: two halves; 1: one full; 0: nothing.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Gallery from '@/app/explore/v3/Gallery'

;(globalThis as { React?: typeof React }).React = React
// Step 2B: images are { url, width, height } (0×0 = unknown, so no reordering here).
const images = (n: number) => Array.from({ length: n }, (_, i) => ({ url: `/api/prf/media/f${i + 1}`, width: 0, height: 0 }))
const render = (n: number) => renderToStaticMarkup(React.createElement(Gallery, { images: images(n), alt: 'Làng Bát Tràng' }))
const tiles = (html: string) => [...html.matchAll(/<div class="v3g__t v3g__t(\d)">/g)].map(m => Number(m[1]))

describe('Gallery', () => {
  it('renders nothing without images', () => {
    expect(render(0)).toBe('')
  })
  it.each([[1, [1]], [2, [1, 2]], [3, [1, 2, 3]], [4, [1, 2, 3, 4]], [5, [1, 2, 3, 4, 5]], [8, [1, 2, 3, 4, 5]]])('%i image(s): layout class and tiles', (n, expected) => {
    const html = render(n)
    expect(html).toMatch(new RegExp(`^<div class="v3g v3g--n${Math.min(n, 5)}"`))
    expect(tiles(html)).toEqual(expected)
    expect(html).not.toContain('v3-cover--empty')
    expect((html.match(/<img /g) ?? []).length).toBe(Math.min(n, 5))
  })
  it('puts "+N ảnh" on the fifth tile only when there are more than 5 images', () => {
    expect(render(8)).toMatch(/<div class="v3g__t v3g__t5">[\s\S]*<span class="v3d-more">\+3 ảnh<\/span><\/div><\/div>$/)
    expect(render(5)).not.toContain('ảnh</span>')
    expect(render(8)).toContain('alt="Làng Bát Tràng"')
  })
  it('has a CSS layout per count (4: wide top right, 2 below; 3: two stacked; 2: halves)', () => {
    const css = readFileSync('src/app/explore/v3/explore-v3.css', 'utf8')
    expect(css).toMatch(/\.v3g--n5 \{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\); grid-template-rows: repeat\(2, minmax\(0, 1fr\)\)/)
    expect(css).toMatch(/\.v3g--n4 \.v3g__t2 \{ grid-column: span 2; \}/)
    expect(css).toMatch(/\.v3g--n3 \{[^}]*grid-template-columns: 2fr 1fr; grid-template-rows: repeat\(2, minmax\(0, 1fr\)\)/)
    expect(css).toMatch(/\.v3g--n2 \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); grid-template-rows: 1fr/)
    expect(css).toMatch(/\.v3g--n1 \{[^}]*grid-template-columns: 1fr; grid-template-rows: 1fr/)
  })
  it('is the gallery of 03, 04/23 and 24, with no empty-cover fallback', () => {
    for (const page of ['src/app/village/[villageId]/page.tsx', 'src/app/explore/experiences/[id]/page.tsx', 'src/app/explore/providers/[id]/page.tsx']) {
      const source = readFileSync(page, 'utf8')
      expect(source).toContain('<Gallery ')
      expect(source).not.toMatch(/mosaic__main"><CoverImage src=\{null\}/)
    }
  })
})
