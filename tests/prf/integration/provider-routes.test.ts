/**
 * T015 – Integration tests: GET /api/prf/provider/:providerId
 * Tests the full HTTP layer for US-3 (View Local Provider Profile).
 *
 * CONSTITUTION II: Written BEFORE src/app/api/prf/provider/[providerId]/route.ts exists.
 * These tests MUST FAIL until T017 (API route implementation) is done.
 *
 * Covers US-3 AC1–AC4 via the HTTP contract in contracts/provider-profile.md.
 *
 * Note: These tests import the Next.js route handler directly and invoke it
 * with a mock Request, following the AIT pattern in tests/integration/.
 * No running server required.
 */
import { describe, it, expect } from 'vitest'

// Route handler imported directly — FAILS until T017 creates the file
import { GET as getProviderRoute, PATCH as patchProviderRoute } from '@/app/api/prf/provider/[providerId]/route'
import { POST as postVerifyRoute } from '@/app/api/prf/provider/[providerId]/verify/route'
import {
  guestSession,
  agencyOwnerSession,
  providerSession,
  ubndSession,
  hdtSession,
  SEED_IDS,
} from '../helpers/mockSession'

const VERIFIED_PROVIDER_ID = SEED_IDS.provider1Verified  // 50f2c8fc — Verified

/** Build a mock NextRequest-like object for route handler testing */
function makeRequest(
  providerId: string,
  session: ReturnType<typeof guestSession>,
): Request {
  const url = `http://localhost:3000/api/prf/provider/${providerId}`
  return new Request(url, {
    method: 'GET',
    headers: {
      'x-mock-session': JSON.stringify(session),
    },
  })
}

describe('T015 | GET /api/prf/provider/:id – US-3 integration', () => {

  // ── AC1: Tour Agency – permitted collaboration detail ───────────────────

  describe('AC1: Tour Agency receives full permitted Provider detail', () => {
    it('returns 200 with provider_name and craft_type', async () => {
      const req = makeRequest(VERIFIED_PROVIDER_ID, agencyOwnerSession())
      const res = await getProviderRoute(req, { params: { providerId: VERIFIED_PROVIDER_ID } })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.provider_name).toBeDefined()
      expect(body.craft_type).toBeDefined()
    })

    it('includes pricing in the response for Tour Agency', async () => {
      const req = makeRequest(VERIFIED_PROVIDER_ID, agencyOwnerSession())
      const res = await getProviderRoute(req, { params: { providerId: VERIFIED_PROVIDER_ID } })
      const body = await res.json()
      expect(body.pricing).toBeDefined()
    })
  })

  // ── AC4: Guest – public/basic information only ──────────────────────────

  describe('AC4: Guest receives only public/basic information', () => {
    it('returns 200 with provider_name for Guest', async () => {
      const req = makeRequest(VERIFIED_PROVIDER_ID, guestSession())
      const res = await getProviderRoute(req, { params: { providerId: VERIFIED_PROVIDER_ID } })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.provider_name).toBeDefined()
    })

    it('does NOT include pricing in Guest response', async () => {
      const req = makeRequest(VERIFIED_PROVIDER_ID, guestSession())
      const res = await getProviderRoute(req, { params: { providerId: VERIFIED_PROVIDER_ID } })
      const body = await res.json()
      expect(body.pricing).toBeUndefined()
    })

    it('does NOT include contact in Guest response', async () => {
      const req = makeRequest(VERIFIED_PROVIDER_ID, guestSession())
      const res = await getProviderRoute(req, { params: { providerId: VERIFIED_PROVIDER_ID } })
      const body = await res.json()
      expect(body.contact).toBeUndefined()
    })

    it('does NOT include verification_status in Guest response', async () => {
      const req = makeRequest(VERIFIED_PROVIDER_ID, guestSession())
      const res = await getProviderRoute(req, { params: { providerId: VERIFIED_PROVIDER_ID } })
      const body = await res.json()
      expect(body.verification_status).toBeUndefined()
    })
  })

  // ── HDT – quality_metrics ───────────────────────────────────────────────

  describe('HDT actor receives quality_metrics', () => {
    it('includes quality_metrics for HDT actor', async () => {
      const req = makeRequest(VERIFIED_PROVIDER_ID, hdtSession())
      const res = await getProviderRoute(req, { params: { providerId: VERIFIED_PROVIDER_ID } })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.quality_metrics).toBeDefined()
    })
  })

  // ── 404 for non-existent provider ──────────────────────────────────────

  describe('Provider not found', () => {
    it('returns 404 for an unknown provider_id', async () => {
      const req = makeRequest('00000000-0000-0000-0000-000000000000', guestSession())
      const res = await getProviderRoute(req, { params: { providerId: '00000000-0000-0000-0000-000000000000' } })
      expect(res.status).toBe(404)
    })
  })

  // ── Wrong method returns 405 ─────────────────────────────────────────────
  describe('Wrong method returns 405', () => {
    it('returns 405 for a DELETE request to this route', async () => {
      const req = new Request(
        `http://localhost:3000/api/prf/provider/${VERIFIED_PROVIDER_ID}`,
        { method: 'DELETE', headers: { 'x-mock-session': JSON.stringify(guestSession()) } },
      )
      const res = await getProviderRoute(req, { params: { providerId: VERIFIED_PROVIDER_ID } })
      expect([405, 404]).toContain(res.status)
    })
  })
})

// ─── T020: PATCH /api/prf/provider/:id – US-4 integration ─────────────────────

describe('T020 | PATCH /api/prf/provider/:id – US-4 integration', () => {
  function makePatchRequest(
    providerId: string,
    session: ReturnType<typeof guestSession>,
    body: unknown,
  ): Request {
    const url = `http://localhost:3000/api/prf/provider/${providerId}`
    return new Request(url, {
      method: 'PATCH',
      headers: {
        'x-mock-session': JSON.stringify(session),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }

  it('returns 403 when updating another provider profile (BR-002)', async () => {
    const anotherProvider = providerSession(SEED_IDS.providerDraft, SEED_IDS.providerDraftUserId)
    const req = makePatchRequest(VERIFIED_PROVIDER_ID, anotherProvider, {
      general_description: 'Unauthorized update',
    })
    const res = await patchProviderRoute(req, { params: { providerId: VERIFIED_PROVIDER_ID } })
    expect(res.status).toBe(403)
  })

  it('returns 200 and updates provider when owner sends valid payload', async () => {
    const owner = providerSession(VERIFIED_PROVIDER_ID, SEED_IDS.provider1VerifiedUserId)
    const req = makePatchRequest(VERIFIED_PROVIDER_ID, owner, {
      general_description: 'Mô tả làng nghề được cập nhật qua API.',
    })
    const res = await patchProviderRoute(req, { params: { providerId: VERIFIED_PROVIDER_ID } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('returns 400 when payload fails Zod validation', async () => {
    const owner = providerSession(VERIFIED_PROVIDER_ID, SEED_IDS.provider1VerifiedUserId)
    const req = makePatchRequest(VERIFIED_PROVIDER_ID, owner, {
      business_email: 'not-an-email', // invalid email
    })
    const res = await patchProviderRoute(req, { params: { providerId: VERIFIED_PROVIDER_ID } })
    expect(res.status).toBe(400)
  })
})

// ─── T036: POST /api/prf/provider/:id/verify – US-6 integration ───────────────

describe('T036 | POST /api/prf/provider/:id/verify – US-6 integration', () => {
  const assignedUbnd = ubndSession(SEED_IDS.village1)
  const crossVillageUbnd = ubndSession(SEED_IDS.village2)

  function makeVerifyRequest(
    providerId: string,
    session: ReturnType<typeof guestSession>,
    body: unknown,
  ): Request {
    const url = `http://localhost:3000/api/prf/provider/${providerId}/verify`
    return new Request(url, {
      method: 'POST',
      headers: {
        'x-mock-session': JSON.stringify(session),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }

  it('returns 403 on cross-village verification attempt (BR-005)', async () => {
    const req = makeVerifyRequest(VERIFIED_PROVIDER_ID, crossVillageUbnd, { decision: 'Approve' })
    const res = await postVerifyRoute(req, { params: { providerId: VERIFIED_PROVIDER_ID } })
    expect(res.status).toBe(403)
  })

  it('returns 200 and sets status to Verified on Approve', async () => {
    const req = makeVerifyRequest(VERIFIED_PROVIDER_ID, assignedUbnd, { decision: 'Approve' })
    const res = await postVerifyRoute(req, { params: { providerId: VERIFIED_PROVIDER_ID } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.verification_status).toBe('Verified')
  })

  it('returns 200 and sets status to Revision Required with comments', async () => {
    const req = makeVerifyRequest(VERIFIED_PROVIDER_ID, assignedUbnd, {
      decision: 'Request Revision',
      revision_comments: 'Yêu cầu cập nhật chứng chỉ nghệ nhân.',
    })
    const res = await postVerifyRoute(req, { params: { providerId: VERIFIED_PROVIDER_ID } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.verification_status).toBe('Revision Required')
  })

  it('returns 400 when Request Revision is sent without revision_comments', async () => {
    const req = makeVerifyRequest(VERIFIED_PROVIDER_ID, assignedUbnd, {
      decision: 'Request Revision',
      revision_comments: '',
    })
    const res = await postVerifyRoute(req, { params: { providerId: VERIFIED_PROVIDER_ID } })
    expect(res.status).toBe(400)
  })
})


