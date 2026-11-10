/**
 * Issue #204 — EXP017 Explore (Tour Agency).
 * - spec-EXP FR-002 ("For Tour Agency, View Details, Request Quote and Chat are enabled") and FR-007 (`source_context`
 *   Enum[Card, Detail Page], `docs/spec/specs/spec-EXP.md:288`): Agency cards offer Request Quote and Chat, sent with
 *   source_context "Card"; FR-011 still hides Request Quote once this Agency sent one.
 * - FR-010 (`spec-EXP.md:269`): "Show refreshed results with a subtle indicator" when F-EXPLORE-10 re-ranks.
 */
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }))
import ExperienceActions, { handoffBody } from '@/app/explore/ExperienceActions'
import RefreshedNotice from '@/app/explore/RefreshedNotice'

describe('#204 | EXP017 card actions (FR-002, FR-007)', () => {
  it('the handoff carries the source context it is given; the detail page default stays "Detail Page"', () => {
    expect(handoffBody('quote', 'e1', 'Card')).toEqual({ action: 'quote', experience_id: 'e1', source_context: 'Card' })
    expect(handoffBody('chat', 'e1', 'Detail Page')).toEqual({ action: 'chat', experience_id: 'e1', source_context: 'Detail Page' })
  })

  it('renders Request Quote and Chat buttons for a card', () => {
    const html = renderToStaticMarkup(React.createElement(ExperienceActions, { experienceId: 'e1', sourceContext: 'Card' }))
    expect(html).toContain('>Yêu cầu báo giá</button>')
    expect(html).toContain('>Nhắn tin</button>')
  })

  it('Agency cards render the actions with source_context "Card" and the FR-011 quote state', () => {
    const page = readFileSync('src/app/explore/page.tsx', 'utf8')
    expect(page).toMatch(/\{isAgency && <ExperienceActions experienceId=\{card\.id\} sourceContext="Card" quoteSent=\{quoteSent\.has\(card\.id\)\} \/>\}/)
  })
})

describe('#204 | EXP017 refreshed-results indicator (FR-010)', () => {
  it('shows a polite status line only after a refresh', () => {
    expect(renderToStaticMarkup(React.createElement(RefreshedNotice, { show: false }))).toBe('')
    const html = renderToStaticMarkup(React.createElement(RefreshedNotice, { show: true }))
    expect(html).toMatch(/role="status"/)
    expect(html).toContain('Đã cập nhật thứ tự kết quả theo các trải nghiệm bạn quan tâm.')
  })

  it('the tracker turns the indicator on when the server reports results_refreshed_indicator', () => {
    const tracker = readFileSync('src/app/explore/ExploreTracker.tsx', 'utf8')
    expect(tracker).toMatch(/if \(result\?\.results_refreshed_indicator\) \{ setRefreshed\(true\); router\.refresh\(\); \}/)
    expect(tracker).toContain('<RefreshedNotice show={refreshed} />')
  })
})
