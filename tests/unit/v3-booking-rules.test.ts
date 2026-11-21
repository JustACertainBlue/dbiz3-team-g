import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { createBooking } from '@/lib/booking/create-booking'
import { changeBookingStatus } from '@/lib/booking/change-status'
import { expireDueHolds } from '@/lib/booking/expire-holds'
import { assertTransition } from '@/lib/booking/transitions'

// UI v3 booking, part A (decisions 20/11): one transition guard, chat-gated creation,
// slot capacity inside the create transaction, expiry reason, instrumentation scanner, additive migration.
const provider = DEMO_IDENTITIES.provider
const agency = DEMO_IDENTITIES.agency
const AGENCY_ID = agency.agencyId!
const PROVIDER_ID = provider.providerId!
const options = { now: () => new Date(SEED_NOW) }
const PAIR_CHAT_ID = 'f0f0f0f0-0000-4000-8000-000000000001' // tests/setup/booking-pair-chat.ts
const BOOKED = '4bf17b30-9819-5c47-b745-06be7171087b' // seed Booked, owned by the demo provider

function body(startAt: string, groupSize = 10) {
  return {
    experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: AGENCY_ID, start_at: startAt,
    duration: 60, group_size: groupSize, agreed_price: 2000000,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
  }
}
async function openChat() {
  const chat_session_id = randomUUID()
  await demoRepository().applyBatch([{
    table: 'chat_sessions',
    row: { chat_session_id, agency_id: AGENCY_ID, provider_id: PROVIDER_ID, source: 'Explore', matching_session_id: '', experience_id: '', quote_request_id: '', booking_id: '', status: 'Active', started_at: '2026-09-30T08:00:00+07:00', last_message_at: '', closed_at: '', closed_by: '' },
  }])
  return chat_session_id
}
const onHold = async (start = '2026-10-12T09:00:00+07:00') => { await openChat(); return (await createBooking(provider, body(start), options)).booking_id }
const row = (id: string) => demoRepository().find('bookings', r => r.booking_id === id)!
const history = (id: string) => demoRepository().all('booking_status_history').filter(r => r.booking_id === id)
const updates = (id: string) => demoRepository().all('chat_messages').filter(r => r.booking_id === id && r.message_kind === 'Booking Update')
const code = (promise: Promise<unknown>) => promise.then(() => 'OK', (error: { code?: string }) => error.code)

describe('assertTransition (one guard for every status change)', () => {
  const check = (actor: 'provider' | 'agency', from: string, to: string, reason = '') => { try { assertTransition({ actor, from, to, reason }); return 'OK' } catch (error) { return (error as { code: string }).code } }

  it('provider: only On hold → Booked | Cancelled and Booked → Completed | Cancelled', () => {
    expect(check('provider', 'On hold', 'Booked')).toBe('OK')
    expect(check('provider', 'On hold', 'Cancelled', 'x')).toBe('OK')
    expect(check('provider', 'Booked', 'Completed')).toBe('OK')
    expect(check('provider', 'Booked', 'Cancelled', 'x')).toBe('OK')
    expect(check('provider', 'On hold', 'Completed')).toBe('INVALID_TRANSITION')
    expect(check('provider', 'Booked', 'On hold')).toBe('INVALID_TRANSITION')
    expect(check('provider', 'Booked', 'Booked')).toBe('INVALID_TRANSITION')
  })
  it('terminal states have no way out', () => {
    for (const from of ['Completed', 'Cancelled']) for (const to of ['On hold', 'Booked', 'Completed', 'Cancelled']) {
      expect(check('provider', from, to, 'x')).toBe('BOOKING_TERMINAL')
    }
  })
  it('a cancellation needs a reason', () => {
    expect(check('provider', 'On hold', 'Cancelled')).toBe('VALIDATION_ERROR')
    expect(check('agency', 'On hold', 'Cancelled', '   ')).toBe('VALIDATION_ERROR')
  })
  it('agency: cancels only while On hold; never Booked / Completed; no cancel once Booked', () => {
    expect(check('agency', 'On hold', 'Cancelled', 'Đổi lịch')).toBe('OK')
    expect(check('agency', 'Booked', 'Cancelled', 'x')).toBe('FORBIDDEN')
    expect(check('agency', 'On hold', 'Booked')).toBe('FORBIDDEN')
    expect(check('agency', 'Booked', 'Completed')).toBe('FORBIDDEN')
  })
})

describe('changeBookingStatus with the guard', () => {
  beforeEach(() => demoRepository().reset())

  it('agency cancels its own On hold booking: reason in history, system message in the chat', async () => {
    const id = await onHold()
    const before = updates(id).length
    await changeBookingStatus(agency, id, { target_status: 'Cancelled', cancellation_reason: 'Đổi lịch' }, options)
    expect(row(id).status).toBe('Cancelled')
    expect(history(id).at(-1)).toMatchObject({ from_status: 'On hold', to_status: 'Cancelled', changed_by: agency.userId, reason: 'Đổi lịch' })
    expect(updates(id)).toHaveLength(before + 1)
  })
  it('agency cannot cancel a Booked booking, nor confirm payment', async () => {
    expect(await code(changeBookingStatus(agency, BOOKED, { target_status: 'Cancelled', cancellation_reason: 'x' }, options))).toBe('FORBIDDEN')
    const id = await onHold()
    expect(await code(changeBookingStatus(agency, id, { target_status: 'Booked' }, options))).toBe('FORBIDDEN')
    expect(row(BOOKED).status).toBe('Booked')
    expect(row(id).status).toBe('On hold')
  })
  it('another agency cannot touch the booking', async () => {
    const id = await onHold()
    const other = { ...agency, agencyId: 'ebf4fcfa-1013-5ecd-b7c6-e0d8e9fa0277', userId: 'someone-else' }
    expect(await code(changeBookingStatus(other, id, { target_status: 'Cancelled', cancellation_reason: 'x' }, options))).toBe('FORBIDDEN')
  })
  it('each status change adds exactly one system message', async () => {
    const id = await onHold()
    const created = updates(id).length
    await changeBookingStatus(provider, id, { target_status: 'Booked' }, options)
    expect(updates(id)).toHaveLength(created + 1)
  })
})

describe('createBooking rules', () => {
  beforeEach(() => demoRepository().reset())

  it('the provider can only book for an agency that already chatted with it', async () => {
    demoRepository().remove('chat_sessions', r => r.chat_session_id === PAIR_CHAT_ID) // fixture shim: the pair never chatted
    expect(await code(createBooking(provider, body('2026-10-12T09:00:00+07:00'), options))).toBe('FORBIDDEN')
    expect(demoRepository().all('bookings').filter(r => r.agency_id === AGENCY_ID && r.start_at.startsWith('2026-10-12'))).toHaveLength(0)
    await openChat()
    expect(await code(createBooking(provider, body('2026-10-12T09:00:00+07:00'), options))).toBe('OK')
  })
  it('an agency cannot create a booking', async () => {
    await openChat()
    expect(await code(createBooking(agency, body('2026-10-12T09:00:00+07:00'), options))).toBe('FORBIDDEN')
  })
  it('simultaneous creates for one slot: exactly one wins, the other gets SLOT_UNAVAILABLE', async () => {
    await openChat()
    const results = await Promise.all(Array.from({ length: 4 }, () => code(createBooking(provider, body('2026-10-12T09:00:00+07:00', 5), options))))
    expect(results.filter(r => r === 'OK')).toHaveLength(1)
    expect(results.filter(r => r === 'SLOT_UNAVAILABLE')).toHaveLength(3)
  })
  it('capacity is checked inside the transaction: a group above max_participants writes nothing', async () => {
    await openChat()
    const experience = demoRepository().find('experiences', r => r.experience_id === body('x').experience_id)!
    const count = demoRepository().all('bookings').length
    expect(await code(createBooking(provider, body('2026-10-14T09:00:00+07:00', Number(experience.max_participants) + 1), options))).toBe('VALIDATION_ERROR')
    expect(demoRepository().all('bookings')).toHaveLength(count)
  })
})

describe('hold expiry', () => {
  beforeEach(() => demoRepository().reset())

  it('cancels with the reason "Hết hạn giữ chỗ" and posts a system message', async () => {
    const id = await onHold()
    const before = updates(id).length
    await expireDueHolds(new Date(Date.parse(row(id).hold_expires_at) + 1000))
    expect(row(id).status).toBe('Cancelled')
    expect(history(id).at(-1)).toMatchObject({ to_status: 'Cancelled', changed_by: '', reason: 'Hết hạn giữ chỗ' })
    expect(updates(id)).toHaveLength(before + 1)
  })
})

describe('instrumentation scanner', () => {
  it('register() starts the hold-expiry timer on the Node runtime, and only there', async () => {
    const start = vi.fn()
    vi.resetModules()
    vi.doMock('@/lib/booking/expire-holds', () => ({ startExpiryTimer: start }))
    const { register } = await import('../../src/instrumentation')
    process.env.NEXT_RUNTIME = 'edge'
    await register()
    expect(start).not.toHaveBeenCalled()
    process.env.NEXT_RUNTIME = 'nodejs'
    await register()
    expect(start).toHaveBeenCalledTimes(1)
    delete process.env.NEXT_RUNTIME
    vi.doUnmock('@/lib/booking/expire-holds')
  })
  it('no API route starts the timer any more', () => {
    const files = ['route.ts', 'status/route.ts', 'arrival/route.ts'].map(f => `src/app/api/bkg/bookings/[bookingId]/${f}`)
    for (const file of files) expect(readFileSync(file, 'utf8')).not.toContain('startExpiryTimer')
  })
})

describe('booking contact migration', () => {
  const name = readdirSync('supabase/migrations').filter(n => n.endsWith('hab_booking_contact_fields.sql'))
  it('exists and only adds three nullable columns to bookings', () => {
    expect(name).toHaveLength(1)
    const sql = readFileSync(`supabase/migrations/${name[0]}`, 'utf8').replace(/--.*$/gm, '')
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean)
    expect(statements).toHaveLength(1)
    expect(statements[0]).toMatch(/^ALTER TABLE (public\.)?bookings\b/i)
    expect([...statements[0].matchAll(/ADD COLUMN IF NOT EXISTS (\w+)/gi)].map(m => m[1])).toEqual(['contact_name', 'contact_phone', 'note'])
    expect(statements[0]).not.toMatch(/NOT NULL|DROP|DEFAULT|ALTER COLUMN|RENAME|UPDATE|DELETE/i)
  })
})
