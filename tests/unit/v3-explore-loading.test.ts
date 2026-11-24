/**
 * Human review 2026-11-19 (A1): the /explore loading screen uses the v3 tokens on a white page, with no cream gradient
 * and none of the old explore-module / xv styles. It keeps the hidden "Đang tải trải nghiệm…" text and aria-busy.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ExploreLoading from '@/app/explore/loading'

;(globalThis as { React?: typeof React }).React = React

describe('/explore loading (v3)', () => {
  const html = renderToStaticMarkup(React.createElement(ExploreLoading))
  it('renders a v3 skeleton with no old explore classes', () => {
    expect(html).toMatch(/^<div class="hab-band v3-loading" aria-busy="true"/)
    expect(html).toContain('Đang tải trải nghiệm…')
    expect(html).not.toMatch(/explore-module|class="xv/)
    expect((html.match(/class="v3-card v3-loading__card"/g) ?? []).length).toBe(6)
  })
  it('styles it on white with v3 tokens and no gradient', () => {
    const css = readFileSync('src/app/explore/v3/explore-v3.css', 'utf8')
    const rules = css.split('\n').filter(line => line.startsWith('.v3-loading'))
    expect(rules.join('\n')).toMatch(/\.v3-loading \{[^}]*background: var\(--c-white\)/)
    expect(rules.join('\n')).toMatch(/\.v3-loading__bar \{[^}]*background: var\(--c-ghost\)/)
    expect(rules.join('\n')).not.toMatch(/gradient/)
  })
})
