/**
 * Issue #202 — DSC124 Public Experience Detail: for a Guest, Request Quote / Chat are disabled and lead to Login
 * (spec-EXP.md:262 FR-003 "ACTION BUTTONS: Tour Agency — Request Quote / Chat enabled. Guest — Request Quote / Chat
 * disabled and redirects to Login."; BR-009 :312). The Login control of screen-spec-DSC124 §3 #6 stays. The component test
 * stays; since UI v3 Đợt 1 (mockup 23) the detail page no longer renders the locked buttons.
 */
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import GuestLockedActions from '@/app/explore/GuestLockedActions'

describe('#202 | DSC124 Guest sees locked Request Quote / Chat', () => {
  it('both actions are marked disabled and lead to /login, with "Cần đăng nhập"', () => {
    const html = renderToStaticMarkup(React.createElement(GuestLockedActions, { buttonClassName: 'button button--secondary' }))
    const links = [...html.matchAll(/<a[^>]*>.*?<\/a>/g)].map(m => m[0])
    expect(links.map(l => l.replace(/<[^>]+>/g, ''))).toEqual(['Yêu cầu báo giá', 'Nhắn tin'])
    for (const link of links) expect(link).toMatch(/href="\/login"[^>]*aria-disabled="true"|aria-disabled="true"[^>]*href="\/login"/)
    expect(html).toContain('Cần đăng nhập')
  })

  // Changed requirement (UI v3 Đợt 1, mockup 23, human decisions 2026-11-18 #1, #3, #4 and #10;
  // docs/build/ui-v3-spec-deviations.md rows #4, #5 and #10): the Guest detail page no longer shows locked
  // Request Quote / Chat; restricted actions still lead to Login: "Đăng nhập để đặt chỗ", "Đăng nhập để xem giá đoàn",
  // and the register link "Đăng ký tài khoản công ty lữ hành".
  it('the Guest detail page leads restricted actions to /login and offers registration (UI v3, mockup 23)', () => {
    const page = readFileSync('src/app/explore/experiences/[id]/page.tsx', 'utf8')
    expect(page).not.toContain('GuestLockedActions')
    expect(page).toMatch(/<Link className="hab-btn hab-btn--primary" href="\/login">Đăng nhập để đặt chỗ<\/Link>/)
    expect(page).toMatch(/<Link href="\/login" className="v3r__lock">(<Lock aria-hidden="true" \/>)?Đăng nhập để xem giá đoàn<\/Link>/)
    expect(page).toMatch(/href="\/register">Đăng ký tài khoản công ty lữ hành<\/Link>/)
  })
})
