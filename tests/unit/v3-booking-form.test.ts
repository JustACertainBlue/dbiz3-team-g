import { describe, expect, it, vi } from 'vitest'
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }))
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CreateBookingForm from '@/app/provider/[providerId]/bookings/new/CreateBookingForm'

// Screen 35 price: bookings.agreed_price_total stores the agreed total, so "Giá mỗi khách" is editable (mockup).
const experience = { experience_id: 'e1', name: 'Nặn gốm', duration_minutes: 60, max_participants: 12, price_per_person: 150000, conditions: { notice_period: 24, cancellation_policy: { a: 1 } }, rules: [{ pax: 5, pct: 5 }] }
const html = renderToStaticMarkup(React.createElement(CreateBookingForm, { providerId: 'p1', agencies: [{ agency_id: 'a1', company_name: 'Công ty A' }], experiences: [experience], initial: { guests: '10' } }))

describe('CreateBookingForm price', () => {
  it('"Giá mỗi khách" is an editable number input defaulting to the list price', () => {
    const input = html.match(/<input[^>]*id="pp"[^>]*>/)?.[0] ?? ''
    expect(input).toContain('value="150000"')
    expect(input).not.toContain('readOnly')
    expect(input).toContain('type="number"')
  })
  it('total, struck-out list price and group discount follow the guests', () => {
    expect(html).toContain('1.425.000')
    expect(html).toContain('1.500.000')
    expect(html).toContain('giảm 5% giá đoàn')
  })
})
