import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { createBooking } from '@/lib/booking/create-booking'
import { calculateAvailability } from '@/lib/booking/availability'

// T009 (#81): F-SCHED-09 and F-SCHED-03 agree. Every slot is taken from calculateAvailability
// (analyze M4), so this file only passes once F-SCHED-09 exists and matches create.
const PROVIDER = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const seedNow = { now: () => new Date(SEED_NOW) }
const HOUR = 3_600_000
const iso = (ms: number) => new Date(ms + 7 * HOUR).toISOString().slice(0, 19) + '+07:00'
const create = (startAt: string) => createBooking(DEMO_IDENTITIES.provider, {
  experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
  start_at: startAt, duration: 60, group_size: 10, agreed_price: 2000000,
  booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
}, seedNow)
const availability = (date: string) => calculateAvailability(PROVIDER, { date_from: date }, new Date(SEED_NOW))

describe('T009 | F-SCHED-09 agrees with create (#81)', () => {
  beforeEach(() => demoRepository().reset())

  it('an Available slot is accepted', async () => {
    const slot = availability('2026-10-12').available_slots[0]
    await expect(create(slot.start_at)).resolves.toMatchObject({ status: 'On hold' })
  })

  it('an occupied slot is rejected', async () => {
    const occupied = availability('2026-10-05').occupied_slots[0]
    await expect(create(iso(Date.parse(occupied.start_at) + HOUR / 2))).rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' })
  })

  it('an Unavailable slot is rejected, also on a day without hours', async () => {
    const evening = availability('2026-10-12').availability_calendar.find(block => block.status === 'Unavailable' && block.start_at.endsWith('17:00:00+07:00'))!
    await expect(create(evening.start_at)).rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' })
    const tuesday = availability('2026-10-13').availability_calendar
    expect(tuesday).toHaveLength(1)
    expect(tuesday[0].status).toBe('Unavailable')
    await expect(create(iso(Date.parse(tuesday[0].start_at) + 8 * HOUR))).rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' })
  })
})
