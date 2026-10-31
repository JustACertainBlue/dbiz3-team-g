/**
 * T013 — Send message endpoint, immutability, timestamp update & closed session rejection (FR-002, BR-006, BR-018, BR-021)
 *
 * CONSTITUTION II: Written BEFORE src/app/api/iac/sessions/[id]/messages/route.ts exists.
 * These tests MUST FAIL until T015/T016 are implemented.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { POST as sendMessageRoute } from '@/app/api/iac/sessions/[id]/messages/route'
import { demoRepository } from '@/lib/demo/json-repository'
import { getSeedAgencies, getSeedProviders } from '@/lib/iac/seed-accessor'

describe('T013 | Chat Messages API (FR-002, BR-006, BR-018, BR-021)', () => {
  const seedAgencies = getSeedAgencies()
  const seedProviders = getSeedProviders()

  const testAgency = seedAgencies[0]
  const testProvider = seedProviders[0]
  const sessionId = '77777777-7777-7777-7777-777777777771'

  beforeEach(() => {
    demoRepository().reset()
    // Seed an active session with both participants
    demoRepository().insert('chat_sessions', {
      chat_session_id: sessionId,
      agency_id: testAgency.agency_id,
      provider_id: testProvider.provider_id,
      source: 'Explore',
      status: 'Active',
      started_at: new Date('2026-10-30T04:00:00Z').toISOString(),
      last_message_at: '',
    })

    demoRepository().insert('chat_participants', {
      chat_session_id: sessionId,
      user_id: testAgency.user_id,
      unread_count: '0',
    })

    demoRepository().insert('chat_participants', {
      chat_session_id: sessionId,
      user_id: testProvider.user_id,
      unread_count: '0',
    })
  })

  function makeSendMessageRequest(
    chatSessionId: string,
    body: Record<string, unknown>,
    userId: string,
    role: string
  ): Request {
    return new Request(`http://localhost:3000/api/iac/sessions/${chatSessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-user-id': userId,
        'x-mock-role': role,
      },
      body: JSON.stringify(body),
    })
  }

  it('FR-002: sends a message successfully and returns message_id and timestamps', async () => {
    const req = makeSendMessageRequest(
      sessionId,
      { message_text: 'Hello, we would like to book a group of 15.' },
      testAgency.user_id,
      'TourAgency'
    )

    const res = await sendMessageRoute(req, { params: { id: sessionId } })
    expect(res.status).toBe(201)

    const data = await res.json()
    expect(data.message_id).toBeTruthy()
    expect(data.sent_at).toBeTruthy()
    expect(data.last_message_timestamp).toBeTruthy()
  })

  it('BR-007: rejects empty message with 400', async () => {
    const req = makeSendMessageRequest(
      sessionId,
      { message_text: '   ' },
      testAgency.user_id,
      'TourAgency'
    )

    const res = await sendMessageRoute(req, { params: { id: sessionId } })
    expect(res.status).toBe(400)
  })

  it('BR-002: rejects non-participant from posting message with 403', async () => {
    const otherAgency = seedAgencies[1]
    const req = makeSendMessageRequest(
      sessionId,
      { message_text: 'Intruder message' },
      otherAgency.user_id,
      'TourAgency'
    )

    const res = await sendMessageRoute(req, { params: { id: sessionId } })
    expect(res.status).toBe(403)
  })

  it('BR-021 / AC-IAC-CLOSED: rejects sending message into a Closed session with 403', async () => {
    // Close the session
    demoRepository().update(
      'chat_sessions',
      s => s.chat_session_id === sessionId,
      { status: 'Closed', closed_at: new Date().toISOString() }
    )

    const req = makeSendMessageRequest(
      sessionId,
      { message_text: 'Message after closure' },
      testAgency.user_id,
      'TourAgency'
    )

    const res = await sendMessageRoute(req, { params: { id: sessionId } })
    expect(res.status).toBe(403)
  })

  it('BR-018: verifies that sending a message does NOT create any booking record', async () => {
    const req = makeSendMessageRequest(
      sessionId,
      { message_text: 'Interested in booking' },
      testAgency.user_id,
      'TourAgency'
    )

    await sendMessageRoute(req, { params: { id: sessionId } })
    const bookings = demoRepository().all('bookings')
    const sourceChatBookings = bookings.filter(b => b.source_chat_session_id === sessionId)
    expect(sourceChatBookings).toHaveLength(0)
  })
})

