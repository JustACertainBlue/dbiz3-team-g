import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { createBooking } from '@/lib/booking/create-booking'

// T014: OQ #7, OQ #8, duration > 0, spec #38, #42, Clarification #30, required fields.
const EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69' // 60 min, max 12, notice 24 h
const AGENCY = '02e568d8-d65e-54b1-a554-b411150d1dcb'
const provider = DEMO_IDENTITIES.provider
const options = { now: () => new Date(SEED_NOW) }

function input(overrides: Record<string, unknown> = {}) {
  return {
    experience_id: EXPERIENCE,
    agency_id: AGENCY,
    start_at: '2026-10-12T09:00:00+07:00',
    duration: 60,
    group_size: 10,
    agreed_price: 2000000,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
    ...overrides,
  }
}

const bookingRow = (id: string) => demoRepository().find('bookings', row => row.booking_id === id)!
const rejectsWith = (body: Record<string, unknown>, code = 'VALIDATION_ERROR') =>
  expect(createBooking(provider, body, options)).rejects.toMatchObject({ code })

describe('T014 | createBooking input validation', () => {
  beforeEach(() => demoRepository().reset())

  it('OQ #7: group_size must be 1..max_participants (12)', async () => {
    await expect(createBooking(provider, input({ group_size: 12 }), options)).resolves.toMatchObject({ status: 'On hold' })
    await rejectsWith(input({ group_size: 13, start_at: '2026-10-12T11:00:00+07:00' }))
    await rejectsWith(input({ group_size: 0, start_at: '2026-10-12T11:00:00+07:00' }))
    await rejectsWith(input({ group_size: 2.5, start_at: '2026-10-12T11:00:00+07:00' }))
  })

  it('OQ #8: agreed_price must be > 0 and is stored as the group total agreed_price_total', async () => {
    await rejectsWith(input({ agreed_price: 0 }))
    const result = await createBooking(provider, input({ agreed_price: 2500000 }), options)
    expect(Number(bookingRow(result.booking_id).agreed_price_total)).toBe(2500000)
  })

  it('duration must be > 0', async () => {
    await rejectsWith(input({ duration: 0 }))
  })

  it('#38: a duration different from the Experience is accepted and drives end_at', async () => {
    const result = await createBooking(provider, input({ duration: 90 }), options)
    const row = bookingRow(result.booking_id)
    expect(row.duration_minutes).toBe('90')
    expect(Date.parse(row.end_at) - Date.parse(row.start_at)).toBe(90 * 60_000)
  })

  it('#42: adjusted booking_conditions must keep the schema shape', async () => {
    await rejectsWith(input({ booking_conditions: { notice_period: -1, cancellation_policy: { before_hours: 24 } } }))
    await rejectsWith(input({ booking_conditions: { notice_period: 1.5, cancellation_policy: { before_hours: 24 } } }))
    await rejectsWith(input({ booking_conditions: { notice_period: 24, cancellation_policy: {} } }))
  })

  it('#42: valid adjusted conditions are stored in conditions_snapshot', async () => {
    const adjusted = { notice_period: 48, cancellation_policy: { before_hours: 48, refund_percent: 50 } }
    const result = await createBooking(provider, input({ booking_conditions: adjusted }), options)
    expect(JSON.parse(bookingRow(result.booking_id).conditions_snapshot)).toEqual({
      notice_period_hours: 48, cancellation_policy: { before_hours: 48, refund_percent: 50 },
    })
  })

  it('Clarification #30: no notice-period check at creation', async () => {
    // start is 1 hour after "now", although the Experience notice period is 24 hours
    const soon = { now: () => new Date('2026-10-12T08:00:00+07:00') }
    await expect(createBooking(provider, input({ start_at: '2026-10-12T09:00:00+07:00' }), soon)).resolves.toMatchObject({ status: 'On hold' })
  })

  it('FR-003: source_chat_session_id is stored as given, and empty when absent (analyze H2)', async () => {
    const chatId = 'c0000000-0000-4000-8000-000000000001'
    const withChat = await createBooking(provider, input({ source_chat_session_id: chatId }), options)
    expect(bookingRow(withChat.booking_id).source_chat_session_id).toBe(chatId)
    const withoutChat = await createBooking(provider, input({ start_at: '2026-10-12T11:00:00+07:00' }), options)
    expect(bookingRow(withoutChat.booking_id).source_chat_session_id).toBe('')
  })

  it.each(['experience_id', 'agency_id', 'start_at', 'duration', 'group_size', 'agreed_price', 'booking_conditions'])(
    'a missing required field (%s) is rejected',
    async field => {
      const body = input()
      delete (body as Record<string, unknown>)[field]
      await rejectsWith(body)
    },
  )
})
