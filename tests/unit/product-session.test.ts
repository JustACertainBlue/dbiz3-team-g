import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { authenticateAccount, authenticatePrototype, PRODUCT_SESSION_COOKIE, productSessionFromRequest, revokeProductSession, workspacePath } from '@/lib/auth/product-session'
import { hashPassword } from '@/lib/auth/password'
import { demoRepository } from '@/lib/demo/json-repository'

function requestWith(token: string): Request {
  return new Request('http://localhost/api/auth/session', { headers: { cookie: `${PRODUCT_SESSION_COOKIE}=${token}` } })
}

describe('product session prototype adapter', () => {
  beforeEach(() => demoRepository().reset())
  it('authenticates a non-demo Agency using its actual hash and organization', async () => {
    const repo = demoRepository()
    repo.insert('user_accounts', { user_id: 'new-agency-user', email: 'new@example.invalid', full_name: 'New Agency', role_code: 'Tour_Agency', admin_type: '', account_status: 'Approved', password_hash: await hashPassword('Secure123!') })
    repo.insert('agency_profiles', { user_id: 'new-agency-user', agency_id: 'new-agency' })
    expect(await authenticateAccount('new@example.invalid', 'wrong')).toEqual({ ok: false, reason: 'INVALID_CREDENTIALS' })
    expect(authenticatePrototype('new@example.invalid', 'anything').ok).toBe(false)
    const result = await authenticateAccount('new@example.invalid', 'Secure123!')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(productSessionFromRequest(requestWith(result.token))).toMatchObject({ userId: 'new-agency-user', agencyId: 'new-agency' })
    repo.update('user_accounts', row => row.user_id === 'new-agency-user', { account_status: 'Pending Approval' })
    expect(productSessionFromRequest(requestWith(result.token))).toBeNull()
    expect(await authenticateAccount('new@example.invalid', 'Secure123!')).toEqual({ ok: false, reason: 'ACCOUNT_INACTIVE' })
  })
  it('derives identity and role from a seeded email instead of client input', () => {
    const result = authenticatePrototype('thanhvien13@example.invalid', 'not-empty')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.identity).toMatchObject({ role: 'TourAgency', agencyId: DEMO_IDENTITIES.agency.agencyId })
    expect(productSessionFromRequest(requestWith(result.token))?.userId).toBe(DEMO_IDENTITIES.agency.userId)
  })
  it('rejects unknown email and empty password', () => {
    expect(authenticatePrototype('unknown@example.invalid', 'anything')).toEqual({ ok: false, reason: 'INVALID_CREDENTIALS' })
    expect(authenticatePrototype('thanhvien13@example.invalid', '')).toEqual({ ok: false, reason: 'INVALID_CREDENTIALS' })
  })
  it('revokes a session so the token cannot be reused', () => {
    const result = authenticatePrototype('thanhvien19@example.invalid', 'not-empty')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const request = requestWith(result.token)
    expect(productSessionFromRequest(request)?.role).toBe('LocalProvider')
    expect(revokeProductSession(request)).toBe(true)
    expect(productSessionFromRequest(request)).toBeNull()
  })
  it('routes each authenticated identity to its own workspace', () => {
    expect(workspacePath(DEMO_IDENTITIES.agency)).toBe('/explore')
    expect(workspacePath(DEMO_IDENTITIES.provider)).toContain('/provider/')
    expect(workspacePath(DEMO_IDENTITIES.ubnd)).toBe('/admin/providers')
    expect(workspacePath(DEMO_IDENTITIES.hdt)).toBe('/admin')
  })
  it('invalidates the existing session after the account role changes', () => {
    const result = authenticatePrototype('thanhvien13@example.invalid', 'not-empty')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    demoRepository().update('user_accounts', row => row.user_id === result.identity.userId, { role_code: 'ADMIN', admin_type: 'HDT', account_status: 'Active' })
    expect(productSessionFromRequest(requestWith(result.token))).toBeNull()
  })
})
