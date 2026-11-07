/**
 * Slice C (linh/exp-fixes) – EXP FR-007 strong-interest signal from the live Quote/Chat handoff, and
 * FR-011 Request Quote hidden after use. Written before the code (Constitution II).
 *
 * - FR-007 + spec-EXP #29: Request Quote / Chat through POST /api/demo/handoff record a `request_quote` /
 *   `open_chat` interaction in the Agency's current Explore session, with
 *   `filter_values = { source_context }` (Card | Detail Page); the response carries `action_signal_log_id`.
 * - spec-EXP #32: only a new Quote Request logs; a reused Quote logs nothing.
 * - spec-EXP #33: Chat from the Explore Provider page sends source_context "Detail Page".
 * - FR-011: `hasQuoteRequest` tells the Experience page the Agency already asked for a Quote.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as handoff } from '@/app/api/demo/handoff/route'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoSessionContextFor } from '@/lib/auth/session'
import { demoRepository } from '@/lib/demo/json-repository'
import { createQuoteHandoff, hasQuoteRequest } from '@/lib/demo/commercial-handoff-service'
import { demoRuntime } from '@/lib/explore/demo-runtime'

const EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
const TRANG_AN = DEMO_IDENTITIES.agency.agencyId!
const AGENCY = (await demoSessionContextFor('agency'))
const GUEST = (await demoSessionContextFor('guest'))

async function agencyExploreSession(): Promise<string> {
  return (await (await demoRuntime()).startSession({ kind: 'agency', agencyId: TRANG_AN }, true)).session_id
}

function post(body: unknown, exploreSession?: string) {
  const cookie = ['hab_demo_account=agency', exploreSession ? `explore_session=${exploreSession}` : ''].filter(Boolean).join('; ')
  return handoff(new NextRequest('http://localhost:3000/api/demo/handoff', {
    method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }))
}

const strongEvents = async (sessionId: string) => (await (await demoRuntime()).eventsFor(sessionId))
  .filter(event => event.action_type === 'request_quote' || event.action_type === 'open_chat')

describe('Slice C | FR-007 signal from the live handoff (spec-EXP #29, #32, #33)', () => {
  beforeEach(() => demoRepository().reset())

  it('Request Quote from the detail page logs one request_quote with source_context in filter_values', async () => {
    const session = (await agencyExploreSession())
    const res = await post({ action: 'quote', experience_id: EXPERIENCE, source_context: 'Detail Page' }, session)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.action_signal_log_id).toEqual(expect.any(String))
    expect((await strongEvents(session))).toEqual([expect.objectContaining({
      action_type: 'request_quote', experience_id: EXPERIENCE, filter_values: { source_context: 'Detail Page' },
      interaction_id: body.data.action_signal_log_id,
    })])
  })

  it('a reused Quote logs nothing more (#32)', async () => {
    const session = (await agencyExploreSession())
    await post({ action: 'quote', experience_id: EXPERIENCE, source_context: 'Detail Page' }, session)
    const again = await (await post({ action: 'quote', experience_id: EXPERIENCE, source_context: 'Detail Page' }, session)).json()
    expect(again.data.is_new_request).toBe(false)
    expect(again.data.action_signal_log_id).toBeNull()
    expect((await strongEvents(session))).toHaveLength(1)
  })

  it('Chat logs open_chat with its source_context (#33: Provider page = Detail Page)', async () => {
    const session = (await agencyExploreSession())
    const res = await post({ action: 'chat', experience_id: EXPERIENCE, source_context: 'Detail Page' }, session)
    expect(res.status).toBe(200)
    expect((await strongEvents(session))).toEqual([expect.objectContaining({ action_type: 'open_chat', filter_values: { source_context: 'Detail Page' } })])
  })

  it('rejects a source_context outside Card / Detail Page and writes nothing', async () => {
    const session = (await agencyExploreSession())
    const quotes = demoRepository().all('quote_requests').length
    const res = await post({ action: 'quote', experience_id: EXPERIENCE, source_context: 'Search result' }, session)
    expect(res.status).toBe(400)
    expect(demoRepository().all('quote_requests')).toHaveLength(quotes)
    expect((await strongEvents(session))).toHaveLength(0)
  })

  it('without an Explore session the handoff still works and logs nothing', async () => {
    const res = await post({ action: 'quote', experience_id: EXPERIENCE, source_context: 'Detail Page' })
    expect(res.status).toBe(201)
    expect((await res.json()).data.action_signal_log_id).toBeNull()
  })
})

describe('Slice C | FR-011 Request Quote hidden after use (Q8)', () => {
  beforeEach(() => demoRepository().reset())

  it('hasQuoteRequest is false before and true after this Agency asked for this Experience', async () => {
    expect((await hasQuoteRequest(AGENCY, EXPERIENCE))).toBe(false)
    await createQuoteHandoff(AGENCY, EXPERIENCE)
    expect((await hasQuoteRequest(AGENCY, EXPERIENCE))).toBe(true)
    expect((await hasQuoteRequest(GUEST, EXPERIENCE))).toBe(false)
  })
})
