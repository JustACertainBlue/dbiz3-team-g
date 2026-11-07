import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { withApplicationStore, type ApplicationStore } from '@/lib/db/application-store'
import { demoRepository as fixtureRepository } from '@/lib/demo/json-repository'
import { authenticateAccount, workspacePath } from '@/lib/auth/product-session'
// The script's core logic; the CLI (scripts/db/set-test-passwords.mjs) only adds the PostgreSQL adapter.
import { planTestAccounts, applyTestAccounts } from '../../scripts/db/test-accounts.mjs'

// ADR 0001 / test plan §3: `npm run db:set-test-passwords` (manual, one-off) gives each tester a synthetic account.
// Agency: one per declared name + "[T-Khach]" for outsiders, created Approved through the same records as an
// approved seed Agency. Provider: password only for the existing Verified Bát Tràng account. UBND: password only
// for thanhvien1 (Bát Tràng). HDT: only declared names. Passwords come from environment variables, are never
// logged, never must-change, and reruns are idempotent. These tests use an in-memory fixture adapter: no database.
// Passwords below are test-only fixtures.
const PW = { thu: 'Test-only-Thu-1!', khach: 'Test-only-Khach-1!', linh: 'Test-only-Linh-1!', provider: 'Test-only-Prov-1!', ubnd: 'Test-only-Ubnd-1!' }
const ENV = {
  HAB_TEST_AGENCY_NAMES: 'Thu', HAB_TEST_HDT_NAMES: 'Linh',
  HAB_TEST_PASSWORD_AGENCY_THU: PW.thu, HAB_TEST_PASSWORD_AGENCY_KHACH: PW.khach, HAB_TEST_PASSWORD_HDT_LINH: PW.linh,
  HAB_TEST_PASSWORD_PROVIDER: PW.provider, HAB_TEST_PASSWORD_UBND: PW.ubnd,
}

const repo = () => fixtureRepository()
const asFixture = (value: unknown) => value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
const matches = (criteria: Record<string, unknown>) => (row: Record<string, string>) =>
  Object.entries(criteria).every(([key, value]) => (row[key] ?? '') === asFixture(value))
/** Port used by the script, backed by the in-memory JSON fixture (no database). */
const port = {
  findOne: async (table: string, criteria: Record<string, unknown>) => repo().find(table, matches(criteria)),
  insert: async (table: string, row: Record<string, unknown>) => repo().insert(table, Object.fromEntries(Object.entries(row).map(([k, v]) => [k, asFixture(v)]))),
  update: async (table: string, criteria: Record<string, unknown>, changes: Record<string, unknown>) => repo().transaction(tables => {
    const rows = (tables[table] ?? []).filter(matches(criteria))
    for (const row of rows) Object.assign(row, Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, asFixture(v)])))
    return rows.length
  }),
  transaction: async <T>(work: () => Promise<T>) => work(),
}
const fast = { hash: (plain: string) => bcrypt.hash(plain, 4), verify: (plain: string, hash: string) => bcrypt.compare(plain, hash) }
const logger = () => ({ warn: vi.fn(), info: vi.fn() })
const logText = (log: ReturnType<typeof logger>) => [...log.warn.mock.calls, ...log.info.mock.calls].flat().join('\n')
const run = (env: Record<string, string>, log = logger()) => applyTestAccounts(port, planTestAccounts(env, log), { ...fast, log, now: () => new Date('2026-11-08T01:00:00.000Z') })

const fixtures: ApplicationStore = {
  all: async name => repo().all(name), find: async (name, predicate) => repo().find(name, predicate),
  snapshot: async names => repo().snapshot(names), insert: async (name, row) => repo().insert(name, row),
  update: async (name, predicate, changes) => repo().update(name, predicate, changes), remove: async (name, predicate) => repo().remove(name, predicate),
  applyBatch: async operations => repo().applyBatch(operations), transaction: async (_names, work) => repo().transaction(work), atomic: async (_names, work) => work(),
}
/** Log in exactly as the hosted build does: NODE_ENV=production, so the "any password" demo login is off. */
async function productionLogin(email: string, password: string) {
  vi.stubEnv('NODE_ENV', 'production')
  try {
    return await withApplicationStore(fixtures, async () => {
      const result = await authenticateAccount(email, password)
      return result.ok ? { ok: true as const, identity: result.identity, path: await workspacePath(result.identity) } : result
    })
  } finally { vi.stubEnv('NODE_ENV', 'test') }
}
const user = (email: string) => repo().find('user_accounts', row => row.email === email)

describe('db:set-test-passwords | per-person synthetic test accounts', () => {
  beforeEach(() => repo().reset())
  afterEach(() => vi.unstubAllEnvs())

  it('plans Agency accounts for declared names plus Khach, HDT only for declared names, and the two existing accounts', () => {
    const plan = planTestAccounts(ENV, logger())
    expect(plan.agencies.map(a => [a.name, a.email])).toEqual([['Thu', 't-thu-agency@example.invalid'], ['Khach', 't-khach-agency@example.invalid']])
    expect(plan.hdt.map(a => a.email)).toEqual(['t-linh-hdt@example.invalid'])
    expect(plan.existing.map(a => a.email)).toEqual(['thanhvien19@example.invalid', 'thanhvien1@example.invalid'])
  })

  it('creates an Approved Agency through the same records as an approved seed Agency, and it logs in under production', async () => {
    await run(ENV)
    const account = user('t-thu-agency@example.invalid')!
    expect(account).toMatchObject({ role_code: 'Tour_Agency', account_status: 'Approved', must_change_password: 'false' })
    const profile = repo().find('agency_profiles', row => row.user_id === account.user_id)!
    expect(profile.company_name).toMatch(/^\[T-Thu\] /)
    const request = repo().find('agency_registration_requests', row => row.registration_request_id === profile.registration_request_id)!
    expect(request).toMatchObject({ current_status: 'Approved', agency_user_id: account.user_id, current_version_no: '1' })
    expect(repo().find('registration_submission_versions', row => row.registration_request_id === request.registration_request_id && row.version_no === '1')).toBeDefined()
    const hdtSeed = user('thanhvien9@example.invalid')!
    expect(repo().find('agency_review_records', row => row.registration_request_id === request.registration_request_id)).toMatchObject({ decision: 'Approve', hdt_user_id: hdtSeed.user_id })
    expect(repo().find('account_status_history', row => row.user_id === account.user_id)).toMatchObject({ from_status: 'Pending Approval', to_status: 'Approved' })
    const login = await productionLogin('t-thu-agency@example.invalid', PW.thu)
    expect(login).toMatchObject({ ok: true, path: '/explore' })
    if (login.ok) expect(login.identity.agencyId).toBe(profile.agency_id)
    expect(await productionLogin('t-thu-agency@example.invalid', 'anything')).toMatchObject({ ok: false })
  })

  it('always creates the "[T-Khach]" Agency for outsiders, even with no names declared', async () => {
    await run({ HAB_TEST_PASSWORD_AGENCY_KHACH: PW.khach })
    expect(user('t-khach-agency@example.invalid')).toMatchObject({ account_status: 'Approved' })
    expect(await productionLogin('t-khach-agency@example.invalid', PW.khach)).toMatchObject({ ok: true, path: '/explore' })
  })

  it('creates HDT accounts only for declared names; they log in to /admin', async () => {
    const usersBefore = repo().all('user_accounts').filter(row => row.admin_type === 'HDT').length
    await run(ENV)
    expect(repo().all('user_accounts').filter(row => row.admin_type === 'HDT')).toHaveLength(usersBefore + 1)
    expect(user('t-linh-hdt@example.invalid')).toMatchObject({ role_code: 'ADMIN', admin_type: 'HDT', account_status: 'Active', must_change_password: 'false' })
    expect(await productionLogin('t-linh-hdt@example.invalid', PW.linh)).toMatchObject({ ok: true, path: '/admin' })
  })

  it('only sets passwords for the existing Bát Tràng Provider and UBND thanhvien1: no new Provider, workshop or UBND', async () => {
    repo().update('user_accounts', row => row.email === 'thanhvien1@example.invalid', { must_change_password: 'true' })
    const counts = () => ['provider_profiles', 'ubnd_village_assignments'].map(t => repo().all(t).length)
    const before = counts()
    const otherRoles = () => repo().all('user_accounts').filter(row => row.role_code === 'Local_Provider' || row.admin_type === 'UBND').length
    const rolesBefore = otherRoles()
    await run(ENV)
    expect(counts()).toEqual(before)
    expect(otherRoles()).toBe(rolesBefore)
    expect(user('thanhvien1@example.invalid')!.must_change_password).toBe('false')
    expect(await productionLogin('thanhvien19@example.invalid', PW.provider)).toMatchObject({ ok: true })
    expect(await productionLogin('thanhvien1@example.invalid', PW.ubnd)).toMatchObject({ ok: true, path: '/admin/providers' })
  })

  it('skips an account whose password variable is missing or too weak, and never logs a password', async () => {
    const log = logger()
    await run({ HAB_TEST_AGENCY_NAMES: 'Thu,Bao', HAB_TEST_PASSWORD_AGENCY_THU: 'weakpass', HAB_TEST_PASSWORD_UBND: PW.ubnd }, log)
    expect(user('t-thu-agency@example.invalid')).toBeUndefined()
    expect(user('t-bao-agency@example.invalid')).toBeUndefined()
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('HAB_TEST_PASSWORD_AGENCY_BAO'))
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('HAB_TEST_PASSWORD_AGENCY_THU'))
    expect(logText(log)).not.toContain('weakpass')
    expect(logText(log)).not.toContain(PW.ubnd)
  })

  it('rejects names that are not plain letters/digits without creating anything', async () => {
    const log = logger()
    const plan = planTestAccounts({ HAB_TEST_AGENCY_NAMES: 'Thu,bad name,x@y', HAB_TEST_HDT_NAMES: '' }, log)
    expect(plan.agencies.map(a => a.name)).toEqual(['Thu', 'Khach'])
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('bad name'))
  })

  it('is idempotent: a second run with the same variables changes nothing', async () => {
    await run(ENV)
    const tables = ['user_accounts', 'agency_profiles', 'agency_registration_requests', 'registration_submission_versions', 'agency_review_records', 'account_status_history']
    const first = repo().snapshot(tables)
    await run(ENV)
    expect(repo().snapshot(tables)).toEqual(first)
  })

  it('a changed password updates the hash and revokes that account\'s open sessions', async () => {
    await run(ENV)
    const login = await productionLogin('t-thu-agency@example.invalid', PW.thu)
    expect(login.ok).toBe(true)
    await run({ ...ENV, HAB_TEST_PASSWORD_AGENCY_THU: 'Test-only-Thu-2!' })
    const account = user('t-thu-agency@example.invalid')!
    expect(repo().all('sessions').filter(row => row.user_id === account.user_id && !row.revoked_at)).toHaveLength(0)
    expect(await productionLogin('t-thu-agency@example.invalid', PW.thu)).toMatchObject({ ok: false })
    expect(await productionLogin('t-thu-agency@example.invalid', 'Test-only-Thu-2!')).toMatchObject({ ok: true })
  })
})
