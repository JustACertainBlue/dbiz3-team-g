/**
 * Issue #191 — BKG134 Create Booking: Cancel makes no change and goes to BKG133 Booking Management
 * (screen-spec-BKG134.md:56, §5: "| 2 | Cancel | Select | No mutation | BKG133 |"), i.e. /provider/{providerId}/bookings.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }))
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CreateBookingForm from '@/app/provider/[providerId]/bookings/new/CreateBookingForm'

describe('#191 | BKG134 Cancel goes to BKG133', () => {
  it('the Cancel link points to the Provider booking list, not the profile', () => {
    const html = renderToStaticMarkup(React.createElement(CreateBookingForm, { providerId: 'p1', agencies: [{ agency_id: 'a1', company_name: 'Synthetic Agency' }],
      experiences: [{ experience_id: 'e1', name: 'Synthetic workshop', duration_minutes: 60, max_participants: 10, price_per_person: 100000, conditions: { notice_period: 24, cancellation_policy: {} } }] }))
    const cancel = html.match(/<a[^>]*>Cancel<\/a>/)
    expect(cancel?.[0]).toMatch(/href="\/provider\/p1\/bookings"/)
  })
})
