import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { createBooking } from '@/lib/booking/create-booking'
import { createBookingRequest } from '@/lib/booking/booking-request'
import { groupPrice } from '@/lib/booking/group-price'
import { confirmBookerInfo } from '@/lib/booking/booker-info'
import { changeBookingStatus } from '@/lib/booking/change-status'

// Part B step 1: price shown (not edited) in 35, request note copied to the booking, agreed conditions go into the
// "Xưởng đã giữ chỗ" message, and the contact columns are written by the agency on 06 ("Hoàn tất đặt chỗ").
const provider = DEMO_IDENTITIES.provider
const agency = DEMO_IDENTITIES.agency
const EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
const now = () => new Date('2026-11-21T09:00:00+07:00')
const base = (extra: Record<string, unknown> = {}) => ({
  experience_id: EXPERIENCE, agency_id: agency.agencyId, start_at: '2026-11-23T09:00:00+07:00', duration: 60, group_size: 10,
  booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } }, ...extra,
})
const code = (promise: Promise<unknown>) => promise.then(() => 'OK', (error: { code?: string }) => error.code)
const bookingRow = (id: string) => demoRepository().find('bookings', r => r.booking_id === id)!
const updates = (id: string) => demoRepository().all('chat_messages').filter(m => m.booking_id === id && m.message_kind === 'Booking Update')

describe('groupPrice', () => {
  const rules = [{ pax: 5, pct: 5 }, { pax: 10, pct: 8 }]
  it('applies the best reached Group Discount and keeps the list price struck out', () => {
    expect(groupPrice(150000, 10, rules)).toEqual({ total: 1380000, old: 1500000, pct: 8 })
    expect(groupPrice(150000, 6, rules)).toEqual({ total: 855000, old: 900000, pct: 5 })
  })
  it('no discount below the first threshold', () => {
    expect(groupPrice(150000, 3, rules)).toEqual({ total: 450000, old: null, pct: 0 })
    expect(groupPrice(150000, 3, [])).toEqual({ total: 450000, old: null, pct: 0 })
  })
})

describe('createBooking price, request note, conditions', () => {
  beforeEach(() => demoRepository().reset())

  it('without agreed_price the server stores the list price with the group discount', async () => {
    const experience = demoRepository().find('experiences', r => r.experience_id === EXPERIENCE)!
    const rules = demoRepository().all('experience_discount_rules').filter(r => r.experience_id === EXPERIENCE && r.rule_kind === 'Group Discount').map(r => ({ pax: Number(r.pax_threshold), pct: Number(r.discount_percentage) }))
    const expected = groupPrice(Number(experience.price_per_person), 10, rules).total
    const { booking_id } = await createBooking(provider, base(), { now })
    expect(Number(bookingRow(booking_id).agreed_price_total)).toBe(expected)
  })
  it('a given agreed_price still wins (API callers)', async () => {
    const { booking_id } = await createBooking(provider, base({ agreed_price: 1234567 }), { now })
    expect(Number(bookingRow(booking_id).agreed_price_total)).toBe(1234567)
  })
  it('request_message_id copies the request note into bookings.note', async () => {
    const request = await createBookingRequest(agency, { experience_id: EXPERIENCE, date: '2026-11-23', slot_start: '09:00', slot_end: '10:00', group_size: 10, note: 'Cần ghế thấp' }, { now })
    const { booking_id } = await createBooking(provider, base({ request_message_id: request.message_id }), { now })
    expect(bookingRow(booking_id).note).toBe('Cần ghế thấp')
  })
  it('a request of another pair, or a plain message, is refused', async () => {
    const plain = demoRepository().all('chat_messages')[0].message_id
    expect(await code(createBooking(provider, base({ request_message_id: plain }), { now }))).toBe('VALIDATION_ERROR')
    expect(await code(createBooking(provider, base({ request_message_id: 'nope' }), { now }))).toBe('VALIDATION_ERROR')
  })
  it('agreed_conditions go into the "Xưởng đã giữ chỗ" message and are not stored as note', async () => {
    const { booking_id } = await createBooking(provider, base({ agreed_conditions: 'Đoàn đến trước 08:50.' }), { now })
    expect(updates(booking_id).some(m => m.text.includes('Đoàn đến trước 08:50.'))).toBe(true)
    expect('note' in bookingRow(booking_id)).toBe(false)
  })
  it('the provider no longer writes contact columns', async () => {
    const { booking_id } = await createBooking(provider, base({ contact_name: 'X', contact_phone: '0912345678' }), { now })
    expect('contact_name' in bookingRow(booking_id)).toBe(false)
  })
})

describe('confirmBookerInfo (06 "Hoàn tất đặt chỗ")', () => {
  beforeEach(() => demoRepository().reset())
  const info = { contact_name: 'Lý Gia Hân', contact_phone: '0932 000 002', note: 'Cần hoá đơn sớm' }
  const hold = async () => (await createBooking(provider, base(), { now })).booking_id

  it('saves the three columns, posts "Công ty báo đã thanh toán", keeps the status', async () => {
    const id = await hold(); const before = updates(id).length
    await confirmBookerInfo(agency, id, info, { now })
    expect(bookingRow(id)).toMatchObject({ ...info, status: 'On hold' })
    const added = updates(id).slice(before)
    expect(added).toHaveLength(1)
    expect(added[0].text).toContain('Công ty báo đã thanh toán')
  })
  it('name and phone are required; phone must look like a phone; note ≤ 1000', async () => {
    const id = await hold()
    expect(await code(confirmBookerInfo(agency, id, { ...info, contact_name: ' ' }, { now }))).toBe('VALIDATION_ERROR')
    expect(await code(confirmBookerInfo(agency, id, { ...info, contact_phone: 'abc' }, { now }))).toBe('VALIDATION_ERROR')
    expect(await code(confirmBookerInfo(agency, id, { ...info, note: 'x'.repeat(1001) }, { now }))).toBe('VALIDATION_ERROR')
    expect('contact_name' in bookingRow(id)).toBe(false)
  })
  it('only the owning agency; only while On hold', async () => {
    const id = await hold()
    expect(await code(confirmBookerInfo(provider, id, info, { now }))).toBe('FORBIDDEN')
    expect(await code(confirmBookerInfo({ ...agency, agencyId: 'ebf4fcfa-1013-5ecd-b7c6-e0d8e9fa0277' }, id, info, { now }))).toBe('FORBIDDEN')
    await changeBookingStatus(provider, id, { target_status: 'Booked' }, { now })
    expect(await code(confirmBookerInfo(agency, id, info, { now }))).toBe('INVALID_TRANSITION')
  })
})
