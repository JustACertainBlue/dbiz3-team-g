/**
 * Issue #202 — DSC124 Public Experience Detail: for a Guest, Request Quote / Chat are disabled and lead to Login
 * (spec-EXP.md:262 FR-003 "ACTION BUTTONS: Tour Agency — Request Quote / Chat enabled. Guest — Request Quote / Chat
 * disabled and redirects to Login."; BR-009 :312). The Login control of screen-spec-DSC124 §3 #6 stays.
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

  it('the detail page shows them to a Guest, next to the existing Login / Register links', () => {
    const page = readFileSync('src/app/explore/experiences/[id]/page.tsx', 'utf8')
    expect(page).toMatch(/: <div className="stack-actions"><GuestLockedActions buttonClassName="button button--secondary" \/><Link className="button" href="\/login">Đăng nhập<\/Link>/)
  })
})
