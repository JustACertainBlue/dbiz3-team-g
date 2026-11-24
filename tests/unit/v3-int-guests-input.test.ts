/** UI v3 integration Step 2 item 5: the guests field of the search bars is a typed number, not a 1-60 dropdown. */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import SearchBar from '@/app/explore/v3/SearchBar'

;(globalThis as { React?: typeof React }).React = React

describe('SearchBar (01, 21, 02, 04, 23)', () => {
  const html = renderToStaticMarkup(React.createElement(SearchBar, { guests: '25' }))
  it('has a numeric guests input holding the value, and no select', () => {
    expect(html).toMatch(/<input[^>]*name="guests"[^>]*type="number"|<input[^>]*type="number"[^>]*name="guests"/)
    expect(html).toContain('value="25"')
    expect(html).not.toContain('<select')
    expect(html).not.toContain('Chọn số khách')
  })
})

describe('village page 03', () => {
  const source = readFileSync('src/app/village/[villageId]/page.tsx', 'utf8')
  it('uses GuestsField for guests; the experience picker stays a select', () => {
    expect(source).toContain('GuestsField')
    expect(source).not.toContain('GUEST_OPTIONS')
    expect(source).toContain('name="ex"')
  })
})
