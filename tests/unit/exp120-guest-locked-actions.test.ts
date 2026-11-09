/**
 * Issue #209 — EXP120 Public Explore: for a Guest, Request Quote and Chat are disabled and show "Login required";
 * attempting a protected action goes to Login (spec-EXP.md:260 FR-001 "Guest: … Request Quote and Chat remain
 * disabled and display \"Login required\". Attempting a protected action redirects to Login."; BR-009 :312;
 * screen-spec-EXP120.md §3 #7 "Login | Restricted actions require login").
 */
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import GuestLockedActions from '@/app/explore/GuestLockedActions'

describe('#209 | EXP120 Guest sees locked Request Quote / Chat', () => {
  it('both actions are marked disabled, lead to /login and say "Cần đăng nhập"', () => {
    const html = renderToStaticMarkup(React.createElement(GuestLockedActions, { buttonClassName: 'xv-button' }))
    const links = [...html.matchAll(/<a[^>]*>.*?<\/a>/g)].map(m => m[0])
    expect(links.map(l => l.replace(/<[^>]+>/g, ''))).toEqual(['Yêu cầu báo giá', 'Nhắn tin'])
    for (const link of links) {
      expect(link).toMatch(/href="\/login"/)
      expect(link).toMatch(/aria-disabled="true"/)
    }
    expect(html).toContain('Cần đăng nhập')
  })

  it('the Explore card renders the locked actions for a Guest only (Agency cards unchanged)', () => {
    const page = readFileSync('src/app/explore/page.tsx', 'utf8')
    expect(page).toMatch(/\{!isAgency && <GuestLockedActions buttonClassName="xv-button xv-button--outline" \/>\}/)
  })
})
