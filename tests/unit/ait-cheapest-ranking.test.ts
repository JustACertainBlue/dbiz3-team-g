import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { rankCandidates } from '@/lib/matching/scoring-engine'
import { buildTourPreferenceProfile } from '@/lib/ai/extractor'
import * as sessionsRoute from '@/app/api/ait/sessions/route'
import * as messagesRoute from '@/app/api/ait/sessions/[id]/messages/route'
import { installFakeModel, restoreRealClients } from '../helpers/ait-fake-clients'

const candidates = [
  { experience_id: 'fit', craft_type: 'Ceramics', price_per_person: 400000, distance_km: 15 },
  { experience_id: 'cheap', craft_type: 'Ceramics', price_per_person: 150000, distance_km: 15 },
  { experience_id: 'mid', craft_type: 'Ceramics', price_per_person: 250000, distance_km: 15 },
]
const base = { matching_attributes: [{ type: 'craft_preference', value: 'pottery' }] }

describe('"rẻ nhất" ranks by price', () => {
  it('orders by price when the Agency asked for the cheapest', async () => {
    const ranked = await rankCandidates(candidates, { ...base, ranking_preferences: { cheapest: true } })
    expect(ranked.map(c => c.experience_id)).toEqual(['cheap', 'mid', 'fit'])
    expect(ranked.map(c => c.rank)).toEqual([1, 2, 3])
  })

  it('keeps the fit scores unchanged: only the order moves', async () => {
    const plain = await rankCandidates(candidates, base)
    const cheapest = await rankCandidates(candidates, { ...base, ranking_preferences: { cheapest: true } })
    for (const item of cheapest) {
      expect(item.match_score).toBe(plain.find(c => c.experience_id === item.experience_id)!.match_score)
    }
  })

  it('without the preference the order is the one by score', async () => {
    const withFlag = await rankCandidates(candidates, { ...base, ranking_preferences: { cheapest: false } })
    const plain = await rankCandidates(candidates, base)
    expect(withFlag.map(c => c.experience_id)).toEqual(plain.map(c => c.experience_id))
  })

  it('the profile carries the preference only when it is set', async () => {
    const on = await buildTourPreferenceProfile({ group_size: 10 }, undefined, { cheapest: true })
    expect((on as any).ranking_preferences).toEqual({ cheapest: true })
    const off = await buildTourPreferenceProfile({ group_size: 10 })
    expect('ranking_preferences' in off).toBe(false)
  })
})

type Handler = (request: never, context?: never) => Promise<Response>
describe('typed in the conversation', () => {
  beforeEach(() => demoRepository().reset())
  afterEach(() => restoreRealClients())

  it('"giá rẻ nhất" reaches the matching profile', async () => {
    const call = async (handler: Handler, path: string, body: unknown, params?: Record<string, string>) => {
      const request = new Request(`http://localhost:3000${path}`, { method: 'POST', headers: { cookie: 'hab_demo_account=agency', 'content-type': 'application/json' }, body: JSON.stringify(body) })
      return (await handler(request as never, (params ? { params } : undefined) as never)).json() as Promise<Record<string, any>>
    }
    const { session_id: id } = await call((sessionsRoute as unknown as { POST: Handler }).POST, '/api/ait/sessions', {})
    installFakeModel({ extracted_context: { group_size: 10, craft_preference: 'pottery', target_date: '2030-12-10' } })
    const result = await call((messagesRoute as unknown as { POST: Handler }).POST, `/api/ait/sessions/${id}/messages`, { sender: 'Agency', text: 'Đoàn 10 khách làm gốm giá rẻ nhất ngày 10/12/2030 ngân sách 500k' }, { id })
    expect(result.extraction.is_complete).toBe(true)
    expect(result.tour_preference_profile.ranking_preferences).toEqual({ cheapest: true })
  })
})
