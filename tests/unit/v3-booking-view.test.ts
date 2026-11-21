import { describe, expect, it } from 'vitest'
import { bookingView } from '@/lib/booking/booking-view'

// Screens 06/07/10/10c view model: what the pages print, derived from stored rows.
const booking = {
  booking_id: '4bf17b30-9819-5c47-b745-06be7171087b', agency_id: 'a', provider_id: 'p', experience_id: 'e', status: 'On hold',
  start_at: '2026-11-24T09:00:00+07:00', end_at: '2026-11-24T10:00:00+07:00', duration_minutes: '60', group_size: '10', agreed_price_total: '1425000.00',
  hold_expires_at: '2026-11-27T14:00:00+07:00', created_at: '2026-11-24T14:00:00+07:00',
  conditions_snapshot: JSON.stringify({ notice_period_hours: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } }),
  contact_name: 'Lý Gia Hân', contact_phone: '0932000002', note: 'Cần ghế thấp',
}
const experience = { name: 'Nặn gốm thủ công', price_per_person: '150000', max_participants: '12', experience_location_address: 'Bát Tràng, Gia Lâm, Hà Nội' }

describe('bookingView', () => {
  const view = bookingView({ booking, experience, providerName: 'Xưởng thủ công Bát Tràng', agencyName: 'Công ty Du lịch Tràng An', now: new Date('2026-11-25T09:00:00+07:00') })
  it('prints code, date, range and period', () => {
    expect(view.code).toBe('HAB-4BF17B')
    expect(view.dateLong).toBe('Thứ Ba, 24/11/2026')
    expect(view.range).toBe('09:00–10:00')
    expect(view.period).toBe('Ca sáng')
    expect(view.minutes).toBe(60)
  })
  it('price: list price struck out, discount line, total as agreed', () => {
    expect(view.price).toEqual({ perGuest: 150000, guests: 10, listTotal: 1500000, total: 1425000, discount: 75000, discountPct: 5 })
  })
  it('no discount when the agreed price equals the list price', () => {
    const plain = bookingView({ booking: { ...booking, agreed_price_total: '1500000.00' }, experience, providerName: '', agencyName: '', now: new Date() })
    expect(plain.price.discount).toBe(0)
    expect(plain.price.discountPct).toBe(0)
  })
  it('hold: until text and remaining text only while On hold', () => {
    expect(view.holdUntil).toBe('14:00, Thứ Sáu 27/11')
    expect(view.holdLeft).toBe('2 ngày 5 giờ')
    const booked = bookingView({ booking: { ...booking, status: 'Booked' }, experience, providerName: '', agencyName: '', now: new Date('2026-11-25T09:00:00+07:00') })
    expect(booked.holdUntil).toBe('')
  })
  it('step follows the status: On hold = 3, Booked = 4, Completed = 5 (all done), Cancelled = 0', () => {
    const step = (status: string) => bookingView({ booking: { ...booking, status }, experience, providerName: '', agencyName: '', now: new Date() }).step
    expect([step('On hold'), step('Booked'), step('Completed'), step('Cancelled')]).toEqual([3, 4, 5, 0])
  })
  it('cancel line from the snapshot, contact and note passed through', () => {
    expect(view.cancelLine).toBe('Huỷ trước 24 giờ: hoàn 80% số tiền')
    expect(view).toMatchObject({ contactName: 'Lý Gia Hân', contactPhone: '0932000002', note: 'Cần ghế thấp', address: 'Bát Tràng, Gia Lâm, Hà Nội' })
  })
})

describe('bookingView edge cases', () => {
  const at = (iso: string, extra: Record<string, string> = {}) => bookingView({ booking: { ...booking, ...extra }, experience, providerName: '', agencyName: '', now: new Date(iso) })
  it('under one day left prints hours and minutes', () => {
    expect(at('2026-11-27T08:30:00+07:00').holdLeft).toBe('5 giờ 30 phút')
  })
  it('after the deadline nothing is negative', () => {
    expect(at('2026-11-28T09:00:00+07:00').holdLeft).toBe('0 giờ 0 phút')
  })
  it('a snapshot that is not JSON gives no cancel line and does not throw', () => {
    expect(at('2026-11-25T09:00:00+07:00', { conditions_snapshot: 'not json' }).cancelLine).toBe('')
  })
  it('a missing experience prints empty names and a zero list price (no discount, no NaN)', () => {
    const view = bookingView({ booking, experience: undefined, providerName: '', agencyName: '', now: new Date() })
    expect(view.experienceName).toBe('')
    expect(view.price.discount).toBe(0)
    expect(Number.isNaN(view.price.discountPct)).toBe(false)
  })
  it('a start after 17:00 is Ca tối; an agreed price above the list price is not a discount', () => {
    expect(at('2026-11-25T09:00:00+07:00', { start_at: '2026-11-24T18:00:00+07:00', end_at: '2026-11-24T19:00:00+07:00' }).period).toBe('Ca tối')
    expect(at('2026-11-25T09:00:00+07:00', { agreed_price_total: '1600000.00' }).price.discount).toBe(0)
  })
})
