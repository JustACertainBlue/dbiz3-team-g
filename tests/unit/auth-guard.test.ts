/**
 * T008 — Authentication & access control guard
 * Verifies BR-001 (Agency-only), BR-002 (Guest redirect), BR-016 (session on open).
 *
 * CONSTITUTION II: Must FAIL before T009 (session.ts) is implemented.
 */
import { describe, it, expect } from 'vitest'
import { checkAitAccess, type SessionContext } from '@/lib/auth/session'

describe('T008 | Authentication & Access Control Guard', () => {
  it('BR-001: returns ALLOWED for an authenticated Tour Agency', () => {
    const ctx: SessionContext = { role: 'Agency', accountId: 'agency-001', authenticated: true }
    const result = checkAitAccess(ctx)
    expect(result.allowed).toBe(true)
  })

  it('BR-002: returns DENIED with redirect for a Guest', () => {
    const ctx: SessionContext = { role: 'Guest', accountId: null, authenticated: false }
    const result = checkAitAccess(ctx)
    expect(result.allowed).toBe(false)
    expect(result.redirectTo).toBe('/login')
  })

  it('BR-001: returns DENIED with 403 for a Local Provider (wrong role)', () => {
    const ctx: SessionContext = { role: 'Provider', accountId: 'prov-001', authenticated: true }
    const result = checkAitAccess(ctx)
    expect(result.allowed).toBe(false)
    expect(result.statusCode).toBe(403)
  })

  it('BR-001: returns DENIED for an Admin account (not Tour Agency)', () => {
    const ctx: SessionContext = { role: 'Admin', accountId: 'admin-001', authenticated: true }
    const result = checkAitAccess(ctx)
    expect(result.allowed).toBe(false)
    expect(result.statusCode).toBe(403)
  })

  it('BR-016: allowed check returns agencyId for session creation', () => {
    const ctx: SessionContext = { role: 'Agency', accountId: 'agency-xyz', authenticated: true }
    const result = checkAitAccess(ctx)
    expect(result.allowed).toBe(true)
    expect(result.agencyId).toBe('agency-xyz')
  })
})
