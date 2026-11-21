import { describe, expect, it, vi } from 'vitest'
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }))
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import EditBookingForm from '@/app/provider/[providerId]/bookings/[bookingId]/edit/EditBookingForm'

// Screen 35 edit (BKG144), mockup TaoDatCho "Sửa": status cards, group and price sections, "Lưu thay đổi".
const detail = (status: string) => ({
  booking_id: 'b1', experience_name: 'Nặn gốm', start_at: '2026-11-23T09:00:00+07:00', end_at: '2026-11-23T10:00:00+07:00', group_size: 10, agreed_price: 1425000,
  notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 }, status, last_updated_at: '2026-11-21T09:00:00+07:00',
  actions: { confirm: true, update: true, cancel: true, mark_arrival: false },
}) as never
const slots = [{ start: '09:00', end: '10:00', label: 'Ca sáng' }, { start: '14:00', end: '15:00', label: 'Ca chiều' }]
const html = (status: string, withSlots = true) => renderToStaticMarkup(React.createElement(EditBookingForm, { detail: detail(status), backHref: '/back', slots: withSlots ? slots : [] }))

describe('EditBookingForm (mockup)', () => {
  it('posts, and offers the four status cards with the mockup wording', () => {
    const markup = html('On hold')
    expect(markup).toMatch(/<form[^>]*method="post"/)
    for (const label of ['Đang giữ chỗ', 'Đã thanh toán', 'Huỷ', 'Hoàn thành']) expect(markup).toContain(label)
    expect(markup).toContain('Chỉ qua “Xác nhận đoàn đã đến”')
    expect(markup).toContain('Cần ghi lý do')
  })
  it('Hoàn thành is never selectable (aria-disabled, no radio)', () => {
    const markup = html('Booked')
    expect(markup).toMatch(/aria-disabled="true"[^>]*>[\s\S]*Hoàn thành/)
    expect(markup.match(/type="radio"/g)?.length).toBe(3)
  })
  it('On hold: Đã thanh toán and Huỷ can be chosen; Booked: checked, Đang giữ chỗ disabled, Huỷ still allowed', () => {
    const radio = (markup: string, value: string) => markup.match(new RegExp(`<input type="radio"[^>]*value="${value}"[^>]*>`))![0]
    const onHold = html('On hold'), booked = html('Booked')
    expect(radio(onHold, 'Booked')).not.toContain('disabled'); expect(radio(onHold, 'Cancelled')).not.toContain('disabled')
    expect(radio(booked, 'On hold')).toContain('disabled'); expect(radio(booked, 'Booked')).toContain('checked'); expect(radio(booked, 'Cancelled')).not.toContain('disabled')
  })
  it('Ngày + Giờ bắt đầu: date input and a select of the experience time slots, current start selected (Hanoi time)', () => {
    const markup = html('On hold')
    expect(markup).toMatch(/<input[^>]*type="date"[^>]*value="2026-11-23"|<input[^>]*value="2026-11-23"[^>]*type="date"/)
    const select = markup.match(/<select[^>]*id="tm"[\s\S]*?<\/select>/)?.[0] ?? ''
    expect(select).toContain('value="09:00"'); expect(select).toContain('value="14:00"')
    expect(select).toMatch(/<option[^>]*selected[^>]*value="09:00"|<option[^>]*value="09:00"[^>]*selected/)
    expect(markup).not.toContain('datetime-local')
    expect(markup).toContain('Kết thúc 10:00 (60 phút)')
  })
  it('a current start that is not a slot is kept as an extra option so the form does not silently move it', () => {
    const odd = renderToStaticMarkup(React.createElement(EditBookingForm, { detail: { ...(detail('On hold') as object), start_at: '2026-11-23T09:30:00+07:00', end_at: '2026-11-23T10:30:00+07:00' } as never, backHref: '/b', slots }))
    expect(odd).toMatch(/<option[^>]*value="09:30"/)
  })
  it('an experience without slots falls back to a time input', () => {
    expect(html('On hold', false)).toMatch(/<input[^>]*id="tm"[^>]*type="time"|<input[^>]*type="time"[^>]*id="tm"/)
  })
  it('has the Lưu thay đổi button and no JSON policy field', () => {
    const markup = html('On hold')
    expect(markup).toContain('Lưu thay đổi')
    expect(markup).not.toContain('Cancellation policy')
  })
})
