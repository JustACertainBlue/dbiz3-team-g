import { describe, it, expect } from 'vitest'
import {
  GET as getAgencyRoute,
  PATCH as patchAgencyRoute,
} from '@/app/api/prf/agency/[agencyId]/route'
import {
  agencyOwnerSession,
  guestSession,
  providerSession,
  hdtSession,
  SEED_IDS,
} from '../helpers/mockSession'

const AGENCY_ID = SEED_IDS.agency1
const OTHER_AGENCY_ID = '99999999-9999-9999-9999-999999999999'

describe('T041 | Agency Routes Integration Tests (US-1)', () => {
  const owner = agencyOwnerSession(AGENCY_ID)
  const anotherAgency = agencyOwnerSession(OTHER_AGENCY_ID)

  function makeRequest(
    method: string,
    url: string,
    session: ReturnType<typeof guestSession>,
    body?: unknown,
  ): Request {
    return new Request(url, {
      method,
      headers: {
        'x-mock-session': JSON.stringify(session),
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  // ── GET /api/prf/agency/:agencyId ──────────────────────────────────────────
  describe('GET /api/prf/agency/:agencyId', () => {
    it('returns 200 with agency profile for Guest (filtered)', async () => {
      const req = makeRequest('GET', `http://localhost:3000/api/prf/agency/${AGENCY_ID}`, guestSession())
      const res = await getAgencyRoute(req, { params: { agencyId: AGENCY_ID } })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.agency_name).toBeDefined()
      expect(data.tax_id).toBeUndefined()
    })

    it('returns 200 with full fields for owner', async () => {
      const req = makeRequest('GET', `http://localhost:3000/api/prf/agency/${AGENCY_ID}`, owner)
      const res = await getAgencyRoute(req, { params: { agencyId: AGENCY_ID } })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.tax_id).toBeDefined()
    })

    it('returns 200 with full fields for HDT admin (US-2 AC2)', async () => {
      const req = makeRequest('GET', `http://localhost:3000/api/prf/agency/${AGENCY_ID}`, hdtSession())
      const res = await getAgencyRoute(req, { params: { agencyId: AGENCY_ID } })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.tax_id).toBeDefined()
    })

    it('returns 200 with contact info for Local Provider (US-2 AC3)', async () => {
      const req = makeRequest('GET', `http://localhost:3000/api/prf/agency/${AGENCY_ID}`, providerSession())
      const res = await getAgencyRoute(req, { params: { agencyId: AGENCY_ID } })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.contact).toBeDefined()
      expect(data.tax_id).toBeUndefined()
    })
  })

  // ── PATCH /api/prf/agency/:agencyId ────────────────────────────────────────
  describe('PATCH /api/prf/agency/:agencyId', () => {
    it('returns 403 when updating another agency profile (BR-001)', async () => {
      const req = makeRequest(
        'PATCH',
        `http://localhost:3000/api/prf/agency/${AGENCY_ID}`,
        anotherAgency,
        { description: 'Unauthorized' },
      )
      const res = await patchAgencyRoute(req, { params: { agencyId: AGENCY_ID } })
      expect(res.status).toBe(403)
    })

    it('returns 200 on owner update', async () => {
      const req = makeRequest(
        'PATCH',
        `http://localhost:3000/api/prf/agency/${AGENCY_ID}`,
        owner,
        { team_size: 25 },
      )
      const res = await patchAgencyRoute(req, { params: { agencyId: AGENCY_ID } })
      expect(res.status).toBe(200)
    })
  })
})
