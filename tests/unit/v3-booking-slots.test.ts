import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { createBooking } from '@/lib/booking/create-booking'
import { updateBooking } from '@/lib/booking/update-booking'

// Create and edit share one slot + capacity check: the start must be a time slot of the experience (that weekday).
const provider = DEMO_IDENTITIES.provider
const EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
const now = () => new Date('2026-11-21T09:00:00+07:00')
const MONDAY = '2026-11-23'
const body = (time: string, extra: Record<string, unknown> = {}) => ({
  experience_id: EXPERIENCE, agency_id: DEMO_IDENTITIES.agency.agencyId, start_at: `${MONDAY}T${time}:00+07:00`, duration: 60, group_size: 5, agreed_price: 750000,
  booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } }, ...extra,
})
const code = (promise: Promise<unknown>) => promise.then(() => 'OK', (error: { code?: string }) => error.code)
const addSlot = (start: string, end: string, weekdays = [1, 2, 3, 4, 5, 6, 7]) => demoRepository().insert('experience_slots', {
  slot_id: `s-${start}`, experience_id: EXPERIENCE, label: `Ca ${start}`, start_time: `${start}:00`, end_time: `${end}:00`, weekdays: JSON.stringify(weekdays),
})

describe('slot rule on create and edit', () => {
  beforeEach(() => demoRepository().reset())

  it('create: a start that is a slot start is accepted, any other time is refused', async () => {
    addSlot('09:00', '10:00')
    expect(await code(createBooking(provider, body('09:30'), { now }))).toBe('SLOT_UNAVAILABLE')
    expect(await code(createBooking(provider, body('09:00'), { now }))).toBe('OK')
  })
  it('create: a slot that does not run on that weekday is refused', async () => {
    addSlot('09:00', '10:00', [2]) // Tuesday only; the 23rd is a Monday
    expect(await code(createBooking(provider, body('09:00'), { now }))).toBe('SLOT_UNAVAILABLE')
  })
  it('create: an experience without slots keeps the free start (no regression)', async () => {
    expect(await code(createBooking(provider, body('09:30'), { now }))).toBe('OK')
  })
  it('edit: moving to a time that is not a slot is refused; moving to another slot works; nothing is written on refusal', async () => {
    addSlot('09:00', '10:00'); addSlot('14:00', '15:00')
    const { booking_id } = await createBooking(provider, body('09:00'), { now })
    const row = () => demoRepository().find('bookings', r => r.booking_id === booking_id)!
    expect(await code(updateBooking(provider, booking_id, { start_at: `${MONDAY}T11:30:00+07:00` }, { now }))).toBe('SLOT_UNAVAILABLE')
    expect(row().start_at).toContain('T09:00')
    expect(await code(updateBooking(provider, booking_id, { start_at: `${MONDAY}T14:00:00+07:00` }, { now }))).toBe('OK')
    expect(row().start_at).toContain('T14:00')
  })
  it('edit: a change that does not touch the time is not blocked by the slot rule', async () => {
    const { booking_id } = await createBooking(provider, body('09:30'), { now }) // created before slots existed
    addSlot('09:00', '10:00')
    expect(await code(updateBooking(provider, booking_id, { group_size: 6 }, { now }))).toBe('OK')
  })
  it('capacity is shared: raising the group over max_participants is refused on edit too', async () => {
    const { booking_id } = await createBooking(provider, body('09:00'), { now })
    const max = Number(demoRepository().find('experiences', r => r.experience_id === EXPERIENCE)!.max_participants)
    expect(await code(updateBooking(provider, booking_id, { group_size: max + 1 }, { now }))).toBe('VALIDATION_ERROR')
  })
})
