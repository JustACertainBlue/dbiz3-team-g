import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { findConflict } from '@/lib/booking/conflicts'

// T011: BR-005, spec #40, #41, OQ #32. Rows come from the seed (volatile repository).
const BAT_TRANG = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374' // Booked 4bf17b30… Mon 2026-10-05 09:00–10:00
const PROVIDER_70E = '70efa801-a908-5e16-8510-fd094fbdc020' // On hold 54d7a276… Sun 2026-10-11 09:00–10:15, hold expired 2026-10-01
const PROVIDER_085 = '0858b5e8-89e1-577f-904a-562150c4fe4f' // Cancelled f55711e1… Mon 2026-10-12 09:00–10:30

describe('T011 | conflict check', () => {
  beforeEach(() => demoRepository().reset())
  const bookings = () => demoRepository().all('bookings')

  it('BR-005: an interval overlapping a Booked Booking of the same Provider conflicts', () => {
    const conflict = findConflict(bookings(), BAT_TRANG, '2026-10-05T09:30:00+07:00', '2026-10-05T10:30:00+07:00')
    expect(conflict?.booking_id).toBe('4bf17b30-9819-5c47-b745-06be7171087b')
  })

  it('#41: an interval that only touches an existing Booking does not conflict', () => {
    expect(findConflict(bookings(), BAT_TRANG, '2026-10-05T10:00:00+07:00', '2026-10-05T11:00:00+07:00')).toBeUndefined()
    expect(findConflict(bookings(), BAT_TRANG, '2026-10-05T08:00:00+07:00', '2026-10-05T09:00:00+07:00')).toBeUndefined()
  })

  it('only On hold and Booked block: a Cancelled Booking does not', () => {
    expect(findConflict(bookings(), PROVIDER_085, '2026-10-12T09:30:00+07:00', '2026-10-12T10:00:00+07:00')).toBeUndefined()
  })

  it("another Provider's Booking does not block", () => {
    expect(findConflict(bookings(), PROVIDER_085, '2026-10-05T09:30:00+07:00', '2026-10-05T10:30:00+07:00')).toBeUndefined()
  })

  it('#40 and OQ #32: an expired On hold outside its Provider hours still blocks its slot', () => {
    const conflict = findConflict(bookings(), PROVIDER_70E, '2026-10-11T09:30:00+07:00', '2026-10-11T10:30:00+07:00')
    expect(conflict?.booking_id).toBe('54d7a276-90a2-5c70-be22-cb59ea95ea14')
  })
})
