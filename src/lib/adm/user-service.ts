/**
 * Admin User Management Service (ADM095 / F-AUTH-21 / F-AUTH-22)
 *
 * Implements:
 * - Scoped account loading:
 *   - HDT: Platform-wide scope (all agencies, providers, regional administrators, and HDT users)
 *   - UBND: Assigned village scope only (strictly local providers in assigned village)
 * - Filtering by search text (name, email, organization), role, and status
 * - Account enable/disable status toggle within authorized scope
 * - Pending verification list
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { resolveAdminScope, SessionLike } from './scope-guard'
import {
  UserAccountItem,
  PendingVerificationAccount,
  UserManagementResponse,
  CreateAccountPayload,
  CreateAccountResult,
} from './types'

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n')
  if (lines.length < 2) return []

  const headerLine = lines[0]
  const headers = headerLine.split(',').map(h => h.trim())

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = line.split(',')
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] !== undefined ? values[j].trim() : ''
    }
    rows.push(row)
  }

  return rows
}

// In-memory status overrides for runtime toggle actions
const runtimeStatusOverrides = new Map<string, 'Active' | 'Approved' | 'Disabled'>()

// In-memory created user accounts (ADM117 / F-AUTH-19 / F-AUTH-20)
const runtimeCreatedAccounts: UserAccountItem[] = []

export function _resetRuntimeAccounts(): void {
  runtimeCreatedAccounts.length = 0
  runtimeStatusOverrides.clear()
}

export async function listUserAccounts(
  session: SessionLike,
  options: {
    search?: string
    role?: string
    status?: string
  } = {}
): Promise<UserManagementResponse> {
  const scope = resolveAdminScope(session)

  const seedDir = path.join(process.cwd(), 'data', 'seed')
  const usersPath = path.join(seedDir, 'user_accounts.csv')
  const agencyPath = path.join(seedDir, 'agency_profiles.csv')
  const provPath = path.join(seedDir, 'provider_profiles.csv')
  const versionsPath = path.join(seedDir, 'provider_profile_versions.csv')
  const villagesPath = path.join(seedDir, 'villages.csv')
  const ubndPath = path.join(seedDir, 'ubnd_village_assignments.csv')

  const userRows = fs.existsSync(usersPath) ? parseCsv(fs.readFileSync(usersPath, 'utf-8')) : []
  const agencyRows = fs.existsSync(agencyPath) ? parseCsv(fs.readFileSync(agencyPath, 'utf-8')) : []
  const provRows = fs.existsSync(provPath) ? parseCsv(fs.readFileSync(provPath, 'utf-8')) : []
  const versionRows = fs.existsSync(versionsPath) ? parseCsv(fs.readFileSync(versionsPath, 'utf-8')) : []
  const villageRows = fs.existsSync(villagesPath) ? parseCsv(fs.readFileSync(villagesPath, 'utf-8')) : []
  const ubndRows = fs.existsSync(ubndPath) ? parseCsv(fs.readFileSync(ubndPath, 'utf-8')) : []

  // Build lookups
  const agencyMap = new Map<string, string>()
  for (const a of agencyRows) {
    agencyMap.set(a.user_id, a.company_name)
  }

  const provIdByUser = new Map<string, string>()
  const provVillageByUser = new Map<string, string>()
  for (const p of provRows) {
    provIdByUser.set(p.user_id, p.provider_id)
    provVillageByUser.set(p.user_id, p.village_id)
  }

  const provBusinessMap = new Map<string, string>()
  for (const v of versionRows) {
    if (!provBusinessMap.has(v.provider_id) || v.version_status === 'Verified') {
      provBusinessMap.set(v.provider_id, v.business_name)
    }
  }

  const villageMap = new Map<string, string>()
  for (const v of villageRows) {
    villageMap.set(v.village_id, v.name)
  }

  const ubndVillageMap = new Map<string, string>()
  for (const u of ubndRows) {
    ubndVillageMap.set(u.ubnd_user_id, u.village_id)
  }

  // Resolve all user accounts
  const seedAccounts: UserAccountItem[] = userRows.map(u => {
    const uid = u.user_id
    const role = u.role_code as UserAccountItem['role']
    const adminType = u.admin_type ? (u.admin_type as 'HDT' | 'UBND') : undefined

    let org = 'Artisan Bridge Partner'
    let villageId: string | null = null

    if (role === 'Tour_Agency') {
      org = agencyMap.get(uid) || 'Tour Agency Partner'
    } else if (role === 'Local_Provider') {
      const pid = provIdByUser.get(uid)
      org = (pid && provBusinessMap.get(pid)) || 'Local Artisan Workshop'
      villageId = provVillageByUser.get(uid) || null
    } else if (role === 'ADMIN') {
      if (adminType === 'HDT') {
        org = 'Hanoi Department of Tourism'
      } else if (adminType === 'UBND') {
        villageId = ubndVillageMap.get(uid) || null
        const vName = villageId ? villageMap.get(villageId) : null
        org = vName ? `UBND - ${vName}` : 'UBND Phường/Xã'
      }
    }

    const currentStatus = (runtimeStatusOverrides.get(uid) || u.account_status) as UserAccountItem['status']
    const enabled = currentStatus === 'Active' || currentStatus === 'Approved'

    const lastLoginFormatted = u.last_login ? u.last_login.split('T')[0] : null
    const createdFormatted = u.created_at ? u.created_at.split('T')[0] : '2026-09-01'

    return {
      userId: uid,
      name: u.full_name || 'User Account',
      email: u.email,
      role,
      adminType,
      organization: org,
      status: currentStatus,
      lastLogin: lastLoginFormatted,
      createdDate: createdFormatted,
      villageId,
      villageName: villageId ? villageMap.get(villageId) || null : null,
      phone: u.phone,
      title: u.title,
      enabled,
    }
  })

  // Combine runtime created accounts with seed accounts
  const runtimeMapped = runtimeCreatedAccounts.map(u => {
    const currentStatus = (runtimeStatusOverrides.get(u.userId) || u.status) as UserAccountItem['status']
    return {
      ...u,
      status: currentStatus,
      enabled: currentStatus === 'Active' || currentStatus === 'Approved',
    }
  })
  const allAccounts: UserAccountItem[] = [...runtimeMapped, ...seedAccounts]

  // Enforce Scope (F-AUTH-21):
  // HDT: Platform-wide (all accounts)
  // UBND: ONLY Local Provider accounts within assigned village
  let scopedAccounts = allAccounts
  if (scope.effectiveVillageId) {
    scopedAccounts = allAccounts.filter(
      u => u.role === 'Local_Provider' && u.villageId === scope.effectiveVillageId
    )
  }

  // Apply filters
  let filtered = scopedAccounts

  if (options.search && options.search.trim()) {
    const q = options.search.toLowerCase().trim()
    filtered = filtered.filter(
      u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.organization.toLowerCase().includes(q)
    )
  }

  if (options.role && options.role !== 'ALL' && options.role !== 'All') {
    filtered = filtered.filter(u => u.role.toLowerCase() === options.role?.toLowerCase())
  }

  if (options.status && options.status !== 'ALL' && options.status !== 'All') {
    filtered = filtered.filter(u => u.status.toLowerCase() === options.status?.toLowerCase())
  }

  // Pending verification accounts based on canonical seed data
  // Only accounts with Pending Verification or Pending Approval
  const pendingAccounts: PendingVerificationAccount[] = [
    {
      id: 'prov-pending-1',
      name: 'Nguyen Thi Lan',
      email: 'lan.nguyen@battrang.vn',
      role: 'PROVIDER',
      organization: 'Bat Trang Pottery Cooperative',
      submissionDate: '2026-09-18',
      villageId: '20896522-6235-5699-aeaf-f48b8150d895', // Bat Trang
      initials: 'NT',
    },
    {
      id: 'agency-pending-1',
      name: 'Tran Van Minh',
      email: 'minh.tran@langsontours.com',
      role: 'AGENCY',
      organization: 'Lang Son Heritage Tours',
      submissionDate: '2026-09-17',
      villageId: null,
      initials: 'TV',
    },
    {
      id: 'prov-pending-2',
      name: 'Pham Duc Anh',
      email: 'duc.anh@vanphucsilk.vn',
      role: 'PROVIDER',
      organization: 'Van Phuc Silk Village',
      submissionDate: '2026-09-16',
      villageId: 'c0d0d95f-d59c-5c35-946a-f397e380dd14', // Van Phuc
      initials: 'PD',
    },
  ]

  // Filter pending accounts by admin scope
  const scopedPending = scope.effectiveVillageId
    ? pendingAccounts.filter(p => p.villageId === scope.effectiveVillageId)
    : pendingAccounts

  return {
    users: filtered,
    pendingUsers: scopedPending,
    totalCount: filtered.length,
    scope,
  }
}

export async function toggleUserStatus(
  session: SessionLike,
  userId: string,
  targetEnabled: boolean
): Promise<{ success: boolean; newStatus: UserAccountItem['status']; error?: string }> {
  const scope = resolveAdminScope(session)

  // Verify user exists and check scope
  const { users } = await listUserAccounts(session)
  const targetUser = users.find(u => u.userId === userId)

  if (!targetUser) {
    // If not found in scoped list, user either does not exist or is outside UBND scope
    return {
      success: false,
      newStatus: 'Disabled',
      error: 'Account not found or outside authorized scope.',
    }
  }

  // Determine new status
  let newStatus: UserAccountItem['status']
  if (!targetEnabled) {
    newStatus = 'Disabled'
  } else {
    // Restore eligible status based on role
    newStatus = targetUser.role === 'Tour_Agency' ? 'Approved' : 'Active'
  }

  runtimeStatusOverrides.set(userId, newStatus)

  return {
    success: true,
    newStatus,
  }
}
