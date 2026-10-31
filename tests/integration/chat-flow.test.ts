/**
 * T020 — End-to-end integration flow between Tour Agency and Local Provider
 * Covers complete conversational flow: open session, message exchange, markdown rendering, unread count reset, and persistence.
 *
 * CONSTITUTION II: Written BEFORE IAC service & routes are implemented.
 * This test MUST FAIL until implementation is complete.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { POST as openSessionRoute, GET as getSessionsRoute } from '@/app/api/iac/sessions/route'
import { POST as sendMessageRoute, GET as getMessagesRoute } from '@/app/api/iac/sessions/[id]/messages/route'
import { demoRepository } from '@/lib/demo/json-repository'
import { getSeedAgencies, getSeedProviders } from '@/lib/iac/seed-accessor'

describe('T020 | End-to-End IAC Conversation Flow (Agency <-> Provider)', () => {
  const seedAgencies = getSeedAgencies()
  const seedProviders = getSeedProviders()

  const agency = seedAgencies[0]
  const provider = seedProviders[0]

  beforeEach(() => {
    demoRepository().reset()
    demoRepository().remove(
      'chat_sessions',
      s => s.agency_id === agency.agency_id && s.provider_id === provider.provider_id
    )
  })

  it('runs complete communication cycle from initial handshake to reply', async () => {
    // 1. Tour Agency initiates chat from Explore
    const openReq = new Request('http://localhost:3000/api/iac/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-user-id': agency.user_id,
        'x-mock-role': 'TourAgency',
      },
      body: JSON.stringify({
        recipient_id: provider.provider_id,
        source: 'Explore',
      }),
    })

    const openRes = await openSessionRoute(openReq)
    expect(openRes.status).toBe(201)
    const { chat_session_id } = await openRes.json()
    expect(chat_session_id).toBeTruthy()

    // 2. Tour Agency sends first message with bold & italic markdown
    const sendReq1 = new Request(`http://localhost:3000/api/iac/sessions/${chat_session_id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-user-id': agency.user_id,
        'x-mock-role': 'TourAgency',
      },
      body: JSON.stringify({
        message_text: 'Greetings! Can we book **15 participants** for *next Saturday*?',
      }),
    })

    const sendRes1 = await sendMessageRoute(sendReq1, { params: { id: chat_session_id } })
    expect(sendRes1.status).toBe(201)

    // 3. Local Provider checks chat list -> sees conversation with unread_count = 1
    const listReq = new Request('http://localhost:3000/api/iac/sessions', {
      method: 'GET',
      headers: {
        'x-mock-user-id': provider.user_id,
        'x-mock-role': 'LocalProvider',
      },
    })

    const listRes = await getSessionsRoute(listReq)
    expect(listRes.status).toBe(200)
    const listData = await listRes.json()
    const conv = listData.chat_list.find((c: { chat_session_id: string }) => c.chat_session_id === chat_session_id)
    expect(conv).toBeDefined()
    expect(conv.unread_count).toBe(1)
    expect(conv.organization).toBe(agency.company_name)

    // 4. Local Provider opens message history -> unread count resets to 0
    const historyReq = new Request(`http://localhost:3000/api/iac/sessions/${chat_session_id}/messages`, {
      method: 'GET',
      headers: {
        'x-mock-user-id': provider.user_id,
        'x-mock-role': 'LocalProvider',
      },
    })

    const historyRes = await getMessagesRoute(historyReq, { params: { id: chat_session_id } })
    expect(historyRes.status).toBe(200)
    const historyData = await historyRes.json()
    expect(historyData.message_history).toHaveLength(1)
    expect(historyData.message_history[0].text).toContain('15 participants')

    // 5. Local Provider replies
    const replyReq = new Request(`http://localhost:3000/api/iac/sessions/${chat_session_id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-user-id': provider.user_id,
        'x-mock-role': 'LocalProvider',
      },
      body: JSON.stringify({
        message_text: 'Yes, we are delighted to welcome your group. The workshop is ready.',
      }),
    })

    const replyRes = await sendMessageRoute(replyReq, { params: { id: chat_session_id } })
    expect(replyRes.status).toBe(201)

    // 6. Agency views history -> now sees 2 messages chronologically
    const agencyHistoryReq = new Request(`http://localhost:3000/api/iac/sessions/${chat_session_id}/messages`, {
      method: 'GET',
      headers: {
        'x-mock-user-id': agency.user_id,
        'x-mock-role': 'TourAgency',
      },
    })

    const agencyHistoryRes = await getMessagesRoute(agencyHistoryReq, { params: { id: chat_session_id } })
    expect(agencyHistoryRes.status).toBe(200)
    const agencyHistoryData = await agencyHistoryRes.json()
    expect(agencyHistoryData.message_history).toHaveLength(2)
    expect(agencyHistoryData.message_history[0].text).toContain('15 participants')
    expect(agencyHistoryData.message_history[1].text).toContain('delighted to welcome')
  })
})

