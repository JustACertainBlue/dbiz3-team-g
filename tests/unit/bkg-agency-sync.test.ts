import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import type { DemoRow } from '@/lib/demo/types'
import { SEED_NOW } from '@/lib/booking/clock'
import { createBooking } from '@/lib/booking/create-booking'
import { updateBooking } from '@/lib/booking/update-booking'
import { changeBookingStatus } from '@/lib/booking/change-status'
import { markGroupArrival } from '@/lib/booking/mark-arrival'
import { recipientReadStatus } from '@/lib/booking/agency-sync'

// T014: F-SCHED-08 — FR-008, BR-012, #13, #26, #27, #36, #49, #55, #56, US-5 AS-6; analyze M6.
const provider = DEMO_IDENTITIES.provider
const PROVIDER_ID = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const TRANG_AN = '02e568d8-d65e-54b1-a554-b411150d1dcb' // no Chat with PROVIDER_ID in the seed
const EBF = 'ebf4fcfa-1013-5ecd-b7c6-e0d8e9fa0277' // Active Chat with PROVIDER_ID
const SONG_HONG = '2a1f0cc1-d7df-587d-afd4-445d25a5c5b0' // Active Chat with PROVIDER_ID
const BOOKED_EBF = '4bf17b30-9819-5c47-b745-06be7171087b'
const options = { now: () => new Date(SEED_NOW) }
const TEMPLATE = /^Booking (On hold|Booked|Cancelled|Completed): Nặn gốm thủ công, .+–.+, \d+ pax, .+ VND/

const repo = () => demoRepository()
const activeChats = (agencyId: string) => repo().all('chat_sessions').filter(r => r.agency_id === agencyId && r.provider_id === PROVIDER_ID && r.status === 'Active')
const messagesFor = (bookingId: string) => repo().all('chat_messages').filter(r => r.booking_id === bookingId && r.message_kind === 'Booking Update')
const agencyUser = (agencyId: string) => repo().find('agency_profiles', r => r.agency_id === agencyId)!.user_id
const participant = (chatId: string, userId: string) => repo().find('chat_participants', r => r.chat_session_id === chatId && r.user_id === userId)

function body(agencyId: string, startAt: string, extra: Record<string, unknown> = {}) {
  return {
    experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: agencyId, start_at: startAt,
    duration: 60, group_size: 10, agreed_price: 2000000,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
    ...extra,
  }
}

function expectBookingUpdate(message: DemoRow, bookingId: string) {
  expect(message).toMatchObject({ message_kind: 'Booking Update', sender_user_id: '', booking_id: bookingId })
  expect(message.text).toMatch(TEMPLATE)
}

describe('T014 | Agency sync through Chat (F-SCHED-08)', () => {
  beforeEach(() => repo().reset())

  it('create with no Active Chat for the pair opens one Booking Chat with two participants', async () => {
    expect(activeChats(TRANG_AN)).toHaveLength(0)
    const { booking_id } = await createBooking(provider, body(TRANG_AN, '2026-10-12T09:00:00+07:00'), options)
    const chats = activeChats(TRANG_AN)
    expect(chats).toHaveLength(1)
    expect(chats[0]).toMatchObject({ source: 'Booking', booking_id, status: 'Active' })
    expect(repo().all('chat_participants').filter(r => r.chat_session_id === chats[0].chat_session_id)).toHaveLength(2)
    const [message] = messagesFor(booking_id)
    expectBookingUpdate(message, booking_id)
    expect(message.chat_session_id).toBe(chats[0].chat_session_id)
    expect(chats[0].last_message_at).toBe(message.sent_at)
    expect(participant(chats[0].chat_session_id, agencyUser(TRANG_AN))?.unread_count).toBe('1')
    expect(recipientReadStatus(chats[0].chat_session_id, agencyUser(TRANG_AN), message.message_id)).toBe('Unseen')
  })

  it('two events in a row and a second Booking of the same pair never open a second Active Chat', async () => {
    const first = await createBooking(provider, body(TRANG_AN, '2026-10-12T09:00:00+07:00'), options)
    const update = await updateBooking(provider, first.booking_id, { group_size: 11 }, options)
    const second = await createBooking(provider, body(TRANG_AN, '2026-10-12T11:00:00+07:00'), options)
    const chats = activeChats(TRANG_AN)
    expect(chats).toHaveLength(1)
    const updateMessage = repo().find('chat_messages', r => r.message_id === update.agency_notification_message_id)!
    expectBookingUpdate(updateMessage, first.booking_id)
    expect(updateMessage.text).toContain('changed: group_size')
    expect(messagesFor(second.booking_id)[0].chat_session_id).toBe(chats[0].chat_session_id)
    expect(participant(chats[0].chat_session_id, agencyUser(TRANG_AN))?.unread_count).toBe('3')
  })

  it('an existing Active Chat of the pair is reused (latest Active pair Chat)', async () => {
    const before = activeChats(EBF)
    expect(before).toHaveLength(1)
    const result = await markGroupArrival(provider, BOOKED_EBF, { now: () => new Date('2026-10-05T09:00:00+07:00') })
    expect(result.transition_applied).toBe(true)
    expect(activeChats(EBF)).toHaveLength(1)
    const [message] = messagesFor(BOOKED_EBF)
    expectBookingUpdate(message, BOOKED_EBF)
    expect(message.chat_session_id).toBe(before[0].chat_session_id)
  })

  it('#56 and analyze M6: source_chat_session_id is used only if Active, of the same pair, and existing', async () => {
    const ebfChat = activeChats(EBF)[0].chat_session_id
    const songHongChat = activeChats(SONG_HONG)[0].chat_session_id

    const fromSource = await createBooking(provider, body(EBF, '2026-10-12T09:00:00+07:00', { source_chat_session_id: ebfChat }), options)
    expect(messagesFor(fromSource.booking_id)[0].chat_session_id).toBe(ebfChat)

    const otherPair = await createBooking(provider, body(EBF, '2026-10-12T11:00:00+07:00', { source_chat_session_id: songHongChat }), options)
    expect(messagesFor(otherPair.booking_id)[0].chat_session_id).toBe(ebfChat)

    const missing = await createBooking(provider, body(EBF, '2026-10-12T13:00:00+07:00', { source_chat_session_id: '00000000-0000-4000-8000-000000000000' }), options)
    expect(messagesFor(missing.booking_id)[0].chat_session_id).toBe(ebfChat)

    repo().update('chat_sessions', r => r.chat_session_id === ebfChat, { status: 'Closed', closed_at: '2026-09-30T00:00:00+07:00', closed_by: provider.userId! })
    const closed = await createBooking(provider, body(EBF, '2026-10-12T15:00:00+07:00', { source_chat_session_id: ebfChat }), options)
    const chatOfClosedCase = messagesFor(closed.booking_id)[0].chat_session_id
    expect(chatOfClosedCase).not.toBe(ebfChat)
    expect(activeChats(EBF)).toHaveLength(1)
  })

  it('#55: status change and arrival return the id of their Booking Update message', async () => {
    const { booking_id } = await createBooking(provider, body(TRANG_AN, '2026-10-12T09:00:00+07:00'), options)
    const confirm = await changeBookingStatus(provider, booking_id, { target_status: 'Booked' }, options)
    const message = repo().find('chat_messages', r => r.message_id === confirm.agency_notification_message_id)!
    expectBookingUpdate(message, booking_id)
    expect(message.text.startsWith('Booking Booked')).toBe(true)
  })

  it('BR-012: rejected and no-op actions send no message', async () => {
    const { booking_id } = await createBooking(provider, body(TRANG_AN, '2026-10-12T09:00:00+07:00'), options)
    const messages = repo().all('chat_messages').length
    await expect(createBooking(provider, body(TRANG_AN, '2026-10-12T09:00:00+07:00'), options)).rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' })
    await updateBooking(provider, booking_id, { group_size: 10 }, options) // #52 no-op
    await expect(changeBookingStatus(provider, booking_id, { target_status: 'Cancelled' }, options)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(repo().all('chat_messages')).toHaveLength(messages)
  })
})
