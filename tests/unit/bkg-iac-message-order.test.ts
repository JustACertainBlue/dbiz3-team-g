import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { createBooking } from '@/lib/booking/create-booking'
import { changeBookingStatus } from '@/lib/booking/change-status'
import { getChatHistory } from '@/lib/iac/chat-service'
import { PROVIDER } from './iac-fixtures'

// Issue #66, interface BKG → IAC: Booking Update messages (spec-BKG FR-008 / F-SCHED-08) must use the IAC
// sent_at format (ISO UTC with milliseconds) and be strictly later than the Chat's latest message
// (spec-IAC #47), so history stays oldest → newest in write order (spec-IAC BR-014).
const provider = DEMO_IDENTITIES.provider
const EBF = 'ebf4fcfa-1013-5ecd-b7c6-e0d8e9fa0277' // Agency with an Active Chat with the demo Provider
const UTC_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const at = (iso: string) => ({ now: () => new Date(iso) })

const repo = () => demoRepository()
const updatesFor = (bookingId: string) => repo().all('chat_messages')
  .filter(r => r.booking_id === bookingId && r.message_kind === 'Booking Update')

function body(startAt: string) {
  return {
    experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: EBF, start_at: startAt,
    duration: 60, group_size: 10, agreed_price: 2000000,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
  }
}

async function historyTexts(chatId: string): Promise<string[]> {
  const history = await getChatHistory(PROVIDER, chatId)
  return history.message_history.map(m => m.text)
}

describe('Issue #66 | BKG → IAC Booking Update sent_at and order', () => {
  beforeEach(() => repo().reset())

  it('spec-BKG FR-008 / spec-IAC #47 (normal): a Booking Update is stored with ISO UTC milliseconds, and last_message_at matches it', async () => {
    const { booking_id } = await createBooking(provider, body('2026-10-12T09:00:00+07:00'), at('2026-09-29T17:00:00.250Z'))
    const [message] = updatesFor(booking_id)
    expect(message.sent_at).toMatch(UTC_MS)
    expect(Date.parse(message.sent_at)).toBeGreaterThanOrEqual(Date.parse('2026-09-29T17:00:00.000Z'))
    const chat = repo().find('chat_sessions', r => r.chat_session_id === message.chat_session_id)!
    expect(chat.last_message_at).toBe(message.sent_at)
  })

  it('spec-IAC BR-014 / #47 (boundary, same second): create then confirm 0.8 s apart are strictly ordered On hold → Booked', async () => {
    const { booking_id } = await createBooking(provider, body('2026-10-12T09:00:00+07:00'), at('2026-09-29T17:00:00.100Z'))
    await changeBookingStatus(provider, booking_id, { target_status: 'Booked' }, at('2026-09-29T17:00:00.900Z'))
    const [first, second] = updatesFor(booking_id).sort((a, b) => Date.parse(a.sent_at) - Date.parse(b.sent_at))
    expect(Date.parse(second.sent_at)).toBeGreaterThan(Date.parse(first.sent_at))
    const texts = (await historyTexts(first.chat_session_id)).filter(t => t.includes('2026-10-12 09:00'))
    expect(texts.map(t => t.split(':')[0])).toEqual(['Booking On hold', 'Booking Booked'])
  })

  it('spec-IAC BR-014 / #47 (boundary, same millisecond): two events at the same instant still get increasing sent_at in write order', async () => {
    const instant = at('2026-09-29T17:00:00.500Z')
    const { booking_id } = await createBooking(provider, body('2026-10-12T11:00:00+07:00'), instant)
    await changeBookingStatus(provider, booking_id, { target_status: 'Cancelled', cancellation_reason: 'Khách đổi lịch' }, instant)
    const rows = updatesFor(booking_id)
    expect(rows).toHaveLength(2)
    expect(new Set(rows.map(r => r.sent_at)).size).toBe(2)
    const texts = (await historyTexts(rows[0].chat_session_id)).filter(t => t.includes('2026-10-12 11:00'))
    expect(texts.map(t => t.split(':')[0])).toEqual(['Booking On hold', 'Booking Cancelled'])
  })

  it('spec-BKG FR-008 (failure): a refused status change writes no message, and the next accepted event is still strictly later', async () => {
    const { booking_id } = await createBooking(provider, body('2026-10-12T13:00:00+07:00'), at('2026-09-29T17:00:00.100Z'))
    await expect(changeBookingStatus(provider, booking_id, { target_status: 'Cancelled' }, at('2026-09-29T17:00:00.200Z')))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(updatesFor(booking_id)).toHaveLength(1)
    await changeBookingStatus(provider, booking_id, { target_status: 'Booked' }, at('2026-09-29T17:00:00.300Z'))
    const rows = updatesFor(booking_id).sort((a, b) => Date.parse(a.sent_at) - Date.parse(b.sent_at))
    expect(rows).toHaveLength(2)
    expect(Date.parse(rows[1].sent_at)).toBeGreaterThan(Date.parse(rows[0].sent_at))
    expect(rows.map(r => r.text.split(':')[0])).toEqual(['Booking On hold', 'Booking Booked'])
  })

  it('spec-IAC BR-014 (legacy +07:00 rows): history compares instants, not strings, and a new update lands after an older-format later row', async () => {
    const { booking_id } = await createBooking(provider, body('2026-10-12T15:00:00+07:00'), at('2026-09-29T17:00:00.000Z'))
    const chatId = updatesFor(booking_id)[0].chat_session_id
    // Legacy row written before the fix: local +07:00, seconds only, 1 s after the create.
    repo().insert('chat_messages', {
      message_id: 'legacy-0000', chat_session_id: chatId, sender_user_id: '', text: 'Legacy: 07:00:01 local',
      message_kind: 'Booking Update', experience_id: '', quote_request_id: '', booking_id: '', sent_at: '2026-09-30T00:00:01+07:00',
    })
    // Legacy row that is 1 s BEFORE the create as an instant (16:59:59Z), although its string sorts after it.
    repo().insert('chat_messages', {
      message_id: 'legacy-zzzz', chat_session_id: chatId, sender_user_id: '', text: 'Legacy: earlier instant',
      message_kind: 'Booking Update', experience_id: '', quote_request_id: '', booking_id: '', sent_at: '2026-09-29T23:59:59+07:00',
    })
    await changeBookingStatus(provider, booking_id, { target_status: 'Booked' }, at('2026-09-29T17:00:00.500Z'))
    const texts = (await historyTexts(chatId)).filter(t => t.startsWith('Legacy') || t.includes('2026-10-12 15:00'))
    expect(texts.map(t => t.split(':')[0])).toEqual(['Legacy', 'Booking On hold', 'Legacy', 'Booking Booked'])
    expect(texts[0]).toBe('Legacy: earlier instant')
  })
})
