import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { listAccounts } from '@/lib/auth/admin-accounts'
import { withApplicationStore, type ApplicationStore } from '@/lib/db/application-store'
import { demoSessionContextFor } from '@/lib/auth/session'
import type { DemoRow } from '@/lib/demo/types'
import Pagination from '@/app/components/ui/Pagination'

describe('D32 - Admin Account Loading & Pagination', () => {
  it('avoids N+1 queries when loading 79 accounts (batch loading instead of hundreds of find calls)', async () => {
    const hdtSession = await demoSessionContextFor('hdt')

    // Generate 79 synthetic accounts
    const userAccounts: DemoRow[] = Array.from({ length: 79 }, (_, i) => ({
      user_id: `u_${i + 1}`,
      full_name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role_code: i % 2 === 0 ? 'Local_Provider' : 'Tour_Agency',
      account_status: 'Active',
      created_at: '2026-01-01T00:00:00.000Z',
    }))

    const agencyProfiles: DemoRow[] = userAccounts
      .filter(u => u.role_code === 'Tour_Agency')
      .map(u => ({ agency_id: `ag_${u.user_id}`, user_id: u.user_id, company_name: `Agency ${u.user_id}` }))

    const providerProfiles: DemoRow[] = userAccounts
      .filter(u => u.role_code === 'Local_Provider')
      .map((u, idx) => ({
        provider_id: `pr_${u.user_id}`,
        user_id: u.user_id,
        village_id: idx % 2 === 0 ? 'v1' : 'v2',
        current_version_no: '1',
      }))

    const providerVersions: DemoRow[] = providerProfiles.map(p => ({
      provider_id: p.provider_id,
      version_no: '1',
      business_name: `Workshop ${p.provider_id}`,
    }))

    const tables: Record<string, DemoRow[]> = {
      user_accounts: userAccounts,
      agency_profiles: agencyProfiles,
      provider_profiles: providerProfiles,
      provider_profile_versions: providerVersions,
      ubnd_village_assignments: [],
      villages: [{ village_id: 'v1', name: 'Bát Tràng' }, { village_id: 'v2', name: 'Vạn Phúc' }],
    }

    let findCallCount = 0

    const mockStore: ApplicationStore = {
      all: vi.fn(async (name: string) => tables[name] ?? []),
      find: vi.fn(async (name: string, predicate: (r: DemoRow) => boolean) => {
        findCallCount++
        return (tables[name] ?? []).find(predicate)
      }),
      snapshot: vi.fn(async (names: readonly string[]) => {
        return Object.fromEntries(names.map((name: string) => [name, tables[name] ?? []]))
      }),
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      applyBatch: vi.fn(),
      transaction: vi.fn(),
      atomic: vi.fn(async (_names, work) => work()),
    }

    const accounts = await withApplicationStore(mockStore, () => listAccounts(hdtSession))

    expect(accounts).toHaveLength(79)
    expect(accounts[0].organization).toBeDefined()

    // Without optimization, find is called 5 times per account (~395 calls).
    // With optimization, find should be called 0 times, using batch snapshot or all instead.
    expect(findCallCount).toBe(0)
  })

  it('preserves authorization: restricts UBND to providers in its own village even with batch loading', async () => {
    const ubndSession = { ...(await demoSessionContextFor('ubnd')), assignedVillageId: 'v1' }

    const userAccounts: DemoRow[] = [
      { user_id: 'u1', role_code: 'Local_Provider', account_status: 'Active' },
      { user_id: 'u2', role_code: 'Local_Provider', account_status: 'Active' },
      { user_id: 'u3', role_code: 'Tour_Agency', account_status: 'Active' },
    ]
    const providerProfiles: DemoRow[] = [
      { provider_id: 'p1', user_id: 'u1', village_id: 'v1', current_version_no: '1' },
      { provider_id: 'p2', user_id: 'u2', village_id: 'v2', current_version_no: '1' },
    ]

    const tables: Record<string, DemoRow[]> = {
      user_accounts: userAccounts,
      agency_profiles: [],
      provider_profiles: providerProfiles,
      provider_profile_versions: [],
      ubnd_village_assignments: [],
      villages: [{ village_id: 'v1', name: 'Bát Tràng' }],
    }

    const mockStore: ApplicationStore = {
      all: vi.fn(async (name: string) => tables[name] ?? []),
      find: vi.fn(async (name: string, pred: (r: DemoRow) => boolean) => (tables[name] ?? []).find(pred)),
      snapshot: vi.fn(async (names: readonly string[]) => Object.fromEntries(names.map((name: string) => [name, tables[name] ?? []]))),
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      applyBatch: vi.fn(),
      transaction: vi.fn(),
      atomic: vi.fn(async (_n, w) => w()),
    }

    const accounts = await withApplicationStore(mockStore, () => listAccounts(ubndSession))
    expect(accounts).toHaveLength(1)
    expect(accounts[0].user_id).toBe('u1')
  })

  it('Pagination: shows appropriate loading state instead of "0 / 0" when loading is true', () => {
    // When loading is true, Pagination must not show "0 / 0" or "Hiển thị 0 / 0"
    const htmlLoading = renderToString(
      React.createElement(Pagination, {
        loading: true,
        from: 1,
        to: 0,
        total: 0,
        unit: 'tài khoản',
      })
    )
    expect(htmlLoading).not.toContain('0 / 0')
    expect(htmlLoading).toContain('Đang tải…')

    // When loading is false and total is 79, shows normal pagination numbers
    const htmlDone = renderToString(
      React.createElement(Pagination, {
        loading: false,
        from: 1,
        to: 20,
        total: 79,
        unit: 'tài khoản',
      })
    )
    expect(htmlDone).toContain('Hiển thị 1–20 / 79 tài khoản')

    // When loading is false and search has 0 results, shows 0 / 0 as actual result
    const htmlZero = renderToString(
      React.createElement(Pagination, {
        loading: false,
        from: 1,
        to: 0,
        total: 0,
        unit: 'tài khoản',
      })
    )
    expect(htmlZero).toContain('Hiển thị 0 / 0 tài khoản')
  })
})
