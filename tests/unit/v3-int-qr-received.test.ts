/** UI v3 integration Step 2 item 6: screen 29 "Đã nhận qua QR tháng N" = agreed_price_total of the workshop's bookings whose "Đã nhận tiền" was pressed in the month. */
import { describe, expect, it } from 'vitest'
import { receivedViaQr, formatReceived } from '@/lib/provider/qr-received'

const booking = (id: string, price: string, provider = 'pv-1') => ({ booking_id: id, provider_id: provider, agreed_price_total: price, status: 'Booked' })
const press = (id: string, at: string, from = 'On hold', to = 'Booked') => ({ booking_id: id, from_status: from, to_status: to, changed_at: at })

describe('receivedViaQr', () => {
  const bookings = [booking('b1', '1500000.00'), booking('b2', '2500000.00'), booking('b3', '999.00'), booking('b4', '700.00'), booking('b5', '300.00', 'pv-2')]
  const history = [
    press('b1', '2026-11-03T09:00:00+07:00'),
    press('b2', '2026-11-20T09:00:00+07:00'),
    press('b3', '2026-10-30T09:00:00+07:00'),            // other month
    press('b4', '2026-11-05T09:00:00+07:00', 'On hold', 'Cancelled'), // not "Đã nhận tiền"
    press('b5', '2026-11-06T09:00:00+07:00'),            // other workshop
    press('b1', '2026-11-07T09:00:00+07:00', 'Booked', 'Completed'), // later step, not a second press
  ]
  it('sums agreed_price_total of this workshop\'s On hold → Booked presses in the month', () => {
    expect(receivedViaQr({ bookings, history }, 'pv-1', '2026-11')).toBe(4_000_000)
  })
  it('counts a booking once even if it has two presses', () => {
    expect(receivedViaQr({ bookings, history: [...history, press('b1', '2026-11-08T09:00:00+07:00')] }, 'pv-1', '2026-11')).toBe(4_000_000)
  })
  it('excludes a booking cancelled after the provider received payment', () => {
    const cancelled = bookings.map(row => row.booking_id === 'b1' ? { ...row, status: 'Cancelled' } : row)
    const events = [...history, press('b1', '2026-11-09T09:00:00+07:00', 'Booked', 'Cancelled')]
    expect(receivedViaQr({ bookings: cancelled, history: events }, 'pv-1', '2026-11')).toBe(2_500_000)
  })
  it('is 0 when nothing was received', () => { expect(receivedViaQr({ bookings, history: [] }, 'pv-1', '2026-11')).toBe(0) })
  it('formats like the other money values', () => {
    expect(formatReceived(4_000_000)).toBe(`${(4_000_000).toLocaleString('vi-VN')} ₫`)
    expect(formatReceived(0)).toBe('0 ₫')
  })
})
