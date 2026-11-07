import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as iacChats } from '@/app/api/iac/chats/route'
import { GET as bkgAgencyBookings } from '@/app/api/bkg/agency/bookings/route'
import { POST as aitSessions } from '@/app/api/ait/sessions/route'
import { GET as admDashboard } from '@/app/api/adm/dashboard/route'
import { authenticateAccount, PRODUCT_SESSION_COOKIE, revokeProductSession } from '@/lib/auth/product-session'
import { demoRepository } from '@/lib/db/application-store'
import { demoRepository as fixtureRepository } from '@/lib/demo/json-repository'

// Integration contract "AUT → every module" (docs/test/integration-contract.md): each module reads the canonical
// SessionContext from the opaque `hab_session` cookie. spec-AUT BR-011 (role + scope), BR-012/BR-013 and
// AC-AUT-SESSION (a disabled account loses access on the next request, no grace), FR-009 (logout invalidates).
// Session lifetime: product-session.ts PRODUCT_SESSION_TTL_SECONDS (12 h), valid while expires_at > now.
// Runs on the ordinary-test fixture store (NODE_ENV=test): no database.
const T0 = new Date('2026-11-08T02:00:00.000Z')
const request = (path: string, token: string | null, method = 'GET') => new Request(`http://localhost${path}`, {
  method, headers: { 'content-type': 'application/json', ...(token ? { cookie: `${PRODUCT_SESSION_COOKIE}=${token}` } : {}) },
  body: method === 'POST' ? '{}' : undefined,
})
// One protected entry point per module, with the status each answers to a caller without a valid session.
const AGENCY_ROUTES = [
  { module: 'IAC', call: (t: string | null) => iacChats(request('/api/iac/chats', t) as any), denied: 403 },
  { module: 'BKG', call: (t: string | null) => bkgAgencyBookings(request('/api/bkg/agency/bookings', t) as any), denied: 403 },
  { module: 'AIT', call: (t: string | null) => aitSessions(request('/api/ait/sessions', t, 'POST') as any), denied: 401 },
]
const ADM_ROUTE = { module: 'ADM', call: (t: string | null) => admDashboard(request('/api/adm/dashboard?preset=Last+90+days', t) as any), denied: 401 }

async function login(email: string) {
  const result = await authenticateAccount(email, 'demo') // development fixture login (seed hash) under NODE_ENV=test
  if (!result.ok) throw new Error(`login failed: ${result.reason}`)
  return result.token as string
}
async function statuses(token: string | null) {
  return Promise.all(AGENCY_ROUTES.map(async route => [route.module, (await route.call(token)).status] as const))
}
const ok = AGENCY_ROUTES.map(route => [route.module, route.module === 'AIT' ? 201 : 200] as const)
const denied = AGENCY_ROUTES.map(route => [route.module, route.denied] as const)

describe('AUT → every module | session carried by hab_session', () => {
  beforeEach(() => { fixtureRepository().reset(); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(T0) })
  afterEach(() => vi.useRealTimers())

  it('BR-011 / FR-007 (normal): one valid session is accepted by IAC, BKG, AIT and, for HDT, ADM', async () => {
    expect(await statuses(await login('thanhvien13@example.invalid'))).toEqual(ok)
    expect((await ADM_ROUTE.call(await login('thanhvien9@example.invalid'))).status).toBe(200)
  })

  it('FR-007 session lifetime (boundary): 1 ms before expires_at every module still accepts the session', async () => {
    const token = await login('thanhvien13@example.invalid')
    const session = (await demoRepository().all('sessions')).at(-1)!
    vi.setSystemTime(Date.parse(session.expires_at) - 1)
    expect(await statuses(token)).toEqual(ok)
  })

  it('FR-007 session lifetime (boundary): at the expires_at instant every module treats the caller as Guest', async () => {
    const token = await login('thanhvien13@example.invalid')
    const hdt = await login('thanhvien9@example.invalid')
    const sessions = await demoRepository().all('sessions')
    vi.setSystemTime(Math.max(...sessions.slice(-2).map(row => Date.parse(row.expires_at))))
    expect(await statuses(token)).toEqual(denied)
    expect((await ADM_ROUTE.call(hdt)).status).toBe(ADM_ROUTE.denied)
  })

  it('BR-012 / BR-013 / AC-AUT-SESSION (error): an account disabled mid-session is refused on the very next request in every module', async () => {
    const token = await login('thanhvien13@example.invalid')
    const hdt = await login('thanhvien9@example.invalid')
    expect(await statuses(token)).toEqual(ok)
    fixtureRepository().update('user_accounts', row => row.email === 'thanhvien13@example.invalid', { account_status: 'Disabled' })
    fixtureRepository().update('user_accounts', row => row.email === 'thanhvien9@example.invalid', { account_status: 'Disabled' })
    expect(await statuses(token)).toEqual(denied)
    expect((await ADM_ROUTE.call(hdt)).status).toBe(ADM_ROUTE.denied)
  })

  it('FR-009 (error): a revoked (logged-out) session is refused by every module', async () => {
    const token = await login('thanhvien13@example.invalid')
    expect(await revokeProductSession(request('/api/auth/logout', token, 'POST'))).toBe(true) // the logout route's own call
    expect(await statuses(token)).toEqual(denied)
  })
})
