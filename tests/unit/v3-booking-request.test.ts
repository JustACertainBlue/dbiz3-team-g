import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { createBookingRequest } from '@/lib/booking/booking-request'
import { parseBookingRequest } from '@/lib/booking/request-card'

// UI v3 decision #1 and #12: "Gửi yêu cầu" = a chat message with data attached. quote_requests has no
// columns for date, slot, guests or note (agency, experience, source only), so no row is written there.
const agency = DEMO_IDENTITIES.agency
const provider = DEMO_IDENTITIES.provider
const EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
const now = () => new Date('2026-11-21T09:00:00+07:00')
const input = (extra: Record<string, unknown> = {}) => ({ experience_id: EXPERIENCE, date: '2026-11-24', slot_start: '08:30', slot_end: '09:30', group_size: 10, note: 'Cần ghế thấp cho trẻ em', ...extra })
const code = (promise: Promise<unknown>) => promise.then(() => 'OK', (error: { code?: string }) => error.code)
const messages = () => demoRepository().all('chat_messages').filter(m => m.message_kind === 'Quote Request')

describe('createBookingRequest', () => {
  beforeEach(() => demoRepository().reset())

  it('opens the pair chat and writes one Quote Request message carrying the data', async () => {
    const result = await createBookingRequest(agency, input(), { now })
    const message = messages().find(m => m.message_id === result.message_id)!
    expect(message).toMatchObject({ chat_session_id: result.chat_session_id, sender_user_id: agency.userId, experience_id: EXPERIENCE })
    expect(parseBookingRequest(message.text)).toMatchObject({ experience_id: EXPERIENCE, date: '2026-11-24', slot_start: '08:30', slot_end: '09:30', group_size: 10, note: 'Cần ghế thấp cho trẻ em' })
  })
  it('reuses the pair Active chat on a second request (one Active Chat per pair)', async () => {
    const first = await createBookingRequest(agency, input(), { now })
    const second = await createBookingRequest(agency, input({ date: '2026-11-25' }), { now })
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
  it('validates experience, date, slot, guests and note; nothing is written on error', async () => {
    const before = demoRepository().all('chat_messages').length
    expect(await code(createBookingRequest(agency, input({ experience_id: 'nope' }), { now }))).toBe('NOT_FOUND')
    expect(await code(createBookingRequest(agency, input({ date: '2026-11-20' }), { now }))).toBe('VALIDATION_ERROR') // past
    expect(await code(createBookingRequest(agency, input({ date: '24/11/2026' }), { now }))).toBe('VALIDATION_ERROR')
    expect(await code(createBookingRequest(agency, input({ slot_end: '' }), { now }))).toBe('VALIDATION_ERROR') // one of two
    expect(await code(createBookingRequest(agency, input({ slot_start: '10:00', slot_end: '09:00' }), { now }))).toBe('VALIDATION_ERROR')
    expect(await code(createBookingRequest(agency, input({ group_size: 0 }), { now }))).toBe('VALIDATION_ERROR')
    expect(await code(createBookingRequest(agency, input({ group_size: 999 }), { now }))).toBe('VALIDATION_ERROR')
    expect(await code(createBookingRequest(agency, input({ note: 'x'.repeat(501) }), { now }))).toBe('VALIDATION_ERROR')
    expect(demoRepository().all('chat_messages')).toHaveLength(before)
  })
  it('the card text survives a round trip and rejects foreign text', () => {
    expect(parseBookingRequest('Xin chào')).toBeNull()
    expect(parseBookingRequest('{"type":"other"}')).toBeNull()
  })
})
