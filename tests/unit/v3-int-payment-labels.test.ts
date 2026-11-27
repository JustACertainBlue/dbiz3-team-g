/** UI v3 integration Step 2 item 10: one payment wording on every screen (Agency and Provider): Booked = "Đã thanh toán", On hold = "Chờ thanh toán"; the chat pill keeps "Xưởng đã nhận tiền". */
import { describe, expect, it } from 'vitest'
import { statusLabel } from '@/lib/status-labels'
import { eventView } from '@/app/messages/chat-view'

describe('payment labels', () => {
  it('booking and calendar status labels', () => {
    for (const family of ['booking', 'calendar'] as const) {
      expect(statusLabel(family, 'On hold')).toBe('Chờ thanh toán')
      expect(statusLabel(family, 'Booked')).toBe('Đã thanh toán')
    }
    expect(statusLabel('booking', 'Completed')).toBe('Hoàn tất')
    expect(statusLabel('booking', 'Cancelled')).toBe('Đã huỷ')
  })
  it('chat pills: the payment pill keeps "Xưởng đã nhận tiền", for new and older stored sentences', () => {
    expect(eventView('Đặt chỗ đã thanh toán: Nặn gốm, 20/11, 10 pax').title).toBe('Xưởng đã nhận tiền')
    expect(eventView('Đặt chỗ chờ thanh toán: Nặn gốm, 20/11, 10 pax').title).toBe('Xưởng đã giữ chỗ')
    expect(eventView('Đặt chỗ hoàn tất: Nặn gốm, 20/11, 10 pax').title).toBe('Tour đã hoàn thành')
    expect(eventView('Đặt chỗ đã huỷ: Nặn gốm, 20/11, 10 pax').title).toBe('Đặt chỗ đã huỷ')
    expect(eventView('Booking Đã thanh toán: Nặn gốm, 20/11, 10 pax').title).toBe('Xưởng đã nhận tiền')
    expect(eventView('Booking Đã đặt: Nặn gốm, 20/11, 10 pax').title).toBe('Xưởng đã nhận tiền')
    expect(eventView('Booking Chờ thanh toán: Nặn gốm, 20/11, 10 pax').title).toBe('Xưởng đã giữ chỗ')
    expect(eventView('Booking Tạm giữ: Nặn gốm, 20/11, 10 pax').title).toBe('Xưởng đã giữ chỗ')
  })
})
