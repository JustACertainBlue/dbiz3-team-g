import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as handoff } from '@/app/api/demo/handoff/route'
import { AGENCY_ID, AGENCY_USER, EXPERIENCE, PROVIDER_ID, activePairChats, repo, writeSnapshot } from '../unit/iac-fixtures'

// Integration contract §5 "EXP → IAC: Quote Request / Chat handoff" (docs/test/integration-contract.md),
// through the route Explore calls (`POST /api/demo/handoff`). spec-EXP FR-011 (Quote created or reused, one
// per Agency–Experience pair; Chat scoped per Agency–Provider pair), FR-012 (Chat + initial message),
// BR-009 (only a Tour Agency), BR-010 (no Booking is created); spec-IAC FR-001 / AC-IAC-PAIR (one Active
// Chat per pair), #18 (context message from the Agency), #19 (source Explore).
const SECOND_EXPERIENCE = '00000000-0000-4000-8000-0000000000e2'

async function post(body: unknown, account = 'agency') {
  const response = await handoff(new NextRequest('http://localhost:3000/api/demo/handoff', {
    method: 'POST', headers: { cookie: `hab_demo_account=${account}`, 'content-type': 'application/json' }, body: JSON.stringify(body),
  }))
  return { status: response.status, body: await response.json() as any }
}
const messagesOf = (chatId: string) => repo().all('chat_messages').filter(row => row.chat_session_id === chatId)

describe('Contract EXP → IAC | Quote Request / Chat handoff (integration-contract §5)', () => {
  beforeEach(() => {
    repo().reset()
    const first = repo().find('experiences', row => row.experience_id === EXPERIENCE)!
    repo().insert('experiences', { ...first, experience_id: SECOND_EXPERIENCE, name: 'Trải nghiệm thứ hai cùng xưởng' })
  })

  it('EXP FR-011 / BR-010 → IAC FR-001 #18 #19 (normal): Request Quote creates one Quote, one Active pair Chat and an Agency context message, and no Booking', async () => {
    const bookings = repo().all('bookings').length
    const res = await post({ action: 'quote', experience_id: EXPERIENCE, source_context: 'Card' })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ is_new_request: true, chat_status: 'Active' })
    expect(repo().find('quote_requests', q => q.quote_request_id === res.body.data.quote_request_id)).toMatchObject({ agency_id: AGENCY_ID, experience_id: EXPERIENCE, source: 'Explore' })
    expect(activePairChats(AGENCY_ID, PROVIDER_ID).map(c => c.chat_session_id)).toEqual([res.body.data.chat_session_id])
    expect(repo().find('chat_sessions', c => c.chat_session_id === res.body.data.chat_session_id)?.source).toBe('Explore')
    expect(messagesOf(res.body.data.chat_session_id)).toEqual([expect.objectContaining({
      message_kind: 'Quote Request', sender_user_id: AGENCY_USER, experience_id: EXPERIENCE, quote_request_id: res.body.data.quote_request_id,
    })])
    expect(repo().all('bookings').length).toBe(bookings)
  })

  it('EXP FR-011 one Quote per Agency–Experience (boundary): a second Request Quote reuses the Quote and adds no message', async () => {
    const first = await post({ action: 'quote', experience_id: EXPERIENCE })
    const second = await post({ action: 'quote', experience_id: EXPERIENCE })
    expect(second.body.data).toMatchObject({ is_new_request: false, quote_request_id: first.body.data.quote_request_id, chat_session_id: first.body.data.chat_session_id })
    expect(repo().all('quote_requests').filter(q => q.agency_id === AGENCY_ID && q.experience_id === EXPERIENCE)).toHaveLength(1)
    expect(messagesOf(first.body.data.chat_session_id)).toHaveLength(1)
  })

  it('EXP FR-011 pair scope / IAC AC-IAC-PAIR (boundary): Chat about another Experience of the same Provider reuses the one Active Chat', async () => {
    const quote = await post({ action: 'quote', experience_id: EXPERIENCE })
    const chat = await post({ action: 'chat', experience_id: SECOND_EXPERIENCE, source_context: 'Detail Page' })
    expect(chat.status).toBe(200)
    expect(chat.body.data).toMatchObject({ chat_session_id: quote.body.data.chat_session_id, is_new_session: false })
    expect(activePairChats(AGENCY_ID, PROVIDER_ID)).toHaveLength(1)
    const initial = messagesOf(quote.body.data.chat_session_id).find(m => m.message_id === chat.body.data.initial_message_id)
    expect(initial).toMatchObject({ message_kind: 'User Text', sender_user_id: AGENCY_USER, experience_id: SECOND_EXPERIENCE })
  })

  it('EXP BR-009 / FR-011 (error): Guest and Provider are refused (403), an archived Experience is 404, and nothing is written', async () => {
    const before = writeSnapshot()
    expect((await post({ action: 'quote', experience_id: EXPERIENCE }, 'guest')).status).toBe(403)
    expect((await post({ action: 'chat', experience_id: EXPERIENCE }, 'provider')).status).toBe(403)
    repo().update('experiences', row => row.experience_id === SECOND_EXPERIENCE, { archived_at: '2026-11-01T08:00:00+07:00' })
    const archived = await post({ action: 'quote', experience_id: SECOND_EXPERIENCE })
    expect(archived).toMatchObject({ status: 404, body: { error: { code: 'HANDOFF_FAILED' } } })
    expect(writeSnapshot()).toBe(before)
  })
})
