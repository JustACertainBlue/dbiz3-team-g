import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }))
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CreateBookingForm from '@/app/provider/[providerId]/bookings/new/CreateBookingForm'
import BookerForm from '@/app/agency/[agencyId]/bookings/[bookingId]/BookerForm'

// Server-rendered forms are live before hydration: without method="post" a click on submit would send the fields in the URL (GET).
const create = renderToStaticMarkup(React.createElement(CreateBookingForm, { providerId: 'p1', agencies: [{ agency_id: 'a1', company_name: 'A' }], experiences: [{ experience_id: 'e1', name: 'N', duration_minutes: 60, max_participants: 10, price_per_person: 1, conditions: { notice_period: 1, cancellation_policy: { a: 1 } } }] }))
const booker = renderToStaticMarkup(React.createElement(BookerForm, { bookingId: 'b1', companyName: 'C', email: 'e@example.invalid', contactName: '', contactPhone: '', note: '', saved: false }))

describe('forms never fall back to GET', () => {
  it('create booking (35) is method=post', () => { expect(create).toMatch(/<form[^>]*method="post"/) })
  it('booker info (06) is method=post', () => { expect(booker).toMatch(/<form[^>]*method="post"/) })
  it('request dialog (04/24) is method=post', () => { expect(readFileSync('src/app/explore/v3/RequestButton.tsx', 'utf8')).toMatch(/<form[^>]*method="post"/) })
  it('no new form submits by GET except the search box of 05, which carries no personal data', () => {
    for (const file of ['src/app/explore/v3/RequestButton.tsx', 'src/app/provider/[providerId]/bookings/new/CreateBookingForm.tsx', 'src/app/agency/[agencyId]/bookings/[bookingId]/BookerForm.tsx', 'src/app/agency/[agencyId]/bookings/[bookingId]/AgencyCancel.tsx']) {
      expect(readFileSync(file, 'utf8')).not.toMatch(/method="get"/i)
    }
  })
})
