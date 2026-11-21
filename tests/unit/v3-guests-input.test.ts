import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import GuestsInput, { guestsError } from '@/app/explore/v3/GuestsInput'

// Number input for the guests of a booking request (04, 24, request form, 35): max = the experience's guests per slot.
describe('guestsError', () => {
  it('empty is not an error here (required handles it); 0 and negatives and decimals ask for a number from 1', () => {
    expect(guestsError('', 12)).toBe('')
    expect(guestsError('0', 12)).toBe('Nhập số khách từ 1')
    expect(guestsError('-3', 12)).toBe('Nhập số khách từ 1')
    expect(guestsError('2.5', 12)).toBe('Nhập số khách từ 1')
  })
  it('above the maximum: "Tối đa N khách mỗi ca"', () => {
    expect(guestsError('13', 12)).toBe('Tối đa 12 khách mỗi ca')
    expect(guestsError('12', 12)).toBe('')
    expect(guestsError('1', 12)).toBe('')
  })
  it('no maximum known: only the lower bound applies', () => {
    expect(guestsError('500', null)).toBe('')
  })
})
describe('GuestsInput markup', () => {
  const render = (value: string, max: number | null = 12) => renderToStaticMarkup(React.createElement(GuestsInput, { id: 'g', name: 'guests', value, max, onChange: () => {} }))
  it('is a numeric input: type number, inputMode numeric, min 1, max = the maximum, not a select', () => {
    const markup = render('5')
    expect(markup).toMatch(/<input[^>]*type="number"/)
    expect(markup).toMatch(/inputMode="numeric"/)
    expect(markup).toMatch(/min="1"/); expect(markup).toMatch(/max="12"/)
    expect(markup).not.toContain('<select')
  })
  it('shows the error under the field (role alert, linked by aria-describedby) when out of range', () => {
    const markup = render('20')
    expect(markup).toContain('Tối đa 12 khách mỗi ca')
    expect(markup).toContain('role="alert"')
    expect(markup).toMatch(/aria-invalid="true"/)
    expect(markup).toMatch(/aria-describedby="g-err"/)
  })
  it('no error markup when the value is fine', () => {
    expect(render('5')).not.toContain('role="alert"')
  })
})

// Wiring: every guests field of the booking flow is the numeric input with the experience maximum.
import { readFileSync } from 'node:fs'
import { vi } from 'vitest'
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }))
import CreateBookingForm from '@/app/provider/[providerId]/bookings/new/CreateBookingForm'
import EditBookingForm from '@/app/provider/[providerId]/bookings/[bookingId]/edit/EditBookingForm'
import RequestButton from '@/app/explore/v3/RequestButton'

describe('guests field in the booking flow', () => {
  const experience = { experience_id: 'e1', name: 'N', duration_minutes: 60, max_participants: 12, price_per_person: 1, conditions: { notice_period: 1, cancellation_policy: { a: 1 } } }
  it('35 create: numeric input, max = max_participants, message under the field for 20 guests', () => {
    const markup = renderToStaticMarkup(React.createElement(CreateBookingForm, { providerId: 'p', agencies: [{ agency_id: 'a', company_name: 'A' }], experiences: [experience], initial: { guests: '20' } }))
    expect(markup).toMatch(/<input[^>]*id="gs"[^>]*type="number"[^>]*inputMode="numeric"|<input[^>]*id="gs"[^>]*inputMode="numeric"[^>]*type="number"/)
    expect(markup).toContain('max="12"'); expect(markup).toContain('Tối đa 12 khách mỗi ca')
  })
  it('35 edit: numeric input with the maximum and the same message', () => {
    const detail = { booking_id: 'b', start_at: '2026-11-23T09:00:00+07:00', end_at: '2026-11-23T10:00:00+07:00', group_size: 20, agreed_price: 1, status: 'On hold', actions: {} } as never
    const markup = renderToStaticMarkup(React.createElement(EditBookingForm, { detail, backHref: '/b', maxGuests: 12 }))
    expect(markup).toMatch(/inputMode="numeric"/); expect(markup).toContain('max="12"'); expect(markup).toContain('Tối đa 12 khách mỗi ca')
  })
  it('request form (04/24): numeric input with the experience maximum', () => {
    const markup = renderToStaticMarkup(React.createElement(RequestButton, { experiences: [{ id: 'e', name: 'N', max: 12 }], guests: 5, initialOpen: true }))
    expect(markup).toMatch(/inputMode="numeric"/); expect(markup).toContain('max="12"')
  })
  it('04 "Giá & lịch trống" bar uses the field (page-specific, not the shared SearchBar)', () => {
    const page = readFileSync('src/app/explore/experiences/[id]/page.tsx', 'utf8')
    const bar = page.slice(page.indexOf('aria-label="Đổi ngày và số khách"'), page.indexOf('<SlotTable'))
    expect(bar).toContain('<GuestsField'); expect(bar).not.toContain('<select name="guests"')
  })
})
