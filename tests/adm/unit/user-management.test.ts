/**
 * ADM095 User Management Acceptance & Integration Tests
 * Verifies:
 * - F-AUTH-21: View & manage user accounts (list, filter, actions)
 * - F-AUTH-22: Enable / disable status toggle
 * - Scope enforcement:
 *   - HDT: Platform-wide scope (all agencies, providers, admins)
 *   - UBND: Assigned village scope only (strictly local providers in assigned village)
 * - Search by name, email, organization
 * - Filter by role and account status
 * - Security: Rejection of non-admin roles with 401/403
 */

import { describe, it, expect } from 'vitest'
import { listUserAccounts, toggleUserStatus } from '@/lib/adm/user-service'
import { createHdtSession, createUbndSession, SEED_ADMIN_IDS } from '../helpers/mock-session'
import { GET, PATCH } from '@/app/api/adm/users/route'
import { NextRequest } from 'next/server'

describe('ADM095: User Management Service & Scoped Access (F-AUTH-21, F-AUTH-22)', () => {
  it('loads platform-wide user accounts for HDT Admin session (F-AUTH-21)', async () => {
    const session = createHdtSession()
    const result = await listUserAccounts(session)

    expect(result.users.length).toBeGreaterThan(10)
    expect(result.totalCount).toBe(result.users.length)

    // HDT sees all roles: Agency, Local Provider, and Admins
    const roles = new Set(result.users.map(u => u.role))
    expect(roles.has('Tour_Agency')).toBe(true)
    expect(roles.has('Local_Provider')).toBe(true)
    expect(roles.has('ADMIN')).toBe(true)

    // Pending verification accounts are present
    expect(result.pendingUsers.length).toBeGreaterThanOrEqual(1)
  })

  it('restricts user accounts strictly to assigned village for UBND Admin (F-AUTH-21, BR-008, BR-009)', async () => {
    const batTrangVillage = SEED_ADMIN_IDS.batTrangVillageId
    const session = createUbndSession(batTrangVillage)
    const result = await listUserAccounts(session)

    // UBND should ONLY see Local Provider accounts within their assigned village
    for (const u of result.users) {
      expect(u.role).toBe('Local_Provider')
      expect(u.villageId).toBe(batTrangVillage)
    }

    // Must not see Agency accounts or other Admin accounts
    const hasAgencies = result.users.some(u => u.role === 'Tour_Agency')
    const hasAdmins = result.users.some(u => u.role === 'ADMIN')
    expect(hasAgencies).toBe(false)
    expect(hasAdmins).toBe(false)
  })

  it('filters accounts by search query (name, email, organization)', async () => {
    const session = createHdtSession()
    const searchByName = await listUserAccounts(session, { search: 'Kiệt' })
    for (const u of searchByName.users) {
      expect(
        u.name.toLowerCase().includes('kiệt') ||
        u.email.toLowerCase().includes('kiệt') ||
        u.organization.toLowerCase().includes('kiệt')
      ).toBe(true)
    }

    const searchByEmail = await listUserAccounts(session, { search: 'thanhvien11' })
    expect(searchByEmail.users.length).toBeGreaterThanOrEqual(1)
    expect(searchByEmail.users[0].email).toContain('thanhvien11')
  })

  it('filters accounts by role and status', async () => {
    const session = createHdtSession()
    const agencyOnly = await listUserAccounts(session, { role: 'Tour_Agency' })
    for (const u of agencyOnly.users) {
      expect(u.role).toBe('Tour_Agency')
    }

    const disabledOnly = await listUserAccounts(session, { status: 'Disabled' })
    for (const u of disabledOnly.users) {
      expect(u.status).toBe('Disabled')
    }
  })

  it('allows HDT Admin to toggle account status (F-AUTH-22)', async () => {
    const session = createHdtSession()
    const { users } = await listUserAccounts(session)
    const target = users[0]

    // Disable
    const disableRes = await toggleUserStatus(session, target.userId, false)
    expect(disableRes.success).toBe(true)
    expect(disableRes.newStatus).toBe('Disabled')

    // Enable back
    const enableRes = await toggleUserStatus(session, target.userId, true)
    expect(enableRes.success).toBe(true)
    expect(enableRes.newStatus).not.toBe('Disabled')
  })

  it('prevents UBND Admin from modifying accounts outside assigned village (F-AUTH-22, BR-009)', async () => {
    const batTrangVillage = SEED_ADMIN_IDS.batTrangVillageId
    const ubndSession = createUbndSession(batTrangVillage)

    // Find an account outside Bát Tràng (e.g. an agency account or other village provider)
    const hdtSession = createHdtSession()
    const { users } = await listUserAccounts(hdtSession)
    const outsideUser = users.find(u => u.villageId !== batTrangVillage)!

    const toggleRes = await toggleUserStatus(ubndSession, outsideUser.userId, false)
    expect(toggleRes.success).toBe(false)
    expect(toggleRes.error).toContain('outside authorized scope')
  })
})

describe('ADM095: User Management API Authorization (/api/adm/users)', () => {
  it('returns 401 when no session is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/adm/users')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when non-admin session is provided', async () => {
    const nonAdminSession = {
      authenticated: true,
      role: 'TourAgency',
      user: { id: 'u-1', email: 'agency@example.com' },
    }
    const req = new NextRequest('http://localhost:3000/api/adm/users', {
      headers: {
        'x-mock-session': JSON.stringify(nonAdminSession),
      },
    })
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 200 with scoped accounts for valid HDT Admin session', async () => {
    const session = createHdtSession()
    const req = new NextRequest('http://localhost:3000/api/adm/users', {
      headers: {
        'x-mock-session': JSON.stringify(session),
      },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(Array.isArray(data.users)).toBe(true)
    expect(Array.isArray(data.pendingUsers)).toBe(true)
    expect(data.scope.adminType).toBe('HDT')
  })

  it('supports PATCH to toggle user status via API', async () => {
    const session = createHdtSession()
    const req = new NextRequest('http://localhost:3000/api/adm/users', {
      method: 'PATCH',
      headers: {
        'x-mock-session': JSON.stringify(session),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: '1982c065-3ebc-5628-a4ae-413427aeba5a',
        enabled: false,
      }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.newStatus).toBe('Disabled')
  })
})
