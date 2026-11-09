/**
 * Issue #159 — ADM095 role filter separates UBND and HDT. Both are stored as role ADMIN; the subtype
 * is `admin_type` (consistency-contract.md:16, :49 "admin_type HDT / UBND required only for ADMIN").
 * spec-AUT FR-021 (spec-AUT.md:379): HDT views Agency, UBND and Local Provider accounts and "can
 * filter by organization, role, status, created date". No schema or data change.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { filterAdminUsers, roleOptions, type AdminUserFilters } from '@/lib/auth/admin-user-filter'

const u = (name: string, role: string, admin_type = '', organization = 'Org') => ({
  user_id: name, name, email: `${name}@example.invalid`, organization, role, admin_type, status: 'Active', created_date: '2026-10-01T00:00:00.000Z',
})
const HDT = u('hdt', 'ADMIN', 'HDT', 'Sở Du lịch Hà Nội')
const UBND_A = u('ubnd-a', 'ADMIN', 'UBND', 'UBND — Bát Tràng')
const UBND_B = u('ubnd-b', 'ADMIN', 'UBND', 'UBND — Vạn Phúc')
const AGENCY = u('agency', 'Tour_Agency', '', 'Công ty A')
const PROVIDER = u('provider', 'Local_Provider', '', 'Xưởng B')
const ALL = [HDT, UBND_A, UBND_B, AGENCY, PROVIDER]
const none: AdminUserFilters = { query: '', status: '', role: '', organization: '', dateFrom: '', dateTo: '' }
const names = (filters: Partial<AdminUserFilters>) => filterAdminUsers(ALL, { ...none, ...filters }).map(x => x.name).sort()

describe('#159 | role filter: UBND and HDT are separate choices', () => {
  it('UBND → only UBND admin accounts', () => {
    expect(names({ role: 'ADMIN:UBND' })).toEqual(['ubnd-a', 'ubnd-b'])
  })

  it('HDT → only HDT admin accounts', () => {
    expect(names({ role: 'ADMIN:HDT' })).toEqual(['hdt'])
  })

  it('Agency and Provider choices are unchanged', () => {
    expect(names({ role: 'Tour_Agency' })).toEqual(['agency'])
    expect(names({ role: 'Local_Provider' })).toEqual(['provider'])
  })

  it('role and organization combine (AND)', () => {
    expect(names({ role: 'ADMIN:UBND', organization: 'UBND — Vạn Phúc' })).toEqual(['ubnd-b'])
    expect(names({ role: 'ADMIN:HDT', organization: 'UBND — Vạn Phúc' })).toEqual([])
  })
})

describe('#159 | roleOptions lists only the roles present in the actor\'s list', () => {
  it('HDT list: Agency, Provider, UBND, HDT — in that order, UBND and HDT apart', () => {
    expect(roleOptions(ALL)).toEqual([
      { value: 'Tour_Agency', label: 'Tour Agency' },
      { value: 'Local_Provider', label: 'Local Provider' },
      { value: 'ADMIN:UBND', label: 'Admin UBND' },
      { value: 'ADMIN:HDT', label: 'Admin HDT' },
    ])
  })

  it('UBND list (own-village Providers only): only Local Provider', () => {
    expect(roleOptions([PROVIDER])).toEqual([{ value: 'Local_Provider', label: 'Local Provider' }])
  })

  it('every option filters to at least one account of the list it came from', () => {
    for (const option of roleOptions(ALL)) expect(names({ role: option.value }).length).toBeGreaterThan(0)
  })
})

describe('#159 | ADM095 uses roleOptions for the Vai trò filter', () => {
  it('no hard-coded ADMIN / Tour_Agency / Local_Provider option list', () => {
    const page = readFileSync('src/app/admin/users/page.tsx', 'utf8')
    expect(page).toMatch(/roleOptions\(users\)/)
    expect(page).not.toMatch(/\['ADMIN','Tour_Agency','Local_Provider'\]/)
  })
})
