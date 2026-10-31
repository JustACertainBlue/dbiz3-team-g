/**
 * T009 — Open/create active chat session & unique active pair reuse (FR-001, BR-001, BR-004, BR-005, AC-IAC-PAIR)
 *
 * CONSTITUTION II: Written BEFORE src/app/api/iac/sessions/route.ts exists.
 * These tests MUST FAIL until T010/T011 are implemented.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { POST as openSessionRoute } from '@/app/api/iac/sessions/route'
import { demoRepository } from '@/lib/demo/json-repository'
import { getSeedAgencies, getSeedProviders } from '@/lib/iac/seed-accessor'

describe('T009 | Chat Sessions API (FR-001, BR-001, BR-004, BR-005, AC-IAC-PAIR)', () => {
  const seedAgencies = getSeedAgencies()
  const seedProviders = getSeedProviders()

  const testAgency = seedAgencies[0]
  const testProvider = seedProviders[0]

  beforeEach(() => {
    demoRepository().reset()
    demoRepository().remove(
      'chat_sessions',
      s => s.agency_id === testAgency.agency_id && s.provider_id === testProvider.provider_id
    )
  })

  function makeOpenSessionRequest(
    body: Record<string, unknown>,
    userId: string,
    role: string
  ): Request {
    return new Request('http://localhost:3000/api/iac/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-user-id': userId,
        'x-mock-role': role,
      },
      body: JSON.stringify(body),
    })
  }

  it('FR-001 / BR-001: creates a new active session between Tour Agency and Local Provider', async () => {
    const req = makeOpenSessionRequest(
      {
        recipient_id: testProvider.provider_id,
        source: 'Explore',
      },
      testAgency.user_id,
      'TourAgency'
    )

    const res = await openSessionRoute(req)
    expect(res.status).toBe(201)

    const data = await res.json()
    expect(data.chat_session_id).toBeTruthy()
    expect(data.chat_status).toBe('Active')
    expect(data.is_new_session).toBe(true)
  })

  it('BR-004 / AC-IAC-PAIR: reuses existing active session for the same Agency-Provider pair', async () => {
    const req1 = makeOpenSessionRequest(
      {
        recipient_id: testProvider.provider_id,
        source: 'Explore',
      },
      testAgency.user_id,
      'TourAgency'
    )
    const res1 = await openSessionRoute(req1)
    const data1 = await res1.json()

    // Second call for same pair with different context
    const req2 = makeOpenSessionRequest(
      {
        recipient_id: testProvider.provider_id,
        source: 'AI Matching',
      },
      testAgency.user_id,
      'TourAgency'
    )
    const res2 = await openSessionRoute(req2)
    expect(res2.status).toBe(200)

    const data2 = await res2.json()
    expect(data2.chat_session_id).toBe(data1.chat_session_id)
    expect(data2.chat_status).toBe('Active')
    expect(data2.is_new_session).toBe(false)
  })

  it('BR-003: rejects unauthenticated requests with 401', async () => {
    const req = new Request('http://localhost:3000/api/iac/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_id: testProvider.provider_id,
        source: 'Explore',
      }),
    })

    const res = await openSessionRoute(req)
    expect(res.status).toBe(401)
  })

  it('BR-001: rejects Guest role from creating chat with 403', async () => {
    const req = makeOpenSessionRequest(
      {
        recipient_id: testProvider.provider_id,
        source: 'Explore',
      },
      'guest-user-id',
      'Guest'
    )

    const res = await openSessionRoute(req)
    expect(res.status).toBe(403)
  })
})

