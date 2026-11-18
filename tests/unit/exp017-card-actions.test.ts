/**
 * Issue #204 — EXP017 Explore (Tour Agency).
 * - spec-EXP FR-002 / FR-007 (`source_context` Enum[Card, Detail Page], `docs/spec/specs/spec-EXP.md:288`): the
 *   handoff helper and the ExperienceActions component are unchanged. Since UI v3 Đợt 1 (decision 2026-11-18 #3) the
 *   Explore cards no longer render them (docs/build/ui-v3-spec-deviations.md #5).
 * - FR-010 (`spec-EXP.md:269`): "Show refreshed results with a subtle indicator" when F-EXPLORE-10 re-ranks.
 */
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }))
import ExperienceActions, { handoffBody } from '@/app/explore/ExperienceActions'
import RefreshedNotice from '@/app/explore/RefreshedNotice'
import ExperienceCard from '@/app/explore/v3/ExperienceCard'
import type { CardView } from '@/lib/explore/v3-home'

const CARD: CardView = { id: 'e1', providerId: 'p1', name: 'Nặn gốm', craft: 'Gốm sứ', location: 'Bát Tràng, Gia Lâm, Hà Nội',
  meta: '60 phút · Tối đa 12 khách/ca', highlights: [], priceFrom: 150000, image: null, why: null }

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

  // Changed requirement (UI v3 Đợt 1, human decisions 2026-11-18 #3 and #10; docs/build/ui-v3-spec-deviations.md
  // rows #5 and #10): Explore cards no longer carry Request Quote / Chat; booking requests move to the detail page
  // ("Gửi yêu cầu đặt chỗ", branch ui/v3-booking). The card shows "Giá từ … /khách" and "Xem chi tiết".
  it('Agency cards have no Request Quote / Chat buttons; they show "Giá từ" and "Xem chi tiết" (UI v3, decision #3)', () => {
    const page = readFileSync('src/app/explore/page.tsx', 'utf8')
    expect(page).not.toContain('ExperienceActions')
    const html = renderToStaticMarkup(React.createElement(ExperienceCard, { card: CARD, showDetailLink: true, track: true }))
    expect(html).not.toContain('Yêu cầu báo giá')
    expect(html).not.toContain('Nhắn tin')
    expect(html).toContain('Giá từ')
    expect(html).toMatch(/href="\/explore\/experiences\/e1"[^>]*>Xem chi tiết<\/a>/)
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
