import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { createBooking } from '@/lib/booking/create-booking'
import { updateBooking } from '@/lib/booking/update-booking'

// T010: F-SCHED-04 — #6, #7, #27, #42, #44, #47, #48, #52, BR-007, BR-011, BR-020.
const provider = DEMO_IDENTITIES.provider
const options = { now: () => new Date(SEED_NOW) }
const HOUR = 3_600_000

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
const count = (table: string) => demoRepository().all(table).length
const rejects = (promise: Promise<unknown>, code: string) => expect(promise).rejects.toMatchObject({ code })

describe('T010 | updateBooking (F-SCHED-04)', () => {
  beforeEach(() => demoRepository().reset())
  afterEach(() => vi.restoreAllMocks())

  it('#48: only start_at, duration, group_size, agreed_price, booking_conditions may change', async () => {
    const id = await onHold()
    await rejects(updateBooking(provider, id, { status: 'Booked' }, options), 'VALIDATION_ERROR') // BR-007
    await rejects(updateBooking(provider, id, { experience_id: 'x' }, options), 'VALIDATION_ERROR')
    await rejects(updateBooking(provider, id, { agency_id: 'x' }, options), 'VALIDATION_ERROR')
    await rejects(updateBooking(provider, id, {}, options), 'VALIDATION_ERROR')
    expect(row(id).status).toBe('On hold')
  })

  it('works on On hold and Booked; Completed and Cancelled are terminal (BR-011)', async () => {
    const id = await onHold()
    await expect(updateBooking(provider, id, { group_size: 11 }, options)).resolves.toBeTruthy()
    const booked = '4bf17b30-9819-5c47-b745-06be7171087b'
    await expect(updateBooking(provider, booked, { group_size: 9 }, options)).resolves.toBeTruthy()
    demoRepository().update('bookings', r => r.booking_id === id, { status: 'Cancelled' })
    await rejects(updateBooking(provider, id, { group_size: 9 }, options), 'BOOKING_TERMINAL')
    demoRepository().update('bookings', r => r.booking_id === booked, { status: 'Completed' })
    await rejects(updateBooking(provider, booked, { group_size: 8 }, options), 'BOOKING_TERMINAL')
  })

  it('#47: a new start or duration is re-checked against hours and other Bookings, excluding itself', async () => {
    const id = await onHold()
    await rejects(updateBooking(provider, id, { start_at: '2026-10-12T16:30:00+07:00' }, options), 'SLOT_UNAVAILABLE')
    await rejects(updateBooking(provider, id, { start_at: '2026-10-05T09:30:00+07:00' }, options), 'SLOT_UNAVAILABLE') // Booked 4bf17b30
    await expect(updateBooking(provider, id, { start_at: '2026-10-12T09:30:00+07:00' }, options)).resolves.toBeTruthy()
    const result = await updateBooking(provider, id, { duration: 90 }, options)
    expect(Date.parse(row(id).end_at) - Date.parse(row(id).start_at)).toBe(90 * 60_000) // BR-020
    expect(row(id).duration_minutes).toBe('90')
    expect(result.public_schedule_updated).toBe(true)
  })

  it('#6: a date change does not reset hold_expires_at', async () => {
    const id = await onHold()
    const before = row(id).hold_expires_at
    await updateBooking(provider, id, { start_at: '2026-10-19T09:00:00+07:00' }, { now: () => new Date(Date.parse(SEED_NOW) + 5 * HOUR) })
    expect(row(id).hold_expires_at).toBe(before)
  })

  it('#7 and #42: group_size <= max_participants and conditions keep the schema shape', async () => {
    const id = await onHold()
    await rejects(updateBooking(provider, id, { group_size: 13 }, options), 'VALIDATION_ERROR')
    await rejects(updateBooking(provider, id, { booking_conditions: { notice_period: -1, cancellation_policy: { a: 1 } } }, options), 'VALIDATION_ERROR')
    await rejects(updateBooking(provider, id, { booking_conditions: { notice_period: 24, cancellation_policy: {} } }, options), 'VALIDATION_ERROR')
    expect(row(id).group_size).toBe('10')
  })

  it('#27: one audit_logs row with the before/after of changed fields; output keys as FR-004', async () => {
    const id = await onHold()
    const result = await updateBooking(provider, id, { group_size: 11 }, options)
    expect(Object.keys(result).sort()).toEqual(['agency_notification_message_id', 'audit_log_id', 'private_schedule_synced', 'public_schedule_updated', 'updated_booking'])
    const audit = demoRepository().find('audit_logs', r => r.audit_id === result.audit_log_id)!
    expect(audit).toMatchObject({ action: 'booking.update', target_type: 'booking', target_id: id, actor_user_id: provider.userId })
    expect(Object.keys(JSON.parse(audit.change_or_result))).toEqual(['group_size'])
    expect(row(id).group_size).toBe('11')
    expect(result.agency_notification_message_id).toEqual(expect.any(String))
  })

  it('#52: identical values write nothing and return null ids', async () => {
    const id = await onHold()
    const audits = count('audit_logs')
    const messages = count('chat_messages')
    const updatedAt = row(id).updated_at
    const result = await updateBooking(provider, id, { group_size: 10, agreed_price: 2000000 }, options)
    expect(result.audit_log_id).toBeNull()
    expect(result.agency_notification_message_id).toBeNull()
    expect(count('audit_logs')).toBe(audits)
    expect(count('chat_messages')).toBe(messages)
    expect(row(id).updated_at).toBe(updatedAt)
  })

  it('#44: a failed persist changes neither the Booking nor audit nor messages', async () => {
    const id = await onHold()
    const audits = count('audit_logs')
    const messages = count('chat_messages')
    vi.spyOn(demoRepository() as unknown as { persist: (...args: unknown[]) => void }, 'persist')
      .mockImplementation(() => { throw new Error('disk full') })
    await expect(updateBooking(provider, id, { group_size: 11 }, options)).rejects.toThrow()
    vi.restoreAllMocks()
    expect(row(id).group_size).toBe('10')
    expect(count('audit_logs')).toBe(audits)
    expect(count('chat_messages')).toBe(messages)
  })
})
