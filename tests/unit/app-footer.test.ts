/**
 * UI v3 (Đợt 0) footer, human decision 2026-11-18: only on /explore for Guest and Tour Agency; name, one-line
 * introduction and "© 2026 Hanoi Artisan Bridge"; no link columns and no "Nguồn ảnh" link. The root layout has no
 * footer any more; /image-credits stays as a page.
 */
import { describe, expect, it } from 'vitest'
import React from 'react'
import { readFileSync, existsSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import AppFooter from '@/app/components/footer/AppFooter'

;(globalThis as { React?: typeof React }).React = React

describe('AppFooter', () => {
  const html = renderToStaticMarkup(React.createElement(AppFooter))
  const text = html.replace(/<[^>]+>/g, '|').split('|').map(part => part.trim()).filter(Boolean)
  it('shows exactly the name, the introduction and the copyright line', () => {
    expect(text).toEqual([
      'Hanoi Artisan Bridge',
      'Nối công ty lữ hành với xưởng nghề ở các làng quanh Hà Nội.',
      '© 2026 Hanoi Artisan Bridge',
    ])
  })
  it('has no links (no columns, no "Nguồn ảnh")', () => {
    expect(html).not.toContain('<a')
    expect(html).toMatch(/^<footer[^>]*class="hab-footer"/)
  })
})

describe('root layout and /explore', () => {
  it('the root layout renders no footer and no link to /image-credits', () => {
    const layout = readFileSync('src/app/layout.tsx', 'utf8')
    expect(layout).not.toContain('<footer')
    expect(layout).not.toContain('/image-credits')
  })
  it('/image-credits still exists as a page', () => {
    expect(existsSync('src/app/image-credits/page.tsx')).toBe(true)
  })
  it('the Explore page renders AppFooter only when footerVisible allows it', () => {
    const page = readFileSync('src/app/explore/page.tsx', 'utf8')
    expect(page).toMatch(/footerVisible\(session, '\/explore'\) && <AppFooter \/>/)
    expect(page).not.toContain('xv-footer')
  })
})
