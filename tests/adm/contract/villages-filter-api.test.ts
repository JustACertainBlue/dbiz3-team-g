/**
 * T025: Contract test for GET /api/adm/villages and GET /api/adm/filter-options
 * Verifies contracts/admin-dashboard-api.md:
 * - GET /api/adm/villages response schema (isLocked, assignedVillageId, villages)
 * - GET /api/adm/filter-options response schema (type, options)
 * - Administrative scoping for village options (BR-002, BR-003, BR-008, BR-009)
 */

import { describe, it, expect } from 'vitest'
import { GET as getVillages } from '@/app/api/adm/villages/route'
import { GET as getFilterOptions } from '@/app/api/adm/filter-options/route'
import { NextRequest } from 'next/server'
import {
  createHdtSession,
  createUbndSession,
  toSessionHeader,
  SEED_ADMIN_IDS,
} from '../helpers/mock-session'

describe('T025: Contract Test - Village & Filter Autocomplete Endpoints', () => {
  describe('GET /api/adm/villages', () => {
    it('returns unlocked list of all craft villages for HDT Admin', async () => {
      const session = createHdtSession()
      const req = new NextRequest('http://localhost:3000/api/adm/villages', {
        headers: toSessionHeader(session),
      })

      const res = await getVillages(req)
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.isLocked).toBe(false)
      expect(data.assignedVillageId).toBeNull()
      expect(Array.isArray(data.villages)).toBe(true)
      expect(data.villages.length).toBeGreaterThan(1)
    })

    it('returns locked single assigned village for UBND Admin (BR-002, BR-003)', async () => {
      const session = createUbndSession(SEED_ADMIN_IDS.batTrangVillageId)
      const req = new NextRequest('http://localhost:3000/api/adm/villages', {
        headers: toSessionHeader(session),
      })

      const res = await getVillages(req)
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.isLocked).toBe(true)
      expect(data.assignedVillageId).toBe(SEED_ADMIN_IDS.batTrangVillageId)
      expect(data.villages).toHaveLength(1)
      expect(data.villages[0].villageId).toBe(SEED_ADMIN_IDS.batTrangVillageId)
    })
  })

  describe('GET /api/adm/filter-options', () => {
    it('returns agency autocomplete options for HDT Admin', async () => {
      const session = createHdtSession()
      const req = new NextRequest('http://localhost:3000/api/adm/filter-options?type=agency', {
        headers: toSessionHeader(session),
      })

      const res = await getFilterOptions(req)
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.type).toBe('agency')
      expect(Array.isArray(data.options)).toBe(true)
    })

    it('returns provider autocomplete options scoped to assigned village for UBND Admin (BR-009)', async () => {
      const session = createUbndSession(SEED_ADMIN_IDS.batTrangVillageId)
      const req = new NextRequest('http://localhost:3000/api/adm/filter-options?type=provider', {
        headers: toSessionHeader(session),
      })

      const res = await getFilterOptions(req)
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.type).toBe('provider')
      expect(Array.isArray(data.options)).toBe(true)
      for (const opt of data.options) {
        expect(opt.villageId).toBe(SEED_ADMIN_IDS.batTrangVillageId)
      }
    })
  })
})
