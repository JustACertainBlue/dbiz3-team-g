import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW, hanoiTimestamp } from '@/lib/booking/clock'
import { createBooking } from '@/lib/booking/create-booking'
import { buildCalendarBlocks, calculateAvailability } from '@/lib/booking/availability'

// T007–T008: F-SCHED-09 (US-2; FR-009; #32, #72, #77; AC-BKG-HOURS; SC-003).
const PROVIDER = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374' // Monday 08:00–17:00
const BOOKED = '4bf17b30-9819-5c47-b745-06be7171087b'  // Mon 2026-10-05 09:00–10:00
const seedNow = { now: () => new Date(SEED_NOW) }
const t = (date: string, hhmm: string) => `${date}T${hhmm}:00+07:00`
const hours = () => demoRepository().all('provider_operating_hours').filter(row => row.provider_id === PROVIDER)
const bookings = () => demoRepository().all('bookings').filter(row => row.provider_id === PROVIDER)

describe('T007 | buildCalendarBlocks (#72)', () => {
  beforeEach(() => demoRepository().reset())

  it('splits an open Monday into Unavailable, Available and Booked, half-open, per local day', () => {
    expect(buildCalendarBlocks(hours(), bookings(), '2026-10-05', '2026-10-05', 'owner')).toEqual([
      { start_at: t('2026-10-05', '00:00'), end_at: t('2026-10-05', '08:00'), status: 'Unavailable' },
      { start_at: t('2026-10-05', '08:00'), end_at: t('2026-10-05', '09:00'), status: 'Available' },
      { start_at: t('2026-10-05', '09:00'), end_at: t('2026-10-05', '10:00'), status: 'Booked', booking_id: BOOKED },
      { start_at: t('2026-10-05', '10:00'), end_at: t('2026-10-05', '17:00'), status: 'Available' },
      { start_at: t('2026-10-05', '17:00'), end_at: t('2026-10-06', '00:00'), status: 'Unavailable' },
    ])
  })

  it('a day without operating hours is Unavailable all day (US-2 AS-4)', () => {
    expect(buildCalendarBlocks(hours(), bookings(), '2026-10-06', '2026-10-06', 'owner')).toEqual([
      { start_at: t('2026-10-06', '00:00'), end_at: t('2026-10-07', '00:00'), status: 'Unavailable' },
    ])
  })

  it('a Booking outside the hours is still occupied (#32)', () => {
    const blocks = buildCalendarBlocks(hours(), bookings(), '2026-10-10', '2026-10-10', 'owner')
    expect(blocks.map(block => [block.start_at.slice(11, 16), block.end_at.slice(11, 16), block.status])).toEqual([
      ['00:00', '09:00', 'Unavailable'], ['09:00', '10:00', 'Booked'], ['10:00', '00:00', 'Unavailable'],
    ])
  })

  it('Completed and Cancelled Bookings block nothing (US-2 AS-3)', () => {
    const extra = [
      { ...bookings()[0], booking_id: 'c1', status: 'Cancelled', start_at: t('2026-10-12', '09:00'), end_at: t('2026-10-12', '10:00') },
      { ...bookings()[0], booking_id: 'c2', status: 'Completed', start_at: t('2026-10-12', '11:00'), end_at: t('2026-10-12', '12:00') },
    ]
    expect(buildCalendarBlocks(hours(), extra, '2026-10-12', '2026-10-12', 'owner').map(block => block.status))
      .toEqual(['Unavailable', 'Available', 'Unavailable'])
  })

  it('merges adjacent ranges with the same status', () => {
    const split = [
      { provider_id: PROVIDER, weekday: '1', local_start: '08:00:00', local_end: '12:00:00' },
      { provider_id: PROVIDER, weekday: '1', local_start: '12:00:00', local_end: '17:00:00' },
    ]
    const blocks = buildCalendarBlocks(split, [], '2026-10-12', '2026-10-12', 'owner')
    expect(blocks.filter(block => block.status === 'Available')).toEqual([
      { start_at: t('2026-10-12', '08:00'), end_at: t('2026-10-12', '17:00'), status: 'Available' },
    ])
  })

  it('no operating hours at all → no Available block (AC-BKG-HOURS)', () => {
    const blocks = buildCalendarBlocks([], bookings(), '2026-10-01', '2026-10-31', 'owner')
    expect(blocks.some(block => block.status === 'Available')).toBe(false)
    expect(blocks.filter(block => block.status === 'Booked')).toHaveLength(2)
  })

  it('the public view carries no booking_id', () => {
    const blocks = buildCalendarBlocks(hours(), bookings(), '2026-10-05', '2026-10-05', 'public')
    expect(blocks.every(block => !('booking_id' in block))).toBe(true)
  })
})

describe('T008 | calculateAvailability (#77, SC-003)', () => {
  beforeEach(() => demoRepository().reset())

  it('returns the calendar, the slots and calculated_at; date_to defaults to date_from', () => {
    const now = new Date(SEED_NOW)
    const result = calculateAvailability(PROVIDER, { date_from: '2026-10-05' }, now)
    expect(result.availability_calendar).toEqual(buildCalendarBlocks(hours(), bookings(), '2026-10-05', '2026-10-05', 'owner'))
    expect(result.available_slots).toEqual([
      { start_at: t('2026-10-05', '08:00'), end_at: t('2026-10-05', '09:00') },
      { start_at: t('2026-10-05', '10:00'), end_at: t('2026-10-05', '17:00') },
    ])
    expect(result.occupied_slots).toEqual([{ booking_id: BOOKED, start_at: t('2026-10-05', '09:00'), end_at: t('2026-10-05', '10:00'), status: 'Booked' }])
    expect(result.calculated_at).toBe(hanoiTimestamp(now.getTime()))
  })

  it('a new On hold occupies its hour at once (US-2 AS-2)', async () => {
    const id = (await createBooking(DEMO_IDENTITIES.provider, {
      experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
      start_at: t('2026-10-12', '09:00'), duration: 60, group_size: 10, agreed_price: 2000000,
      booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
    }, seedNow)).booking_id
    const result = calculateAvailability(PROVIDER, { date_from: '2026-10-12' }, new Date(SEED_NOW))
    expect(result.occupied_slots).toEqual([{ booking_id: id, start_at: t('2026-10-12', '09:00'), end_at: t('2026-10-12', '10:00'), status: 'On hold' }])
  })
})
