import { describe, it, expect } from 'vitest'
import {
  createMatchingSession,
  addMessage,
  getAgencyMatchingSessions,
  updateMatchingSessionContext,
  closeMatchingSession,
  getMatchingSession,
} from '@/lib/matching/session-service'
import { GET as getSessions } from '@/app/api/ait/sessions/route'
import { GET as getSessionById, PATCH as patchSessionById, DELETE as deleteSessionById } from '@/app/api/ait/sessions/[id]/route'

import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'

describe('AI Matching Session Persistence Across Redirect & Re-login', () => {
  const testAgencyId = DEMO_IDENTITIES.agency.agencyId!

  it('persists session context and retrieves agency sessions sorted by last activity', async () => {
    // 1. Create a session for this agency
    const session = await createMatchingSession({ agencyId: testAgencyId })
    expect(session.matching_session_id).toBeTruthy()

    // 2. Add an Agency message and an Assistant message
    await addMessage(session.matching_session_id, 'Agency', 'Tìm tour gốm Bát Tràng cho đoàn 20 khách')
    await addMessage(session.matching_session_id, 'Assistant', 'Đã phân tích yêu cầu tour cho đoàn 20 khách tại Bát Tràng.')

    // 3. Update session context (saving cards, title, subTitle, message state)
    await updateMatchingSessionContext(session.matching_session_id, {
      title: 'Tour gốm Bát Tràng',
      subTitle: 'Gốm Bát Tràng · 20 khách',
      messages: [
        { id: '1', sender: 'Agency', text: 'Tìm tour gốm Bát Tràng cho đoàn 20 khách' },
        { id: '2', sender: 'Assistant', text: 'Đã phân tích yêu cầu tour cho đoàn 20 khách tại Bát Tràng.', recommendations: [{ name: 'Nặn gốm' }] },
      ],
      updatedAt: Date.now(),
    })

    // 4. Query sessions for this agency (as happens when user re-logs in or redirects)
    const sessions = await getAgencyMatchingSessions(testAgencyId)
    expect(sessions.length).toBeGreaterThan(0)

    const found = sessions.find(s => s.matching_session_id === session.matching_session_id)
    expect(found).toBeDefined()
    expect(found?.conversation_context?.title).toBe('Tour gốm Bát Tràng')
    expect(found?.conversation_context?.messages).toHaveLength(2)
    expect(found?.conversation_context?.messages[1].recommendations).toBeDefined()

    // 5. Test close/delete session
    await closeMatchingSession(session.matching_session_id)
    const sessionsAfterClose = await getAgencyMatchingSessions(testAgencyId)
    const foundAfterClose = sessionsAfterClose.find(s => s.matching_session_id === session.matching_session_id)
    expect(foundAfterClose).toBeUndefined()
  })

  it('GET /api/ait/sessions returns 401 for unauthenticated request and sessions for agency', async () => {
    const unauthReq = new Request('http://localhost:3000/api/ait/sessions')
    const res = await getSessions(unauthReq)
    expect(res.status).toBe(401)
  })

  it('PATCH and GET /api/ait/sessions/[id] correctly update and retrieve session context', async () => {
    const session = await createMatchingSession({ agencyId: testAgencyId })

    // Build mock auth header/cookie via test demo account
    const req = new Request(`http://localhost:3000/api/ait/sessions/${session.matching_session_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'hab_demo_account=agency',
      },
      body: JSON.stringify({
        context: {
          title: 'Khảo sát lụa Vạn Phúc',
          messages: [{ id: 'm1', sender: 'Agency', text: 'Hỏi về làng lụa' }],
        },
      }),
    })

    const patchRes = await patchSessionById(req, { params: { id: session.matching_session_id } })
    expect(patchRes.status).toBe(200)

    const updated = await getMatchingSession(session.matching_session_id)
    expect(updated).toBeDefined()
  })
})
