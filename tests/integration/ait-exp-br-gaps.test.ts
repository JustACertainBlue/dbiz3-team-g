/**
 * G3 audit (linh/g3-audit) – AIT and EXP rule parts without a test on the code the app runs (audit 05/11).
 * Supplementary tests on existing code, each proven by a mutation check (build-log Entry 43).
 *
 * AIT
 * - BR-003: Experiences of a Draft or Revision Required Provider are never candidates.
 * - BR-014: Agency A's saved preferences do not change Agency B's Explore order.
 * - BR-016: opening AI Matching as an Agency creates one matching session (201).
 * - BR-018: the Quote Request is reused even after a Booking for the pair was cancelled.
 * - BR-019: a Closed Chat is not reopened; a new one is created.
 * EXP
 * - BR-002 / BR-009: on the live handoff, Guest and non-Agency actors are refused (403) and nothing is written.
 * - BR-010: Chat creates no Booking either.
 * - BR-005: a strong action (Quote/Chat) weighs more than an explicit one.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoSessionContextFor } from '@/lib/auth/session'
import { demoRepository } from '@/lib/demo/json-repository'
import { createChatHandoff, createQuoteHandoff } from '@/lib/demo/commercial-handoff-service'
import { retrieveCandidates } from '@/lib/matching/candidate-repo'
import { rerankExploreForAgency, saveAgencyPreferenceProfile } from '@/lib/preferences/preference-service'
import { updatePreferenceWeights } from '@/lib/explore/learning'
import * as sessionsRoute from '@/app/api/ait/sessions/route'

const EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69' // Bát Tràng
const TRANG_AN = DEMO_IDENTITIES.agency.agencyId!
const AGENCY = demoSessionContextFor('agency')
const WRITE_TABLES = ['quote_requests', 'chat_sessions', 'chat_messages', 'bookings']
const snapshot = () => JSON.stringify(WRITE_TABLES.map(table => demoRepository().all(table)))

describe('G3 audit | AIT BR-003 only Verified Providers are candidates', () => {
  it('excludes the Draft (c8e989d4) and Revision Required (84dfc919) Providers\' Experiences', async () => {
    const ids = (await retrieveCandidates()).map(candidate => candidate.experience_id)
    expect(ids).toContain(EXPERIENCE)
    expect(ids.some(id => id.startsWith('67a2cbab'))).toBe(false)
    expect(ids.some(id => id.startsWith('8e485337'))).toBe(false)
  })
})

describe('G3 audit | AIT BR-014 personalization stays with its Agency', () => {
  it('Agency B keeps the global order after Agency A saved a Silk preference', async () => {
    const catalog = [
      { experience_id: 'exp-bat-trang', village_name: 'Bat Trang', category: 'Ceramic Workshop', global_rank: 1 },
      { experience_id: 'exp-van-phuc', village_name: 'Van Phuc', category: 'Silk Weaving', global_rank: 2 },
      { experience_id: 'exp-chuong', village_name: 'Chuong', category: 'Conical Hat', global_rank: 3 },
    ]
    await saveAgencyPreferenceProfile({ agencyId: 'g3-agency-a', sessionId: 's-a', tourPreferenceProfile: { matching_attributes: ['Silk Weaving'], preference_weights: { 'Silk Weaving': 1 } } as never })
    const forA = await rerankExploreForAgency('g3-agency-a', catalog)
    const forB = await rerankExploreForAgency('g3-agency-b', catalog)
    expect(forB.map(item => item.experience_id)).toEqual(['exp-bat-trang', 'exp-van-phuc', 'exp-chuong'])
    expect(forA.map(item => item.experience_id)).not.toEqual(forB.map(item => item.experience_id))
  })
})

describe('G3 audit | AIT BR-016 session on opening AI Matching', () => {
  beforeEach(() => demoRepository().reset())

  it('POST /api/ait/sessions as an Agency answers 201 and stores one session', async () => {
    const before = demoRepository().all('matching_sessions').length
    const response = await sessionsRoute.POST(new Request('http://localhost:3000/api/ait/sessions', {
      method: 'POST', headers: { cookie: 'hab_demo_account=agency', 'content-type': 'application/json' }, body: '{}',
    }) as never)
    expect(response.status).toBe(201)
    expect(demoRepository().all('matching_sessions')).toHaveLength(before + 1)
  })
})

describe('G3 audit | AIT BR-018 / BR-019 Quote reuse and Closed Chat', () => {
  beforeEach(() => demoRepository().reset())

  it('reuses the Quote Request after a Booking for the pair was cancelled', async () => {
    const first = await createQuoteHandoff(AGENCY, EXPERIENCE)
    demoRepository().update('bookings', row => row.agency_id === TRANG_AN, { status: 'Cancelled' })
    demoRepository().insert('bookings', { booking_id: 'g3-cancelled', agency_id: TRANG_AN, provider_id: '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374', experience_id: EXPERIENCE, status: 'Cancelled' })
    const again = await createQuoteHandoff(AGENCY, EXPERIENCE)
    expect(again.quote_request_id).toBe(first.quote_request_id)
    expect(again.is_new_request).toBe(false)
  })

  it('does not reopen a Closed Chat; a new Chat is opened and the old one stays Closed', async () => {
    const first = await createChatHandoff(AGENCY, EXPERIENCE)
    demoRepository().update('chat_sessions', row => row.chat_session_id === first.chat_session_id, { status: 'Closed' })
    const second = await createChatHandoff(AGENCY, EXPERIENCE)
    expect(second.chat_session_id).not.toBe(first.chat_session_id)
    expect(demoRepository().find('chat_sessions', row => row.chat_session_id === first.chat_session_id)?.status).toBe('Closed')
  })
})

describe('G3 audit | EXP BR-002 / BR-009 / BR-010 on the live handoff', () => {
  beforeEach(() => demoRepository().reset())

  for (const account of ['guest', 'provider', 'ubnd', 'hdt'] as const) {
    it(`${account}: Quote and Chat are refused with 403 and nothing is written`, async () => {
      const before = snapshot()
      await expect(createQuoteHandoff(demoSessionContextFor(account), EXPERIENCE)).rejects.toThrow(expect.objectContaining({ statusCode: 403 }))
      await expect(createChatHandoff(demoSessionContextFor(account), EXPERIENCE)).rejects.toThrow(expect.objectContaining({ statusCode: 403 }))
      expect(snapshot()).toBe(before)
    })
  }

  it('Chat creates no Booking (BR-010)', async () => {
    const bookings = demoRepository().all('bookings').length
    await createChatHandoff(AGENCY, EXPERIENCE)
    expect(demoRepository().all('bookings')).toHaveLength(bookings)
  })
})

describe('G3 audit | EXP BR-005 strong actions weigh more', () => {
  it('a strong signal adds 0.2, an explicit one 0.1', () => {
    expect(updatePreferenceWeights({}, [{ key: 'category:Ceramics', kind: 'strong' }] as never)['category:Ceramics']).toBeCloseTo(0.2)
    expect(updatePreferenceWeights({}, [{ key: 'category:Ceramics', kind: 'explicit' }] as never)['category:Ceramics']).toBeCloseTo(0.1)
  })
})
