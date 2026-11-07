import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as handoff } from '@/app/api/demo/handoff/route'
import * as aitQuote from '@/app/api/ait/sessions/[id]/quote/route'
import * as aitChat from '@/app/api/ait/sessions/[id]/chat/route'
import { retrieveCandidates } from '@/lib/matching/candidate-repo'
import { AGENCY_ID, AGENCY_USER, EXPERIENCE, PROVIDER_ID, activePairChats, repo, writeSnapshot } from '../unit/iac-fixtures'

// Integration contract §6 "AIT → IAC / EXP" (docs/test/integration-contract.md). AIT reads the same
// Experience/Provider records as Explore and hands off to the same IAC pair Chat. spec-AIT FR-011
// (Request Quote / Chat from a recommendation, reuse an Active Chat and append the new context),
// BR-001 (the Agency owns its matching session), BR-003 (only published Verified Providers),
// BR-018 (Quote source Matching); spec-IAC FR-001 / AC-IAC-PAIR, #19 (source AI Matching + matching_session_id).
const MATCHING = 'fb8dee73-96ba-56c1-b6d1-17041b6ed031' // owned by the demo Agency 02e568d8…
type Handler = (request: never, context: never) => Promise<Response>

async function post(handler: Handler, url: string, body: unknown, params?: Record<string, string>, account = 'agency') {
  const request = new NextRequest(`http://localhost:3000${url}`, {
    method: 'POST', headers: { cookie: `hab_demo_account=${account}`, 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
  const response = await handler(request as never, (params ? { params } : undefined) as never)
  return { status: response.status, body: await response.json() as any }
}
const quote = (session: string, body: unknown, account?: string) => post((aitQuote as any).POST, `/api/ait/sessions/${session}/quote`, body, { id: session }, account)
const chat = (session: string, body: unknown, account?: string) => post((aitChat as any).POST, `/api/ait/sessions/${session}/chat`, body, { id: session }, account)

describe('Contract AIT → IAC / EXP | matching results to Quote / Chat (integration-contract §6)', () => {
  beforeEach(() => repo().reset())

  it('AIT FR-011 / BR-018 → IAC #19 (normal): Request Quote from a recommendation writes Matching + matching_session_id and an AI Matching Chat', async () => {
    const res = await quote(MATCHING, { experience_id: EXPERIENCE })
    expect(res.status).toBe(200)
    expect(repo().find('quote_requests', q => q.quote_request_id === res.body.quote_request_id)).toMatchObject({ agency_id: AGENCY_ID, experience_id: EXPERIENCE, source: 'Matching', matching_session_id: MATCHING })
    expect(repo().find('chat_sessions', c => c.chat_session_id === res.body.chat_session_id)).toMatchObject({ source: 'AI Matching', matching_session_id: MATCHING, status: 'Active' })
    expect(repo().all('chat_messages').filter(m => m.chat_session_id === res.body.chat_session_id)).toEqual([
      expect.objectContaining({ message_kind: 'Quote Request', sender_user_id: AGENCY_USER, quote_request_id: res.body.quote_request_id }),
    ])
  })

  it('AIT FR-011 reuse / IAC AC-IAC-PAIR (boundary): after an Explore Chat with the Provider, AIT reuses that Chat and appends the new Quote context', async () => {
    const explore = await handoff(new NextRequest('http://localhost:3000/api/demo/handoff', {
      method: 'POST', headers: { cookie: 'hab_demo_account=agency', 'content-type': 'application/json' }, body: JSON.stringify({ action: 'chat', experience_id: EXPERIENCE }),
    }))
    const exploreChat = (await explore.json()).data.chat_session_id
    const res = await quote(MATCHING, { experience_id: EXPERIENCE })
    expect(res.body).toMatchObject({ chat_session_id: exploreChat, is_new_session: false, is_new_request: true })
    expect(activePairChats(AGENCY_ID, PROVIDER_ID)).toHaveLength(1)
    expect(repo().all('chat_messages').filter(m => m.chat_session_id === exploreChat).map(m => m.message_kind)).toEqual(['User Text', 'Quote Request'])
  })

  it('AIT BR-003 ↔ EXP BR-001 (boundary): a Provider that is no longer Verified leaves AIT candidates and its handoff is refused (409)', async () => {
    expect((await retrieveCandidates()).some(c => c.experience_id === EXPERIENCE)).toBe(true)
    repo().update('provider_profiles', row => row.provider_id === PROVIDER_ID, { verification_status: 'Revision Required', published_version_no: '' })
    expect((await retrieveCandidates()).some(c => c.experience_id === EXPERIENCE)).toBe(false)
    const before = writeSnapshot()
    expect((await chat(MATCHING, { experience_id: EXPERIENCE })).status).toBe(409)
    expect(writeSnapshot()).toBe(before)
  })

  it('AIT BR-001 (error): another Agency\'s matching session is 403, Guest is 401, a missing experience_id is 400; nothing is written', async () => {
    const other = repo().find('matching_sessions', row => row.agency_id !== AGENCY_ID)!.matching_session_id
    const before = writeSnapshot()
    expect((await quote(other, { experience_id: EXPERIENCE })).status).toBe(403)
    expect((await chat(MATCHING, { experience_id: EXPERIENCE }, 'guest')).status).toBe(401)
    expect((await quote(MATCHING, {})).status).toBe(400)
    expect(writeSnapshot()).toBe(before)
  })
})
