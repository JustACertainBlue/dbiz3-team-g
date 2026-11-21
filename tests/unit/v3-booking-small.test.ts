import { describe, expect, it } from 'vitest'
import { encodeBookingRequest, parseBookingRequest, requestPreview } from '@/lib/booking/request-card'
import { eventView } from '@/app/messages/chat-view'
import { groupPrice } from '@/lib/booking/group-price'

// Backfill for helpers first written together with their code.
describe('request card', () => {
  const card = { experience_id: 'e', experience_name: 'Nặn gốm', date: '2026-11-24', slot_start: '08:30', slot_end: '09:30', group_size: 10, note: 'Ghế thấp' }
  it('round trips through the stored text', () => {
    expect(parseBookingRequest(encodeBookingRequest(card))).toEqual({ type: 'booking_request', v: 1, ...card })
  })
  it('rejects malformed JSON, wrong version and wrong types', () => {
    expect(parseBookingRequest('{bad')).toBeNull()
    expect(parseBookingRequest(JSON.stringify({ type: 'booking_request', v: 2, date: 'x', group_size: 1 }))).toBeNull()
    expect(parseBookingRequest(JSON.stringify({ type: 'booking_request', v: 1, date: 'x', group_size: '1' }))).toBeNull()
    expect(parseBookingRequest(null)).toBeNull()
    expect(parseBookingRequest('')).toBeNull()
  })
  it('preview omits the slot when there is none', () => {
    expect(requestPreview({ type: 'booking_request', v: 1, ...card, slot_start: '', slot_end: '' })).toBe('Yêu cầu đặt chỗ: Nặn gốm, 24/11/2026, 10 khách')
  })
})
describe('chat pills', () => {
  it('"Công ty báo đã thanh toán" keeps its title', () => {
    expect(eventView('Công ty báo đã thanh toán: Nặn gốm, 2026-11-24 09:00–10:00, 10 pax, 1,425,000 VND').title).toBe('Công ty báo đã thanh toán')
  })
})
describe('groupPrice boundaries', () => {
  it('exactly at the threshold counts; one below does not; the larger percentage wins; rounding is to the dong', () => {
    expect(groupPrice(100000, 5, [{ pax: 5, pct: 5 }]).pct).toBe(5)
    expect(groupPrice(100000, 4, [{ pax: 5, pct: 5 }]).pct).toBe(0)
    expect(groupPrice(100000, 10, [{ pax: 10, pct: 3 }, { pax: 5, pct: 8 }]).pct).toBe(8)
    expect(groupPrice(33333, 5, [{ pax: 5, pct: 5 }]).total).toBe(Math.round(33333 * 5 * 0.95))
  })
})
