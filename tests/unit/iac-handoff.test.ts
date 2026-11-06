// T029: Explore / AIT / Provider-page handoffs on the shared chat service (#18, #19, #21, #26, Q2, H3, M5).
import { beforeEach, describe, expect, it } from 'vitest'
import { createChatHandoff, createQuoteHandoff } from '@/lib/demo/commercial-handoff-service'
import { createBooking } from '@/lib/booking/create-booking'
import { SEED_NOW } from '@/lib/booking/clock'
import { AGENCY_ID, AGENCY_USER, DEMO_AGENCY, DEMO_PROVIDER, EXPERIENCE, PROVIDER_ID, PROVIDER_USER, activePairChats, participant, repo } from './iac-fixtures'

const MATCHING = 'fb8dee73-96ba-56c1-b6d1-17041b6ed031'
const chatRow = (id: string) => repo().find('chat_sessions', row => row.chat_session_id === id)!
const messagesOf = (id: string) => repo().all('chat_messages').filter(m => m.chat_session_id === id)

describe('T029 | handoffs on the shared chat service', () => {
  beforeEach(() => repo().reset())

  it('Explore Chat: Active Chat with source Explore and one User Text context message from the Agency (#18, #19)', async () => {
    const result = await createChatHandoff(DEMO_AGENCY, EXPERIENCE, { source: 'Explore' })
    expect(result).toMatchObject({ chat_session_id: expect.any(String), chat_status: 'Active', is_new_session: true, initial_message_id: expect.any(String) })
    expect(chatRow(result.chat_session_id)).toMatchObject({ source: 'Explore', status: 'Active', experience_id: EXPERIENCE })
    const [message] = messagesOf(result.chat_session_id)
    expect(message).toMatchObject({ message_id: result.initial_message_id, message_kind: 'User Text', sender_user_id: AGENCY_USER, experience_id: EXPERIENCE })
    expect(message.text).toContain('Nặn gốm thủ công')
    expect(message.text).toContain(`/explore/experiences/${EXPERIENCE}`)
    const again = await createChatHandoff(DEMO_AGENCY, EXPERIENCE)
    expect(again).toMatchObject({ chat_session_id: result.chat_session_id, is_new_session: false })
  })

  it('Provider page and AIT write their own source (#19)', async () => {
    const page = await createChatHandoff(DEMO_AGENCY, EXPERIENCE, { source: 'Provider Profile' })
    expect(chatRow(page.chat_session_id).source).toBe('Provider Profile')
    repo().reset()
    const ait = await createChatHandoff(DEMO_AGENCY, EXPERIENCE, { source: 'AI Matching', matchingSessionId: MATCHING })
    expect(chatRow(ait.chat_session_id)).toMatchObject({ source: 'AI Matching', matching_session_id: MATCHING })
  })

  it('Quote: Quote Request message once; Quote source Explore or Matching + matching_session_id (M5, quote_source_chk)', async () => {
    const first = await createQuoteHandoff(DEMO_AGENCY, EXPERIENCE, { source: 'Explore' })
    expect(first).toMatchObject({ is_new_request: true, chat_status: 'Active', is_new_session: true })
    expect(messagesOf(first.chat_session_id).map(m => m.message_kind)).toEqual(['Quote Request'])
    expect(repo().find('quote_requests', q => q.quote_request_id === first.quote_request_id)).toMatchObject({ source: 'Explore', matching_session_id: '' })
    const second = await createQuoteHandoff(DEMO_AGENCY, EXPERIENCE)
    expect(second).toMatchObject({ quote_request_id: first.quote_request_id, is_new_request: false, is_new_session: false })
    expect(messagesOf(first.chat_session_id)).toHaveLength(1)

    repo().reset()
    const ait = await createQuoteHandoff(DEMO_AGENCY, EXPERIENCE, { source: 'AI Matching', matchingSessionId: MATCHING })
    expect(repo().find('quote_requests', q => q.quote_request_id === ait.quote_request_id)).toMatchObject({ source: 'Matching', matching_session_id: MATCHING })
  })

  it('each context message adds 1 to the Provider unread (#26)', async () => {
    const first = await createChatHandoff(DEMO_AGENCY, EXPERIENCE)
    expect(participant(first.chat_session_id, PROVIDER_USER)!.unread_count).toBe('1')
    await createChatHandoff(DEMO_AGENCY, EXPERIENCE)
    expect(participant(first.chat_session_id, PROVIDER_USER)!.unread_count).toBe('2')
    expect(participant(first.chat_session_id, AGENCY_USER)!.unread_count).toBe('0')
  })

  it('writes only schema values (Q2)', async () => {
    await createQuoteHandoff(DEMO_AGENCY, EXPERIENCE)
    await createChatHandoff(DEMO_AGENCY, EXPERIENCE, { source: 'Provider Profile' })
    expect(repo().all('chat_sessions').filter(c => !['Active', 'Closed'].includes(c.status))).toEqual([])
    expect(repo().all('chat_messages').filter(m => ['Text', 'Experience Context'].includes(m.message_kind))).toEqual([])
  })

  it('reuses an Active Chat that a Booking created for the pair', async () => {
    await createBooking(DEMO_PROVIDER, {
      experience_id: EXPERIENCE, agency_id: AGENCY_ID, start_at: '2026-10-12T09:00:00+07:00', duration: 60, group_size: 10,
      agreed_price: 2000000, booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
    }, { now: () => new Date(SEED_NOW) })
    const [bookingChat] = activePairChats(AGENCY_ID, PROVIDER_ID)
    const handoff = await createChatHandoff(DEMO_AGENCY, EXPERIENCE)
    expect(handoff).toMatchObject({ chat_session_id: bookingChat.chat_session_id, is_new_session: false })
    expect(activePairChats(AGENCY_ID, PROVIDER_ID)).toHaveLength(1)
  })
})
