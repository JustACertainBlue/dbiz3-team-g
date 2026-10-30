import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { createBooking } from '@/lib/booking/create-booking'
import { changeBookingStatus } from '@/lib/booking/change-status'

// T011: F-SCHED-05 — FR-005, #10, #44, #45, AC-BKG-COMPLETE, BR-019, US-5 AS-1/AS-2.
const provider = DEMO_IDENTITIES.provider
const options = { now: () => new Date(SEED_NOW) }
const HOLD_END = '2026-10-03T00:00:00+07:00' // created at SEED_NOW + 72 h

function body(startAt: string) {
  return {
    experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69',
    agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
    start_at: startAt,
    duration: 60,
    group_size: 10,
    agreed_price: 2000000,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
  }
}
async function onHold(startAt = '2026-10-12T09:00:00+07:00') {
  return (await createBooking(provider, body(startAt), options)).booking_id
}
const row = (id: string) => demoRepository().find('bookings', r => r.booking_id === id)!
const historyOf = (id: string) => demoRepository().all('booking_status_history').filter(r => r.booking_id === id)
const rejects = (promise: Promise<unknown>, code: string) => expect(promise).rejects.toMatchObject({ code })

describe('T011 | changeBookingStatus (F-SCHED-05)', () => {
  beforeEach(() => demoRepository().reset())
  afterEach(() => vi.restoreAllMocks())

  it('AS-1: On hold → Booked while now < hold_expires_at; one history row; FR-005 output keys', async () => {
    const id = await onHold()
    const result = await changeBookingStatus(provider, id, { target_status: 'Booked' }, options)
    expect(Object.keys(result).sort()).toEqual(['agency_notification_message_id', 'booking_status', 'schedules_synced', 'status_history_entry'])
    expect(result.booking_status).toBe('Booked')
    expect(row(id).status).toBe('Booked')
    expect(historyOf(id)).toHaveLength(2) // create + confirm
    expect(result.status_history_entry).toMatchObject({ from_status: 'On hold', to_status: 'Booked', changed_by: provider.userId })
  })

  it('#45: confirm at the deadline is rejected and the Booking ends Cancelled by expiry', async () => {
    const id = await onHold()
    await rejects(changeBookingStatus(provider, id, { target_status: 'Booked' }, { now: () => new Date(HOLD_END) }), 'BOOKING_TERMINAL')
    expect(row(id).status).toBe('Cancelled')
    expect(historyOf(id).at(-1)).toMatchObject({ to_status: 'Cancelled', reason: 'Automatic expiry: 72-hour On hold elapsed', changed_by: '' })
  })

  it('AS-2 and #10: On hold and Booked can be cancelled only with a reason', async () => {
    const id = await onHold()
    await rejects(changeBookingStatus(provider, id, { target_status: 'Cancelled' }, options), 'VALIDATION_ERROR')
    await rejects(changeBookingStatus(provider, id, { target_status: 'Cancelled', cancellation_reason: '   ' }, options), 'VALIDATION_ERROR')
    const cancelled = await changeBookingStatus(provider, id, { target_status: 'Cancelled', cancellation_reason: 'Group postponed' }, options)
    expect(cancelled.status_history_entry).toMatchObject({ from_status: 'On hold', to_status: 'Cancelled', reason: 'Group postponed' })

    const booked = '4bf17b30-9819-5c47-b745-06be7171087b'
    await changeBookingStatus(provider, booked, { target_status: 'Cancelled', cancellation_reason: 'Weather' }, options)
    expect(row(booked).status).toBe('Cancelled')
  })

  it('AC-BKG-COMPLETE: Completed is never a target here', async () => {
    const booked = '4bf17b30-9819-5c47-b745-06be7171087b'
    await rejects(changeBookingStatus(provider, booked, { target_status: 'Completed' }, options), 'VALIDATION_ERROR')
    expect(row(booked).status).toBe('Booked')
  })

  it('analyze M5: terminal Bookings → BOOKING_TERMINAL; other transitions → INVALID_TRANSITION', async () => {
    const booked = '4bf17b30-9819-5c47-b745-06be7171087b'
    await rejects(changeBookingStatus(provider, booked, { target_status: 'Booked' }, options), 'INVALID_TRANSITION')
    const id = await onHold()
    await changeBookingStatus(provider, id, { target_status: 'Cancelled', cancellation_reason: 'x' }, options)
    await rejects(changeBookingStatus(provider, id, { target_status: 'Booked' }, options), 'BOOKING_TERMINAL')
    await rejects(changeBookingStatus(provider, id, { target_status: 'Cancelled', cancellation_reason: 'x' }, options), 'BOOKING_TERMINAL')
  })

  it('BR-019 and #44: a failed persist leaves neither the status nor the history row', async () => {
    const id = await onHold()
    const history = historyOf(id).length
    vi.spyOn(demoRepository() as unknown as { persist: (...args: unknown[]) => void }, 'persist')
      .mockImplementation(() => { throw new Error('disk full') })
    await expect(changeBookingStatus(provider, id, { target_status: 'Booked' }, options)).rejects.toThrow()
    vi.restoreAllMocks()
    expect(row(id).status).toBe('On hold')
    expect(historyOf(id)).toHaveLength(history)
  })
})
