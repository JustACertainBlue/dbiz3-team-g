import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { markGroupArrival } from '@/lib/booking/mark-arrival'
import { bookingView, completionRows } from '@/lib/booking/booking-view'

// Screen 10d "Tour đã hoàn thành!": the rows are built from a booking completed through F-SCHED-06 (unit test, no DEV data).
const provider = DEMO_IDENTITIES.provider
const BOOKED = '4bf17b30-9819-5c47-b745-06be7171087b'
const after = () => new Date('2099-01-01T09:05:00+07:00')

describe('completionRows (10d)', () => {
  beforeEach(() => demoRepository().reset())

  it('after the arrival is confirmed the booking is Completed and the rows match the mockup', async () => {
    const result = await markGroupArrival(provider, BOOKED, { now: after })
    expect(result.transition_applied).toBe(true)
    const booking = demoRepository().find('bookings', r => r.booking_id === BOOKED)!
    const experience = demoRepository().find('experiences', r => r.experience_id === booking.experience_id)
    const rows = completionRows(bookingView({ booking, experience, providerName: '', agencyName: '', now: after() }), booking)
    expect(rows.map(row => row[0])).toEqual(['Mã đặt chỗ', 'Trải nghiệm', 'Ngày giờ', 'Số khách', 'Đã nhận', 'Xác nhận lúc', 'Trạng thái'])
    expect(rows[0][1]).toBe(`HAB-${BOOKED.slice(0, 6).toUpperCase()}`)
    expect(rows[5][1]).toBe('09:05, 01/01/2099')
    expect(rows[6][1]).toBe('Hoàn thành tour')
    expect(rows[4][1]).toMatch(/₫$/)
  })
  it('a second confirmation is refused and changes nothing', async () => {
    await markGroupArrival(provider, BOOKED, { now: after })
    const again = await markGroupArrival(provider, BOOKED, { now: () => new Date('2099-01-01T10:00:00+07:00') })
    expect(again).toMatchObject({ transition_applied: false, validation_error: 'Booking Not Booked' })
    expect(demoRepository().find('bookings', r => r.booking_id === BOOKED)!.arrival_at).toMatch(/09:05/)
  })
  it('before the start time the arrival is refused', async () => {
    const early = await markGroupArrival(provider, BOOKED, { now: () => new Date('2000-01-01T09:00:00+07:00') })
    expect(early).toMatchObject({ transition_applied: false, validation_error: 'Tour Start Time Not Reached' })
  })
})
