import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { bookingActions } from '@/lib/booking/booking-actions'
import { createBooking } from '@/lib/booking/create-booking'
import { changeBookingStatus } from '@/lib/booking/change-status'
import { markGroupArrival } from '@/lib/booking/mark-arrival'
import { listProviderBookings } from '@/lib/booking/list-bookings'

// T007–T012: F-SCHED-10 List Bookings (US-6; AS-1..AS-3, AS-5, AS-6; SC-011; #59–#64, #67).
const provider = DEMO_IDENTITIES.provider
const at = (iso: string) => ({ now: () => new Date(iso) })
const seedNow = at(SEED_NOW)
const OCT_6 = '2026-10-06T00:00:00+07:00'
const BOOKED = '4bf17b30-9819-5c47-b745-06be7171087b' // Mon 2026-10-05 09:00, Hồng Hà, 6 pax
const BOOKED_SAT = '5782011c'                         // Sat 2026-10-10
const OTHER_PROVIDER = '70efa801-a908-5e16-8510-fd094fbdc020'
const EXPIRED_HOLD = '54d7a276-90a2-5c70-be22-cb59ea95ea14' // hold until 2026-10-01T08:00
const otherOwner = { ...provider, providerId: OTHER_PROVIDER }

// Analyze H1: a hold fixture is created with the same `now` as the call that checks it.
async function hold(startAt: string, options = seedNow) {
  return (await createBooking(provider, {
    experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
    start_at: startAt, duration: 60, group_size: 10, agreed_price: 2000000,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
  }, options)).booking_id
}
const ids = (result: { bookings: { booking_id: string }[] }) => result.bookings.map(row => row.booking_id)
const rowOf = <T extends { booking_id: string }>(result: { bookings: T[] }, id: string): T => result.bookings.find(row => row.booking_id.startsWith(id))!
const invalid = (promise: Promise<unknown>) => expect(promise).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
const forbidden = (promise: Promise<unknown>) => expect(promise).rejects.toMatchObject({ code: 'FORBIDDEN' })
const WRITE_TABLES = ['bookings', 'booking_status_history', 'chat_messages', 'chat_sessions', 'chat_participants']
const snapshot = () => JSON.parse(JSON.stringify(WRITE_TABLES.map(table => demoRepository().all(table))))

describe('T007 | own Bookings only, ascending start_at (AS-1, #60, SC-011)', () => {
  beforeEach(() => demoRepository().reset())

  it('lists only the session Provider\'s Bookings', async () => {
    const result = await listProviderBookings(provider, {}, seedNow)
    expect(ids(result)).toHaveLength(2)
    expect(ids(result)[0]).toBe(BOOKED)
    expect(ids(result)[1].startsWith(BOOKED_SAT)).toBe(true)
    expect(ids(result)).not.toContain(EXPIRED_HOLD)
  })

  it('orders by start_at ascending', async () => {
    const late = await hold('2026-10-19T09:00:00+07:00')
    const early = await hold('2026-10-12T09:00:00+07:00')
    const result = await listProviderBookings(provider, {}, seedNow)
    expect(ids(result)[0]).toBe(BOOKED)
    expect(ids(result).slice(2)).toEqual([early, late])
  })

  it('breaks start_at ties by booking_id', async () => {
    const a = await hold('2026-10-12T09:00:00+07:00')
    const b = await hold('2026-10-12T11:00:00+07:00')
    demoRepository().update('bookings', row => row.booking_id === b, { start_at: '2026-10-12T09:00:00+07:00', end_at: '2026-10-12T10:00:00+07:00' })
    const result = await listProviderBookings(provider, { status: 'On hold' }, seedNow)
    expect(ids(result)).toEqual([a, b].sort())
  })
})

describe('T008 | row shape and JSON numbers (§5.1 FR-010)', () => {
  beforeEach(() => demoRepository().reset())

  it('a Booked row has the FR-010 fields and no hold expiry', async () => {
    const result = await listProviderBookings(provider, {}, seedNow)
    const row = rowOf(result, BOOKED) as unknown as Record<string, unknown>
    expect(row).toMatchObject({
      booking_id: BOOKED,
      experience_name: 'Nặn gốm thủ công',
      agency_name: 'Công ty Du lịch Hồng Hà',
      start_at: '2026-10-05T09:00:00+07:00',
      end_at: '2026-10-05T10:00:00+07:00',
      group_size: 6,
      status: 'Booked',
      requires_action: false,
    })
    expect(typeof row.group_size).toBe('number')
    expect(row).not.toHaveProperty('hold_expires_at')
  })

  it('an On hold row has hold_expires_at; counts are numbers', async () => {
    const id = await hold('2026-10-12T09:00:00+07:00')
    const result = await listProviderBookings(provider, {}, seedNow)
    expect(rowOf(result, id).hold_expires_at).toEqual(expect.any(String))
    expect(typeof result.total_count).toBe('number')
    for (const value of Object.values(result.status_counts)) expect(typeof value).toBe('number')
  })
})

describe('T009 | requires_action (#59, AS-3, SC-011, BR-010, BR-017)', () => {
  beforeEach(() => demoRepository().reset())

  it('Booked needs action only from start_at on', async () => {
    let result = await listProviderBookings(provider, {}, seedNow)
    expect(rowOf(result, BOOKED).requires_action).toBe(false)
    expect(rowOf(result, BOOKED_SAT).requires_action).toBe(false)
    result = await listProviderBookings(provider, {}, at(OCT_6))
    expect(rowOf(result, BOOKED).requires_action).toBe(true)
    expect(rowOf(result, BOOKED_SAT).requires_action).toBe(false)
    result = await listProviderBookings(provider, {}, at('2026-10-05T09:00:00+07:00'))
    expect(rowOf(result, BOOKED).requires_action).toBe(true)
  })

  it('an active On hold needs action; Cancelled and Completed do not', async () => {
    const active = await hold('2026-10-12T09:00:00+07:00')
    const cancelled = await hold('2026-10-19T09:00:00+07:00')
    await changeBookingStatus(provider, cancelled, { target_status: 'Cancelled', cancellation_reason: 'test' }, seedNow)
    let result = await listProviderBookings(provider, {}, seedNow)
    expect(rowOf(result, active).requires_action).toBe(true)
    expect(rowOf(result, cancelled)).toMatchObject({ status: 'Cancelled', requires_action: false })
    await markGroupArrival(provider, BOOKED, at(OCT_6))
    result = await listProviderBookings(provider, {}, at('2026-10-06T00:00:01+07:00'))
    expect(rowOf(result, BOOKED)).toMatchObject({ status: 'Completed', requires_action: false })
  })

  it('equals the BKG135 button rule for every row', async () => {
    await hold('2026-10-12T09:00:00+07:00', at(OCT_6))
    const now = new Date(OCT_6)
    const result = await listProviderBookings(provider, {}, at(OCT_6))
    for (const row of result.bookings) {
      const actions = bookingActions(row.status, now, row.start_at, 'provider')
      expect(row.requires_action).toBe(actions.confirm || actions.mark_arrival)
    }
  })
})

describe('T010 | filters and counts (AS-2, #61, #62)', () => {
  beforeEach(() => demoRepository().reset())

  it('status filter changes the list but not status_counts', async () => {
    const booked = await listProviderBookings(provider, { status: 'Booked' }, seedNow)
    expect(booked.bookings).toHaveLength(2)
    expect(booked.total_count).toBe(2)
    const cancelled = await listProviderBookings(provider, { status: 'Cancelled' }, seedNow)
    expect(cancelled.bookings).toEqual([])
    expect(cancelled.total_count).toBe(0)
    expect(cancelled.status_counts).toEqual({ 'On hold': 0, Booked: 2, Completed: 0, Cancelled: 0 })
  })

  it('date range is the inclusive local date of start_at and narrows status_counts', async () => {
    const day = await listProviderBookings(provider, { date_from: '2026-10-05', date_to: '2026-10-05' }, seedNow)
    expect(ids(day)).toEqual([BOOKED])
    expect(day.status_counts.Booked).toBe(1)
    const after = await listProviderBookings(provider, { date_from: '2026-10-06' }, seedNow)
    expect(ids(after)).toHaveLength(1)
    expect(ids(after)[0].startsWith(BOOKED_SAT)).toBe(true)
  })
})

describe('T011 | validation and paging (#62, #63, AS-6)', () => {
  beforeEach(() => demoRepository().reset())

  it('rejects invalid queries', async () => {
    await invalid(listProviderBookings(provider, { date_from: '2026-10-06', date_to: '2026-10-05' }, seedNow))
    await invalid(listProviderBookings(provider, { date_from: '2026-13-01' }, seedNow))
    await invalid(listProviderBookings(provider, { date_from: '05/10/2026' }, seedNow))
    await invalid(listProviderBookings(provider, { status: 'Done' }, seedNow))
    await invalid(listProviderBookings(provider, { page: '0' }, seedNow))
    await invalid(listProviderBookings(provider, { page: '1.5' }, seedNow))
    await invalid(listProviderBookings(provider, { page_size: '0' }, seedNow))
    await invalid(listProviderBookings(provider, { page_size: '101' }, seedNow))
  })

  it('pages with page and page_size; a page beyond the last is empty', async () => {
    const second = await listProviderBookings(provider, { page: '2', page_size: '1' }, seedNow)
    expect(second.bookings).toHaveLength(1)
    expect(second.bookings[0].booking_id.startsWith(BOOKED_SAT)).toBe(true)
    expect(second.total_count).toBe(2)
    const beyond = await listProviderBookings(provider, { page: '5' }, seedNow)
    expect(beyond.bookings).toEqual([])
    expect(beyond.total_count).toBe(2)
  })

  it('defaults to page 1 and 20 rows', async () => {
    for (let hour = 9; hour <= 15; hour++) {
      await hold(`2026-10-12T${String(hour).padStart(2, '0')}:00:00+07:00`)
      await hold(`2026-10-19T${String(hour).padStart(2, '0')}:00:00+07:00`)
      await hold(`2026-10-26T${String(hour).padStart(2, '0')}:00:00+07:00`)
    }
    const result = await listProviderBookings(provider, {}, seedNow)
    expect(result.bookings).toHaveLength(20)
    expect(result.total_count).toBe(23)
    expect(result.bookings[0].booking_id).toBe(BOOKED)
  })
})

describe('T012 | expiry after authorization; a denied list request writes nothing (#64, #67)', () => {
  beforeEach(() => demoRepository().reset())

  it('the owner sees a due hold as Cancelled', async () => {
    const result = await listProviderBookings(otherOwner, {}, at('2026-10-02T00:00:00+07:00'))
    expect(rowOf(result, EXPIRED_HOLD)).toMatchObject({ status: 'Cancelled', requires_action: false })
    expect(demoRepository().all('booking_status_history').filter(row => row.booking_id === EXPIRED_HOLD && row.to_status === 'Cancelled')).toHaveLength(1)
  })

  it('a denied list request writes nothing', async () => {
    const before = snapshot()
    const due = at('2026-10-02T00:00:00+07:00')
    await forbidden(listProviderBookings(DEMO_IDENTITIES.ubnd, {}, due))
    await forbidden(listProviderBookings(DEMO_IDENTITIES.agency, {}, due))
    await forbidden(listProviderBookings(provider, { provider_id: OTHER_PROVIDER }, due))
    expect(snapshot()).toEqual(before)
    expect(demoRepository().find('bookings', row => row.booking_id === EXPIRED_HOLD)!.status).toBe('On hold')
  })

  it('an invalid query from the owner writes nothing', async () => {
    const before = snapshot()
    await invalid(listProviderBookings(otherOwner, { page_size: '101' }, at('2026-10-02T00:00:00+07:00')))
    expect(snapshot()).toEqual(before)
  })
})
