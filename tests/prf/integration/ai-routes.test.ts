import { describe, it, expect } from 'vitest'
import {
  POST as postAIDescriptionRoute,
} from '@/app/api/prf/ai/description/route'
import {
  providerSession,
  guestSession,
  SEED_IDS,
} from '../helpers/mockSession'

describe('T052 | AI Refinement Route Integration Tests (FR-007)', () => {
  const provider = providerSession(SEED_IDS.provider1Verified, SEED_IDS.provider1VerifiedUserId)

  function makeRequest(session: ReturnType<typeof guestSession>, body: unknown): Request {
    return new Request('http://localhost:3000/api/prf/ai/description', {
      method: 'POST',
      headers: {
        'x-mock-session': JSON.stringify(session),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }

  it('returns 200 with refined description draft on happy path', async () => {
    const req = makeRequest(provider, {
      original_description: 'Xưởng gốm Bát Tràng làm đồ thủ công tinh xảo truyền thống.',
      craft_type: 'Ceramics',
    })
    const res = await postAIDescriptionRoute(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.refined_description_draft).toBeDefined()
    expect(data.original_description).toBeDefined()
  })

  it('returns 400 when missing required description', async () => {
    const req = makeRequest(provider, {
      craft_type: 'Ceramics',
      // missing original_description
    })
    const res = await postAIDescriptionRoute(req)
    expect(res.status).toBe(400)
  })

  it('returns 403 for unauthenticated Guest actor', async () => {
    const req = makeRequest(guestSession(), {
      original_description: 'Mô tả thử nghiệm của khách.',
      craft_type: 'Ceramics',
    })
    const res = await postAIDescriptionRoute(req)
    expect([401, 403]).toContain(res.status)
  })
})
