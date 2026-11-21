import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { createBooking } from '@/lib/booking/create-booking'
import { createBookingRequest } from '@/lib/booking/booking-request'
import { freeSlotsOn } from '@/lib/booking/free-slots'
import { parseBookingRequest } from '@/lib/booking/request-card'
import { addSlots } from '../helpers/slots'

// "Gửi yêu cầu" = a chat message with the request attached (decisions #1, #12). The request needs a free slot of the day
// (21/11): a Monday 2026-11-30 has "Ca sáng 09:00–10:00" free; "Ca chiều" runs on Tuesdays only.
// quote_requests has no columns for date, slot, guests or note, so no row is written there.
const agency = DEMO_IDENTITIES.agency
const provider = DEMO_IDENTITIES.provider
const EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
const MONDAY = '2026-11-30'
const now = () => new Date('2026-11-21T09:00:00+07:00')
const input = (extra: Record<string, unknown> = {}) => ({ experience_id: EXPERIENCE, date: MONDAY, slot_start: '09:00', slot_end: '10:00', group_size: 10, note: 'Cần ghế thấp cho trẻ em', ...extra })
const code = (promise: Promise<unknown>) => promise.then(() => 'OK', (error: { code?: string }) => error.code)
const messages = () => demoRepository().all('chat_messages').filter(m => m.message_kind === 'Quote Request')

describe('createBookingRequest', () => {
  beforeEach(() => { demoRepository().reset(); addSlots() })

  it('opens the pair chat and writes one Quote Request message carrying the data, slot included', async () => {
    const result = await createBookingRequest(agency, input(), { now })
    const message = messages().find(m => m.message_id === result.message_id)!
    expect(message).toMatchObject({ chat_session_id: result.chat_session_id, sender_user_id: agency.userId, experience_id: EXPERIENCE })
    expect(parseBookingRequest(message.text)).toMatchObject({ experience_id: EXPERIENCE, date: MONDAY, slot_start: '09:00', slot_end: '10:00', group_size: 10, note: 'Cần ghế thấp cho trẻ em' })
  })
  it('reuses the pair Active chat on a second request (one Active Chat per pair)', async () => {
    const first = await createBookingRequest(agency, input(), { now })
    const second = await createBookingRequest(agency, input({ date: '2026-12-07' }), { now })
    expect(second.chat_session_id).toBe(first.chat_session_id)
    expect(demoRepository().all('chat_sessions').filter(c => c.agency_id === agency.agencyId && c.provider_id === provider.providerId && c.status === 'Active')).toHaveLength(1)
  })
  it('raises the provider unread count', async () => {
    const { chat_session_id } = await createBookingRequest(agency, input(), { now })
    const row = demoRepository().find('chat_participants', p => p.chat_session_id === chat_session_id && p.user_id === provider.userId)!
    expect(Number(row.unread_count)).toBeGreaterThan(0)
  })
  it('only an authenticated Tour Agency may send one', async () => {
    expect(await code(createBookingRequest(provider, input(), { now }))).toBe('FORBIDDEN')
    expect(await code(createBookingRequest(DEMO_IDENTITIES.guest, input(), { now }))).toBe('FORBIDDEN')
    expect(messages()).toHaveLength(0)
  })
  it('validates experience, date, guests and note; nothing is written on error', async () => {
    const before = demoRepository().all('chat_messages').length
    expect(await code(createBookingRequest(agency, input({ experience_id: 'nope' }), { now }))).toBe('NOT_FOUND')
    expect(await code(createBookingRequest(agency, input({ date: '2026-11-16' }), { now }))).toBe('VALIDATION_ERROR') // past
    expect(await code(createBookingRequest(agency, input({ date: '30/11/2026' }), { now }))).toBe('VALIDATION_ERROR')
    expect(await code(createBookingRequest(agency, input({ group_size: 0 }), { now }))).toBe('VALIDATION_ERROR')
    expect(await code(createBookingRequest(agency, input({ group_size: 999 }), { now }))).toBe('VALIDATION_ERROR')
    expect(await code(createBookingRequest(agency, input({ note: 'x'.repeat(501) }), { now }))).toBe('VALIDATION_ERROR')
    expect(demoRepository().all('chat_messages')).toHaveLength(before)
  })

  // 21/11: a slot is required
  it('a request without a slot is refused', async () => {
    const before = demoRepository().all('chat_messages').length
    expect(await code(createBookingRequest(agency, input({ slot_start: '', slot_end: '' }), { now }))).toBe('VALIDATION_ERROR')
    expect(await code(createBookingRequest(agency, input({ slot_end: '' }), { now }))).toBe('VALIDATION_ERROR')
    const { slot_start: _a, slot_end: _b, ...noSlot } = input()
    expect(await code(createBookingRequest(agency, noSlot, { now }))).toBe('VALIDATION_ERROR')
    expect(demoRepository().all('chat_messages')).toHaveLength(before)
  })
  it('a slot that does not belong to that day is refused (Ca chiều runs on Tuesdays; 10:00–11:00 is no slot)', async () => {
    expect(await code(createBookingRequest(agency, input({ slot_start: '14:00', slot_end: '15:00' }), { now }))).toBe('SLOT_UNAVAILABLE')
    expect(await code(createBookingRequest(agency, input({ slot_start: '10:00', slot_end: '11:00' }), { now }))).toBe('SLOT_UNAVAILABLE')
    expect(await code(createBookingRequest(agency, input({ slot_start: '10:00', slot_end: '09:00' }), { now }))).toBe('VALIDATION_ERROR')
    expect(messages()).toHaveLength(0)
  })
  it('a slot already held by a booking that day is refused', async () => {
    await createBooking(provider, { experience_id: EXPERIENCE, agency_id: agency.agencyId, start_at: `${MONDAY}T09:00:00+07:00`, duration: 60, group_size: 5, agreed_price: 750000,
      booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } } }, { now })
    expect(await code(createBookingRequest(agency, input(), { now }))).toBe('SLOT_UNAVAILABLE')
  })
})

describe('freeSlotsOn (the form of 04/24 asks for it)', () => {
  beforeEach(() => { demoRepository().reset(); addSlots() })
  it('lists the free slots of the day, earliest first', async () => {
    expect(await freeSlotsOn(EXPERIENCE, MONDAY)).toEqual([{ start: '09:00', end: '10:00', label: 'Ca sáng' }])
    // the demo workshop is open on Mondays only (provider_operating_hours): a Tuesday has no free slot, whatever the slots say
    expect(await freeSlotsOn(EXPERIENCE, '2026-12-01')).toEqual([])
    demoRepository().insert('experience_slots', { slot_id: 'slot-mon-pm', experience_id: EXPERIENCE, label: 'Ca chiều', start_time: '14:00:00', end_time: '15:00:00', weekdays: '[1]' })
    expect((await freeSlotsOn(EXPERIENCE, MONDAY)).map(slot => slot.start)).toEqual(['09:00', '14:00'])
  })
  it('a day without a free slot gives an empty list; an unknown experience too', async () => {
    expect(await freeSlotsOn(EXPERIENCE, '2026-11-29')).toEqual([]) // Sunday: the workshop is closed
    expect(await freeSlotsOn('nope', MONDAY)).toEqual([])
  })
})
