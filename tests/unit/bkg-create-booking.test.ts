import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { bookingConditionsFromExperience, createBooking } from '@/lib/booking/create-booking'

// T012: US-4 AS-1..AS-5, BR-003/004/005/019/020, BR-009 (public block), spec #36.
const EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69' // Bát Tràng, 60 min, max 12, notice 24 h
const AGENCY = '02e568d8-d65e-54b1-a554-b411150d1dcb' // Approved
const HOUR = 3_600_000
const provider = DEMO_IDENTITIES.provider
const options = { now: () => new Date(SEED_NOW) }

function input(overrides: Record<string, unknown> = {}) {
  return {
    experience_id: EXPERIENCE,
    agency_id: AGENCY,
    start_at: '2026-10-12T09:00:00+07:00', // Monday, inside 08:00–17:00
    duration: 60,
    group_size: 10,
    agreed_price: 2000000,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
    ...overrides,
  }
}

const count = (table: string) => demoRepository().all(table).length

describe('T012 | createBooking lifecycle', () => {
  beforeEach(() => demoRepository().reset())
  afterEach(() => vi.restoreAllMocks())

  it('AS-1 / BR-003: a new Booking is On hold', async () => {
    const result = await createBooking(provider, input(), options)
    expect(result.status).toBe('On hold')
    expect(demoRepository().find('bookings', row => row.booking_id === result.booking_id)?.status).toBe('On hold')
  })

  it('AS-2 / BR-004 / AC-BKG-HOLD: hold_expires_at = created_at + 72h', async () => {
    const result = await createBooking(provider, input(), options)
    expect(Date.parse(result.created_at)).toBe(Date.parse(SEED_NOW))
    expect(Date.parse(result.hold_expires_at) - Date.parse(result.created_at)).toBe(72 * HOUR)
    const row = demoRepository().find('bookings', r => r.booking_id === result.booking_id)!
    expect(Date.parse(row.hold_expires_at) - Date.parse(row.created_at)).toBe(72 * HOUR)
  })

  it('AS-3 / BR-005: the slot is blocked at once, so a second overlapping create fails', async () => {
    await createBooking(provider, input(), options)
    await expect(createBooking(provider, input({ start_at: '2026-10-12T09:30:00+07:00' }), options))
      .rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' })
  })

  it('AS-4 / spec #36: the Agency sees the Booking right away, derived from bookings', async () => {
    const result = await createBooking(provider, input(), options)
    expect(result.private_schedule_synced).toBe(true)
    const agencyRows = demoRepository().all('bookings').filter(row => row.agency_id === AGENCY)
    expect(agencyRows.map(row => row.booking_id)).toContain(result.booking_id)
  })

  it('AS-5: a request outside operating hours or overlapping writes nothing', async () => {
    const bookings = count('bookings')
    const history = count('booking_status_history')
    await expect(createBooking(provider, input({ start_at: '2026-10-13T09:00:00+07:00' }), options)) // Tuesday
      .rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' })
    await expect(createBooking(provider, input({ start_at: '2026-10-05T09:30:00+07:00' }), options)) // overlaps Booked 4bf17b30…
      .rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' })
    expect(count('bookings')).toBe(bookings)
    expect(count('booking_status_history')).toBe(history)
  })

  it('BR-019: create writes exactly one initial history row', async () => {
    const result = await createBooking(provider, input(), options)
    const rows = demoRepository().all('booking_status_history').filter(row => row.booking_id === result.booking_id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ from_status: '', to_status: 'On hold', changed_by: provider.userId })
    expect(Date.parse(rows[0].changed_at)).toBe(Date.parse(result.created_at))
  })

  it('BR-019: a failed persist leaves neither the Booking nor its history', async () => {
    const repository = demoRepository()
    const bookings = count('bookings')
    const history = count('booking_status_history')
    vi.spyOn(repository as unknown as { persist: (...args: unknown[]) => void }, 'persist')
      .mockImplementation(() => { throw new Error('disk full') })

    await expect(createBooking(provider, input(), options)).rejects.toThrow()
    expect(count('bookings')).toBe(bookings)
    expect(count('booking_status_history')).toBe(history)
  })

  it('BR-020: end_at = start_at + duration_minutes and conditions are stored as a snapshot', async () => {
    const result = await createBooking(provider, input(), options)
    const row = demoRepository().find('bookings', r => r.booking_id === result.booking_id)!
    expect(Date.parse(row.end_at) - Date.parse(row.start_at)).toBe(60 * 60_000)
    expect(row.duration_minutes).toBe('60')
    expect(JSON.parse(row.conditions_snapshot)).toEqual({ notice_period_hours: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } })
  })

  it('BR-020 / OQ #9: conditions are prefilled from the Experience', () => {
    const experience = demoRepository().find('experiences', row => row.experience_id === EXPERIENCE)!
    expect(bookingConditionsFromExperience(experience)).toEqual({ notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } })
  })

  it('FR-003 output: exact fields, and the public block shows only start, end and status (BR-009)', async () => {
    const result = await createBooking(provider, input(), options)
    expect(Object.keys(result).sort()).toEqual(['booking_id', 'created_at', 'hold_expires_at', 'private_schedule_synced', 'public_schedule_block', 'status'])
    expect(Object.keys(result.public_schedule_block).sort()).toEqual(['end_at', 'start_at', 'status'])
    expect(result.public_schedule_block.status).toBe('On hold')
  })
})
