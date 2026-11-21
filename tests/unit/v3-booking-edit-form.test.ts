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
const html = (status: string) => renderToStaticMarkup(React.createElement(EditBookingForm, { detail: detail(status), backHref: '/back' }))

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
  it('keeps the start in Hanoi time and the Lưu thay đổi / Huỷ buttons; no JSON policy field', () => {
    const markup = html('On hold')
    expect(markup).toContain('value="2026-11-23T09:00"')
    expect(markup).toContain('Lưu thay đổi')
    expect(markup).not.toContain('Cancellation policy')
  })
})
