/**
 * Issue #209 — EXP120 Public Explore: for a Guest, Request Quote and Chat are disabled and show "Login required";
 * attempting a protected action goes to Login (spec-EXP.md:260 FR-001 "Guest: … Request Quote and Chat remain
 * disabled and display \"Login required\". Attempting a protected action redirects to Login."; BR-009 :312;
 * screen-spec-EXP120.md §3 #7 "Login | Restricted actions require login"). The component test stays; since UI v3 Đợt 1
 * (decisions 2026-11-18 #3/#4) the Explore card no longer renders it and shows "Giá từ … /khách" to Guests.
 */
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import GuestLockedActions from '@/app/explore/GuestLockedActions'
import ExperienceCard from '@/app/explore/v3/ExperienceCard'
import type { CardView } from '@/lib/explore/v3-home'

const CARD: CardView = { id: 'e1', providerId: 'p1', name: 'Nặn gốm', craft: 'Gốm sứ', location: 'Bát Tràng, Gia Lâm, Hà Nội',
  meta: '60 phút · Tối đa 12 khách/ca', highlights: [], priceFrom: 150000, image: null, why: null }

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

  // Changed requirement (UI v3 Đợt 1, human decisions 2026-11-18 #3, #4 and #10; docs/build/ui-v3-spec-deviations.md
  // rows #4, #5 and #10): the Guest card shows "Giá từ … /khách" and no locked Request Quote / Chat.
  it('the Guest Explore card shows "Giá từ … /khách" and no locked actions (UI v3, decisions #3/#4)', () => {
    const page = readFileSync('src/app/explore/page.tsx', 'utf8')
    expect(page).not.toContain('GuestLockedActions')
    const html = renderToStaticMarkup(React.createElement(ExperienceCard, { card: CARD, showDetailLink: false }))
    expect(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).toContain('Giá từ 150.000 ₫ /khách')
    expect(html).not.toContain('Cần đăng nhập')
    expect(html).not.toContain('Yêu cầu báo giá')
    expect(html).not.toContain('aria-disabled')
  })
})
