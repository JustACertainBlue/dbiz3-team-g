import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { createMatchingSession } from '@/lib/matching/session-service'
import * as sessionsRoute from '@/app/api/ait/sessions/route'
import * as messagesRoute from '@/app/api/ait/sessions/[id]/messages/route'
import * as matchingRoute from '@/app/api/ait/matching/route'
import * as quoteRoute from '@/app/api/ait/sessions/[id]/quote/route'
import * as chatRoute from '@/app/api/ait/sessions/[id]/chat/route'

// Round 3 (specs/001-ait-core/tasks.md Phase 5): AIT through the route handlers the UI calls.
// T034 (D8), T055 (D11) and the route-level parts of T035, T037, T039, T041, T043, T051.
type Handler = (request: never, context?: never) => Promise<Response>
type Json = Record<string, any>

const POST_SESSIONS = (sessionsRoute as unknown as { POST: Handler }).POST
const POST_MESSAGES = (messagesRoute as unknown as { POST: Handler }).POST
const POST_MATCHING = (matchingRoute as unknown as { POST: Handler }).POST
const POST_QUOTE = (quoteRoute as unknown as { POST: Handler }).POST
const POST_CHAT = (chatRoute as unknown as { POST: Handler }).POST

const VAN_PHUC = 'c8281688-2dc1-5cb1-9ff6-139df04ba562'
const CHUONG = 'b70bd0fa-6a81-5aec-9ff6-5303210b2fad'

async function call(handler: Handler, path: string, account: string, body?: unknown, params?: Json) {
  const request = new Request(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { cookie: `hab_demo_account=${account}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
  const response = await handler(request as never, (params ? { params } : undefined) as never)
  let json: Json | null = null
  try { json = await response.json() } catch { json = null }
  return { status: response.status, json: json as Json }
}

async function openSession(account = 'agency') {
  const result = await call(POST_SESSIONS, '/api/ait/sessions', account, {})
  return result.json.session_id as string
}

async function send(sessionId: string, text: string) {
  return call(POST_MESSAGES, `/api/ait/sessions/${sessionId}/messages`, 'agency', { sender: 'Agency', text }, { id: sessionId })
}

// One Agency turn as the UI runs it: message, then matching when the profile is complete.
async function turn(sessionId: string, text: string) {
  const message = await send(sessionId, text)
  const profile = message.json.tour_preference_profile
  if (!profile) return { message, matching: null as Json | null }
  const matching = await call(POST_MATCHING, '/api/ait/matching', 'agency', { session_id: sessionId, tour_preference_profile: profile })
  return { message, matching: matching.json }
}

const villages = (matching: Json | null) => (matching?.top_matches ?? []).map((m: Json) => m.village_name)
const budgetSuggestion = (matching: Json | null) =>
  matching?.relaxation_suggestions?.relaxation_suggestions?.find((s: Json) => s.criterion === 'Budget')
const commercialRows = () => JSON.stringify(['quote_requests', 'chat_sessions', 'chat_messages', 'bookings'].map(table => demoRepository().all(table as never)))

describe('T034 | D8 AIT journey through the route handlers (FR-009, BR-008, AS-8, BR-005)', () => {
  beforeEach(() => demoRepository().reset())

  it('one session: Silk → 10 → 15 → 13 → 200 pax updates the results every turn', async () => {
    const id = await openSession()

    const silk = await turn(id, 'Silk weaving')
    expect(silk.message.status).toBe(201)
    expect(silk.message.json.extraction.is_complete).toBe(false)
    expect(silk.message.json.tour_preference_profile).toBeNull()

    const ten = await turn(id, '10 pax on 2026-11-20 from Hoàn Kiếm')
    expect(villages(ten.matching)).toHaveLength(5)
    expect(villages(ten.matching)[0]).toBe('Vạn Phúc')

    const fifteen = await turn(id, 'Change to 15 pax')
    expect(villages(fifteen.matching)).toEqual(['Quất Động', 'Chuông'])

    const thirteen = await turn(id, 'Change to 13 pax')
    expect(villages(thirteen.matching)).toHaveLength(4)
    expect(villages(thirteen.matching)).not.toContain('Bát Tràng')

    const twoHundred = await turn(id, 'Change to 200 pax')
    expect(twoHundred.matching?.top_matches).toEqual([])

    // T041 (route level): no recommendation below the 60/100 threshold (BR-020, #30).
    for (const result of [ten, fifteen, thirteen]) {
      for (const match of result.matching!.top_matches) expect(match.match_score).toBeGreaterThanOrEqual(60)
    }

    const fresh = await openSession()
    const freshFifteen = await turn(fresh, 'Silk weaving, 15 pax on 2026-11-20 from Hoàn Kiếm')
    expect(villages(freshFifteen.matching)).toEqual(villages(fifteen.matching))
  })

  it('Request Quote ×2 and Chat ×2 keep their IDs, share the pair Chat and create no Booking (BR-009, BR-010, BR-018, BR-019)', async () => {
    const id = await openSession()
    const bookingsBefore = demoRepository().all('bookings').length
    const quote = (n: number) => call(POST_QUOTE, `/api/ait/sessions/${id}/quote`, 'agency', { experience_id: VAN_PHUC }, { id }).then(r => ({ ...r, n }))
    const chat = (exp: string) => call(POST_CHAT, `/api/ait/sessions/${id}/chat`, 'agency', { experience_id: exp }, { id })

    const first = await quote(1)
    const second = await quote(2)
    expect(first.status).toBe(200)
    expect(first.json.is_new_request).toBe(true)
    expect(second.json.is_new_request).toBe(false)
    expect(second.json.quote_request_id).toBe(first.json.quote_request_id)

    const chatOne = await chat(VAN_PHUC)
    const chatTwo = await chat(VAN_PHUC)
    expect(chatOne.json.chat_session_id).toBe(first.json.chat_session_id)
    expect(chatTwo.json.chat_session_id).toBe(chatOne.json.chat_session_id)

    const otherOne = await chat(CHUONG)
    const otherTwo = await chat(CHUONG)
    expect(otherTwo.json.chat_session_id).toBe(otherOne.json.chat_session_id)
    expect(otherOne.json.chat_session_id).not.toBe(chatOne.json.chat_session_id)

    expect(demoRepository().all('bookings').length).toBe(bookingsBefore)
  })

  it('Guest → 401 and non-Agency → 403 on sessions, messages and matching (BR-001, BR-002)', async () => {
    const id = await openSession()
    for (const [account, status] of [['guest', 401], ['provider', 403], ['ubnd', 403], ['hdt', 403]] as const) {
      expect((await call(POST_SESSIONS, '/api/ait/sessions', account, {})).status).toBe(status)
      expect((await call(POST_MESSAGES, `/api/ait/sessions/${id}/messages`, account, { sender: 'Agency', text: 'Silk' }, { id })).status).toBe(status)
      expect((await call(POST_MATCHING, '/api/ait/matching', account, { session_id: id, tour_preference_profile: { hard_constraints: {} } })).status).toBe(status)
    }
  })

  it('T051 / L1: provider, ubnd and hdt cannot open a Matching Session; none is written (#28)', async () => {
    const before = demoRepository().all('matching_sessions').length
    for (const account of ['provider', 'ubnd', 'hdt']) {
      expect((await call(POST_SESSIONS, '/api/ait/sessions', account, {})).status).toBe(403)
    }
    expect(demoRepository().all('matching_sessions').length).toBe(before)
  })
})

describe('T055 | D11 Quote / Chat authorize before validate (BR-001, BR-002, lesson #15)', () => {
  beforeEach(() => demoRepository().reset())

  it('Guest → 401 even with an empty or invalid body; nothing is written', async () => {
    const id = await openSession()
    const before = commercialRows()
    for (const handler of [POST_QUOTE, POST_CHAT]) {
      for (const body of [{ experience_id: VAN_PHUC }, {}, '{not json']) {
        expect((await call(handler, `/api/ait/sessions/${id}/x`, 'guest', body, { id })).status).toBe(401)
      }
    }
    expect(commercialRows()).toBe(before)
  })

  it('provider, ubnd, hdt → 403; an Agency on another Agency\'s session → 403; nothing is written', async () => {
    const id = await openSession()
    const other = await createMatchingSession({ agencyId: 'other-agency-0000' })
    const before = commercialRows()
    for (const handler of [POST_QUOTE, POST_CHAT]) {
      for (const account of ['provider', 'ubnd', 'hdt']) {
        expect((await call(handler, `/api/ait/sessions/${id}/x`, account, { experience_id: VAN_PHUC }, { id })).status).toBe(403)
      }
      const foreign = await call(handler, `/api/ait/sessions/${other.session_id}/x`, 'agency', { experience_id: VAN_PHUC }, { id: other.session_id })
      expect(foreign.status).toBe(403)
    }
    expect(commercialRows()).toBe(before)
  })

  it('owning Agency without experience_id → 400 and nothing is written', async () => {
    const id = await openSession()
    const before = commercialRows()
    for (const handler of [POST_QUOTE, POST_CHAT]) {
      expect((await call(handler, `/api/ait/sessions/${id}/x`, 'agency', {}, { id })).status).toBe(400)
    }
    expect(commercialRows()).toBe(before)
  })

  it('L4: Guest with an invalid JSON body on messages and matching → 401, not 500', async () => {
    const id = await openSession()
    expect((await call(POST_MESSAGES, `/api/ait/sessions/${id}/messages`, 'guest', '{not json', { id })).status).toBe(401)
    expect((await call(POST_MATCHING, '/api/ait/matching', 'guest', '{not json')).status).toBe(401)
  })
})

describe('Round 3 route-level checks for D6, D5, D4, D2 (#23, #24, #25, #29, #34, #35)', () => {
  beforeEach(() => demoRepository().reset())

  it('T035: no profile until origin and an Experience preference are stated', async () => {
    const noOrigin = await send(await openSession(), 'silk weaving, 10 pax on 2026-11-20')
    expect(noOrigin.json.extraction.is_complete).toBe(false)
    expect(noOrigin.json.tour_preference_profile).toBeNull()
    expect(noOrigin.json.extraction.follow_up_questions.some((q: string) => /start|origin|from/i.test(q))).toBe(true)

    const destinationOnly = await send(await openSession(), 'pottery workshop in Bat Trang, 10 pax on 2026-11-20')
    expect(destinationOnly.json.extraction.is_complete).toBe(false)
    expect(destinationOnly.json.tour_preference_profile).toBeNull()

    const noPreference = await send(await openSession(), '10 pax on 2026-11-20 from Hoàn Kiếm')
    expect(noPreference.json.extraction.is_complete).toBe(false)
    expect(noPreference.json.tour_preference_profile).toBeNull()

    const workshop = await send(await openSession(), 'workshop, 10 pax on 2026-11-20 from Hoàn Kiếm')
    expect(workshop.json.extraction.is_complete).toBe(true)
    expect(workshop.json.tour_preference_profile).not.toBeNull()
  })

  it('T037: the Silk demo keeps Vạn Phúc #1 with craft matching by craft_type', async () => {
    const result = await turn(await openSession(), 'Silk weaving, 10 pax on 2026-11-20 from Hoàn Kiếm')
    expect(result.matching!.top_matches[0].village_name).toBe('Vạn Phúc')
  })

  it('T039: explanations name only evaluated factors; no craft the Agency did not ask for', async () => {
    const result = await turn(await openSession(), 'hands-on workshop, 10 pax on 2026-11-20 from Hoàn Kiếm')
    expect(result.matching!.top_matches.length).toBeGreaterThan(0)
    for (const match of result.matching!.top_matches) {
      expect(match.explanation).not.toMatch(/silk|pottery|ceramic|embroider|conical|bamboo|lụa|gốm/i)
      expect(match.explanation).toMatch(/group of 10/)
      expect(match.explanation).toMatch(/estimated/i)
    }
  })

  it('T043: 20,000 VND budget → Budget suggestion 150000 that then gives a match; 200 pax → capacity named, no Budget', async () => {
    const id = await openSession()
    await turn(id, 'Silk weaving')
    await turn(id, '10 pax on 2026-11-20 from Hoàn Kiếm')
    const tight = await turn(id, 'Change to 10 pax, budget 20,000 VND per person')
    expect(tight.matching!.top_matches).toEqual([])
    expect(budgetSuggestion(tight.matching)?.suggested_value).toBe(150000)

    const relaxed = await turn(id, 'Change budget to 150,000 VND per person')
    expect(villages(relaxed.matching)).toContain('Bát Tràng')

    const large = await turn(await openSession(), 'Silk weaving, 200 pax on 2026-11-20 from Hoàn Kiếm')
    expect(large.matching!.top_matches).toEqual([])
    expect(budgetSuggestion(large.matching)).toBeUndefined()
    expect(large.matching!.relaxation_suggestions.conversation_prompt).toMatch(/16/)
    expect(JSON.stringify(large.matching)).not.toContain('600000')
  })
})
