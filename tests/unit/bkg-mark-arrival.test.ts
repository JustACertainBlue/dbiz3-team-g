import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { createBooking } from '@/lib/booking/create-booking'
import { findConflict } from '@/lib/booking/conflicts'
import { markGroupArrival } from '@/lib/booking/mark-arrival'

// T012: F-SCHED-06 — BR-010, FR-006, #11, US-5 AS-4.
const provider = DEMO_IDENTITIES.provider
const PROVIDER_ID = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const BOOKED = '4bf17b30-9819-5c47-b745-06be7171087b' // Mon 2026-10-05 09:00–10:00
const at = (iso: string) => ({ now: () => new Date(iso) })
const row = (id: string) => demoRepository().find('bookings', r => r.booking_id === id)!
const historyOf = (id: string) => demoRepository().all('booking_status_history').filter(r => r.booking_id === id)

const APPLIED_KEYS = ['arrived_at', 'availability_released', 'booking_status', 'private_schedule_synced', 'status_history_entry', 'transition_applied']
const REJECTED_KEYS = ['availability_released', 'booking_status', 'private_schedule_synced', 'transition_applied', 'validation_error']

describe('T012 | markGroupArrival (F-SCHED-06)', () => {
  beforeEach(() => demoRepository().reset())

  it('Booked and now >= start_at → Completed, arrival_at, availability released', async () => {
    const history = historyOf(BOOKED).length
    const result = await markGroupArrival(provider, BOOKED, at('2026-10-05T09:00:00+07:00'))
    expect(Object.keys(result).sort()).toEqual(APPLIED_KEYS)
    expect(result).toMatchObject({ transition_applied: true, booking_status: 'Completed', availability_released: true, private_schedule_synced: true })
    expect(row(BOOKED).status).toBe('Completed')
    expect(Date.parse(row(BOOKED).arrival_at)).toBe(Date.parse('2026-10-05T09:00:00+07:00'))
    expect(historyOf(BOOKED)).toHaveLength(history + 1)
    expect(findConflict(demoRepository().all('bookings'), PROVIDER_ID, '2026-10-05T09:00:00+07:00', '2026-10-05T10:00:00+07:00')).toBeUndefined()
  })

  it('BR-010: before the start → Tour Start Time Not Reached, nothing written', async () => {
    const before = { ...row(BOOKED) }
    const result = await markGroupArrival(provider, BOOKED, at('2026-10-05T08:59:00+07:00'))
    expect(Object.keys(result).sort()).toEqual(REJECTED_KEYS)
    expect(result).toMatchObject({ transition_applied: false, booking_status: 'Booked', validation_error: 'Tour Start Time Not Reached', availability_released: false, private_schedule_synced: false })
    expect(row(BOOKED)).toEqual(before)
  })

  it('On hold or Cancelled → Booking Not Booked, nothing written', async () => {
    const created = await createBooking(provider, {
      experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
      start_at: '2026-10-12T09:00:00+07:00', duration: 60, group_size: 10, agreed_price: 2000000,
      booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
    }, { now: () => new Date(SEED_NOW) })
    const onHoldResult = await markGroupArrival(provider, created.booking_id, at('2026-10-02T09:00:00+07:00'))
    expect(onHoldResult).toMatchObject({ transition_applied: false, booking_status: 'On hold', validation_error: 'Booking Not Booked' })
    expect(row(created.booking_id).status).toBe('On hold')

    demoRepository().update('bookings', r => r.booking_id === BOOKED, { status: 'Cancelled' })
    const cancelledResult = await markGroupArrival(provider, BOOKED, at('2026-10-05T10:00:00+07:00'))
    expect(cancelledResult).toMatchObject({ transition_applied: false, booking_status: 'Cancelled', validation_error: 'Booking Not Booked' })
  })
})
