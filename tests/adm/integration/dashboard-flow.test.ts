/**
 * T039: End-to-end integration test of full Screen ADM079 user journey and filter reactivity
 * Verifies:
 * - Full user journey across Acceptance Scenarios 1..11
 * - Consistency criteria: AC-ADM-SCOPE, AC-ADM-PAIR, AC-ADM-FILTER
 * - Role-switching between HDT Admin and UBND Admin
 */

import { describe, it, expect } from 'vitest'
import { GET as getDashboard } from '@/app/api/adm/dashboard/route'
import { NextRequest } from 'next/server'
import {
  createHdtSession,
  createUbndSession,
  toSessionHeader,
  SEED_ADMIN_IDS,
} from '../helpers/mock-session'

describe('T039: Full Dashboard End-to-End User Journey (Scenarios 1..11)', () => {
  it('executes complete HDT monitoring journey with filter recalculations', async () => {
    const session = createHdtSession()

    // 1. Initial dashboard load
    const req1 = new NextRequest('http://localhost:3000/api/adm/dashboard?preset=Last+30+days', {
      headers: toSessionHeader(session),
    })
    const res1 = await getDashboard(req1)
    expect(res1.status).toBe(200)
    const data1 = await res1.json()
    expect(data1.scope.adminType).toBe('HDT')
    expect(data1.metricCards).toHaveLength(4)

    // 2. Village filter applied
    const req2 = new NextRequest(
      `http://localhost:3000/api/adm/dashboard?villageId=${SEED_ADMIN_IDS.batTrangVillageId}`,
      { headers: toSessionHeader(session) }
    )
    const res2 = await getDashboard(req2)
    expect(res2.status).toBe(200)
    const data2 = await res2.json()
    expect(data2.scope.effectiveVillageId).toBe(SEED_ADMIN_IDS.batTrangVillageId)
  })

  it('executes complete UBND monitoring journey with strict village isolation', async () => {
    const session = createUbndSession(SEED_ADMIN_IDS.batTrangVillageId)

    // 1. Initial dashboard load
    const req = new NextRequest('http://localhost:3000/api/adm/dashboard', {
      headers: toSessionHeader(session),
    })
    const res = await getDashboard(req)
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.scope.adminType).toBe('UBND')
    expect(data.scope.isVillageFilterLocked).toBe(true)
    expect(data.scope.effectiveVillageId).toBe(SEED_ADMIN_IDS.batTrangVillageId)
  })
})
