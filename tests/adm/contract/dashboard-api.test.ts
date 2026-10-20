/**
 * T024: Contract test for GET /api/adm/dashboard
 * Verifies contracts/admin-dashboard-api.md:
 * - 200 OK schema with scope, period, metricCards, agencyMetrics, providerMetrics, bookingMetrics, collaborationMetrics
 * - 401 Unauthorized when unauthenticated
 * - 403 Forbidden when non-admin
 * - AC-ADM-SCOPE server enforcement
 */

import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/adm/dashboard/route'
import { NextRequest } from 'next/server'
import {
  createHdtSession,
  createUbndSession,
  createUnauthorizedSession,
  toSessionHeader,
  SEED_ADMIN_IDS,
} from '../helpers/mock-session'

describe('T024: Contract Test - GET /api/adm/dashboard', () => {
  it('returns 200 OK with full metrics payload for HDT Admin', async () => {
    const session = createHdtSession()
    const req = new NextRequest('http://localhost:3000/api/adm/dashboard?preset=Last+30+days', {
      headers: toSessionHeader(session),
    })

    const res = await GET(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.scope).toBeDefined()
    expect(data.scope.role).toBe('ADMIN')
    expect(data.scope.adminType).toBe('HDT')
    expect(data.scope.isVillageFilterLocked).toBe(false)

    expect(data.period).toBeDefined()
    expect(data.period.preset).toBe('Last 30 days')
    expect(data.period.granularity).toBe('Daily')

    expect(Array.isArray(data.metricCards)).toBe(true)
    expect(data.metricCards).toHaveLength(4)

    expect(data.agencyMetrics).toBeDefined()
    expect(data.providerMetrics).toBeDefined()
    expect(data.bookingMetrics).toBeDefined()
    expect(data.collaborationMetrics).toBeDefined()
  })

  it('returns 200 OK with locked scope for UBND Admin (BR-002, BR-003, AC-ADM-SCOPE)', async () => {
    const session = createUbndSession(SEED_ADMIN_IDS.batTrangVillageId)
    // Attempting query parameter tampering with Vạn Phúc
    const req = new NextRequest(
      `http://localhost:3000/api/adm/dashboard?villageId=${SEED_ADMIN_IDS.vanPhucVillageId}`,
      { headers: toSessionHeader(session) }
    )

    const res = await GET(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.scope.adminType).toBe('UBND')
    expect(data.scope.isVillageFilterLocked).toBe(true)
    expect(data.scope.effectiveVillageId).toBe(SEED_ADMIN_IDS.batTrangVillageId)
  })

  it('returns 401 Unauthorized when session header is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/adm/dashboard')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 Forbidden for non-admin actor', async () => {
    const session = createUnauthorizedSession()
    const req = new NextRequest('http://localhost:3000/api/adm/dashboard', {
      headers: toSessionHeader(session),
    })

    const res = await GET(req)
    expect(res.status).toBe(403)
  })
})
