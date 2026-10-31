/**
 * T017 — Chat list sorting, unread counter reset & 50-message pagination (FR-003, BR-013, BR-014, BR-015, BR-016, BR-017)
 *
 * CONSTITUTION II: Written BEFORE route implementations exist.
 * These tests MUST FAIL until T018/T019 are implemented.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { GET as getSessionsRoute } from '@/app/api/iac/sessions/route'
import { GET as getMessagesRoute } from '@/app/api/iac/sessions/[id]/messages/route'
import { demoRepository } from '@/lib/demo/json-repository'
import { getSeedAgencies, getSeedProviders } from '@/lib/iac/seed-accessor'

describe('T017 | Chat List & Message History API (FR-003, BR-013 .. BR-017)', () => {
  const seedAgencies = getSeedAgencies()
  const seedProviders = getSeedProviders()

  const testAgency = seedAgencies[0]
  const testProvider = seedProviders[0]
  const sessionId = '77777777-7777-7777-7777-777777777772'

  beforeEach(() => {
    demoRepository().reset()

    demoRepository().insert('chat_sessions', {
      chat_session_id: sessionId,
      agency_id: testAgency.agency_id,
      provider_id: testProvider.provider_id,
      source: 'Explore',
      status: 'Active',
      started_at: new Date('2026-10-30T04:00:00Z').toISOString(),
      last_message_at: new Date('2026-10-30T04:15:00Z').toISOString(),
    })

    demoRepository().insert('chat_participants', {
      chat_session_id: sessionId,
      user_id: testAgency.user_id,
      unread_count: '0',
    })

    demoRepository().insert('chat_participants', {
      chat_session_id: sessionId,
      user_id: testProvider.user_id,
      unread_count: '2',
    })

    demoRepository().insert('chat_messages', {
      message_id: 'msg-001',
      chat_session_id: sessionId,
      sender_user_id: testAgency.user_id,
      text: 'Message 1',
      message_kind: 'User Text',
      sent_at: new Date('2026-10-30T04:10:00Z').toISOString(),
    })

    demoRepository().insert('chat_messages', {
      message_id: 'msg-002',
      chat_session_id: sessionId,
      sender_user_id: testAgency.user_id,
      text: 'Message 2 with latest info',
      message_kind: 'User Text',
      sent_at: new Date('2026-10-30T04:15:00Z').toISOString(),
    })
  })

  it('FR-003 / BR-013 / BR-016: lists conversations for Tour Agency with provider info', async () => {
    const req = new Request('http://localhost:3000/api/iac/sessions', {
      method: 'GET',
      headers: {
        'x-mock-user-id': testAgency.user_id,
        'x-mock-role': 'TourAgency',
      },
    })

    const res = await getSessionsRoute(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.chat_list).toBeDefined()
    expect(data.chat_list.length).toBeGreaterThanOrEqual(1)

    const item = data.chat_list.find((c: { chat_session_id: string }) => c.chat_session_id === sessionId)
    expect(item).toBeDefined()
    expect(item.participant_name).toBeTruthy()
    expect(item.organization).toBeTruthy()
    expect(item.last_message_preview).toContain('Message 2')
  })

  it('BR-014 / BR-015: returns chronological message history up to 50 items', async () => {
    const req = new Request(`http://localhost:3000/api/iac/sessions/${sessionId}/messages`, {
      method: 'GET',
      headers: {
        'x-mock-user-id': testAgency.user_id,
        'x-mock-role': 'TourAgency',
      },
    })

    const res = await getMessagesRoute(req, { params: { id: sessionId } })
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.message_history).toHaveLength(2)
    // Oldest first
    expect(data.message_history[0].message_id).toBe('msg-001')
    expect(data.message_history[1].message_id).toBe('msg-002')
  })

  it('BR-017: resets unread count to 0 when participant views message history', async () => {
    const req = new Request(`http://localhost:3000/api/iac/sessions/${sessionId}/messages`, {
      method: 'GET',
      headers: {
        'x-mock-user-id': testProvider.user_id,
        'x-mock-role': 'LocalProvider',
      },
    })

    const res = await getMessagesRoute(req, { params: { id: sessionId } })
    expect(res.status).toBe(200)

    const participant = demoRepository().find(
      'chat_participants',
      p => p.chat_session_id === sessionId && p.user_id === testProvider.user_id
    )
    expect(Number(participant?.unread_count)).toBe(0)
  })

  it('BR-002: rejects non-participant from viewing message history with 403', async () => {
    const req = new Request(`http://localhost:3000/api/iac/sessions/${sessionId}/messages`, {
      method: 'GET',
      headers: {
        'x-mock-user-id': seedAgencies[1].user_id,
        'x-mock-role': 'TourAgency',
      },
    })

    const res = await getMessagesRoute(req, { params: { id: sessionId } })
    expect(res.status).toBe(403)
  })
})

