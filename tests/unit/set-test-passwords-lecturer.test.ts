import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { withApplicationStore, type ApplicationStore } from '@/lib/db/application-store'
import { demoRepository as fixtureRepository } from '@/lib/demo/json-repository'
import { authenticateAccount, workspacePath } from '@/lib/auth/product-session'
import { meetsPasswordRule } from '../../scripts/db/test-accounts.mjs'
// Lecturer mode of `npm run db:set-test-passwords -- --lecturer [--dry-run] [--reset-passwords]` (human decision
// linhkhanh-vu 2026-11-10): four tester logins for the lecturer on one village (Phú Vinh):
// - agency-tester@example.invalid: new Agency, Approved, company "[Tester] Công ty du lịch" (approved by seed HDT thanhvien9);
// - hdt-tester@example.invalid: new HDT;
// - provider-tester@example.invalid / ubnd-tester@example.invalid: the email of the village's Verified Provider user and
//   UBND user is changed (same user ids, profiles and village assignment).
// Passwords are generated (randomBytes, AUT rule), returned once to the CLI for stdout, never logged; sessions revoked.
// HAB_EXPECT_PROJECT_REF must match the project ref in DATABASE_APP_URL before anything connects.
import { lecturerPreflight, projectRefFromDatabaseUrl, generatePassword, runLecturer } from '../../scripts/db/lecturer-accounts.mjs'

const REF = 'abcdefghijklmnopqrst'
const OTHER = 'zyxwvutsrqponmlkjihg'
// Synthetic connection strings (test-only credentials, no real host is contacted).
const POOLER = (ref: string) => `postgresql://hab_app.${ref}:test-only@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`
const DIRECT = (ref: string) => `postgresql://hab_app:test-only@db.${ref}.supabase.co:5432/postgres`

const PHU_VINH = 'e482884e-7190-56cf-bc03-4e69614b1fe5'
const PROVIDER_USER = '40ed08b5-27a5-55b4-aea3-e8e80352ee76' // thanhvien21, Xưởng thủ công Phú Vinh (Verified)
const UBND_USER = 'adcd99a2-ef24-5895-9a4e-59256bb1a23f' // thanhvien3, UBND Phú Vinh
const EMAILS = { agency: 'agency-tester@example.invalid', provider: 'provider-tester@example.invalid', ubnd: 'ubnd-tester@example.invalid', hdt: 'hdt-tester@example.invalid' }

const repo = () => fixtureRepository()
const asFixture = (value: unknown) => value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
const matches = (criteria: Record<string, unknown>) => (row: Record<string, string>) =>
  Object.entries(criteria).every(([key, value]) => (row[key] ?? '') === asFixture(value))
const writes = { insert: vi.fn(), update: vi.fn() }
/** Port used by the script, backed by the in-memory JSON fixture (no database). */
const port = {
  findOne: async (table: string, criteria: Record<string, unknown>) => repo().find(table, matches(criteria)),
  findAll: async (table: string, criteria: Record<string, unknown>) => repo().all(table).filter(matches(criteria)),
  insert: async (table: string, row: Record<string, unknown>) => { writes.insert(table); return repo().insert(table, Object.fromEntries(Object.entries(row).map(([k, v]) => [k, asFixture(v)]))) },
  update: async (table: string, criteria: Record<string, unknown>, changes: Record<string, unknown>) => { writes.update(table); return repo().transaction(tables => {
    const rows = (tables[table] ?? []).filter(matches(criteria))
    for (const row of rows) Object.assign(row, Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, asFixture(v)])))
    return rows.length
  }) },
  transaction: async <T>(work: () => Promise<T>) => work(),
}
const logger = () => ({ warn: vi.fn(), info: vi.fn() })
const logText = (log: ReturnType<typeof logger>) => [...log.warn.mock.calls, ...log.info.mock.calls].flat().join('\n')
const deps = (log = logger()) => ({ hash: (plain: string) => bcrypt.hash(plain, 4), verify: (plain: string, hash: string) => bcrypt.compare(plain, hash), now: () => new Date('2026-11-10T13:00:00.000Z'), log })
const ENV = { HAB_LECTURER_VILLAGE: 'Phú Vinh' }
const run = (options: { dryRun?: boolean, resetPasswords?: boolean } = {}, env: Record<string, string> = ENV, log = logger()) => runLecturer(port, env, deps(log), options)
const passwordOf = (result: { credentials: { email: string, password: string }[] }, email: string) => result.credentials.find(c => c.email === email)!.password

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
const TABLES = ['user_accounts', 'sessions', 'agency_profiles', 'agency_registration_requests', 'registration_submission_versions', 'agency_review_records', 'account_status_history', 'provider_profiles', 'ubnd_village_assignments']
const openSession = (userId: string) => repo().insert('sessions', {
  session_id: `00000000-0000-4000-8000-${userId.slice(-12)}`, user_id: userId, role_context: 'ADMIN', token_hash: `test-only-${userId}`,
  expires_at: '2026-12-01T00:00:00+07:00', revoked_at: '', created_at: '2026-11-10T08:00:00+07:00',
})

describe('db:set-test-passwords --lecturer | PROD guard (HAB_EXPECT_PROJECT_REF)', () => {
  it('reads the project ref from a pooler user (hab_app.<ref>) and from a direct host (db.<ref>.supabase.co)', () => {
    expect(projectRefFromDatabaseUrl(POOLER(REF))).toBe(REF)
    expect(projectRefFromDatabaseUrl(DIRECT(REF))).toBe(REF)
  })

  it('stops when HAB_EXPECT_PROJECT_REF is missing', () => {
    expect(() => lecturerPreflight({ DATABASE_APP_URL: POOLER(REF), ...ENV })).toThrow(/HAB_EXPECT_PROJECT_REF/)
  })

  it('stops when the ref in DATABASE_APP_URL differs, naming both refs and no credential', () => {
    let message = ''
    try { lecturerPreflight({ DATABASE_APP_URL: POOLER(OTHER), HAB_EXPECT_PROJECT_REF: REF, ...ENV }) } catch (error) { message = String((error as Error).message) }
    expect(message).toMatch(/does not match/)
    expect(message).toContain(REF)
    expect(message).toContain(OTHER)
    expect(message).not.toContain('test-only')
  })

  it('stops when the ref cannot be read from DATABASE_APP_URL', () => {
    expect(() => lecturerPreflight({ DATABASE_APP_URL: 'postgresql://hab_app:test-only@localhost:5432/postgres', HAB_EXPECT_PROJECT_REF: REF, ...ENV })).toThrow(/project ref/)
  })

  it('stops when HAB_LECTURER_VILLAGE is missing; passes when the refs match', () => {
    expect(() => lecturerPreflight({ DATABASE_APP_URL: POOLER(REF), HAB_EXPECT_PROJECT_REF: REF })).toThrow(/HAB_LECTURER_VILLAGE/)
    expect(lecturerPreflight({ DATABASE_APP_URL: DIRECT(REF), HAB_EXPECT_PROJECT_REF: REF, ...ENV })).toEqual({ projectRef: REF, village: 'Phú Vinh' })
  })
})

describe('db:set-test-passwords --lecturer | generated passwords', () => {
  it('every generated password meets the AUT rule (8–64, upper, lower, digit, special, no space) and they differ', () => {
    const passwords = Array.from({ length: 300 }, () => generatePassword())
    for (const password of passwords) { expect(meetsPasswordRule(password)).toBe(true); expect(password).toHaveLength(20) }
    expect(new Set(passwords).size).toBe(passwords.length)
  })

  it('still meets the rule when the random source returns only zero bytes', () => {
    expect(meetsPasswordRule(generatePassword((size: number) => Buffer.alloc(size)))).toBe(true)
  })
})

describe('db:set-test-passwords --lecturer | village resolution', () => {
  beforeEach(() => { repo().reset(); writes.insert.mockClear(); writes.update.mockClear() })

  it('resolves Phú Vinh (by name or by village_id) to its Verified Provider user and its UBND user', async () => {
    for (const village of ['Phú Vinh', PHU_VINH]) {
      const { plan } = await run({ dryRun: true }, { HAB_LECTURER_VILLAGE: village })
      expect(plan.village).toMatchObject({ village_id: PHU_VINH, name: 'Phú Vinh' })
      expect(plan.provider).toMatchObject({ user_id: PROVIDER_USER, from: 'thanhvien21@example.invalid', to: EMAILS.provider })
      expect(plan.ubnd).toMatchObject({ user_id: UBND_USER, from: 'thanhvien3@example.invalid', to: EMAILS.ubnd })
    }
  })

  it('stops on an unknown or inactive village', async () => {
    await expect(run({ dryRun: true }, { HAB_LECTURER_VILLAGE: 'Không có' })).rejects.toThrow(/village/i)
    await expect(run({ dryRun: true }, { HAB_LECTURER_VILLAGE: 'Hạ Thái' })).rejects.toThrow(/not active/)
  })

  it('stops when the village has two Verified Providers (ambiguous) or none', async () => {
    const extra = { ...repo().find('provider_profiles', row => row.village_id === PHU_VINH)!, provider_id: '11111111-1111-4111-8111-111111111111', user_id: '22222222-2222-4222-8222-222222222222' }
    repo().insert('provider_profiles', extra)
    await expect(run({ dryRun: true })).rejects.toThrow(/ambiguous/)
    repo().reset()
    repo().update('provider_profiles', row => row.village_id === PHU_VINH, { verification_status: 'Suspended' })
    await expect(run({ dryRun: true })).rejects.toThrow(/Verified Provider/)
  })

  it('stops when the Provider or UBND user is not Active, or the village has two UBND users', async () => {
    repo().update('user_accounts', row => row.user_id === PROVIDER_USER, { account_status: 'Disabled' })
    await expect(run({ dryRun: true })).rejects.toThrow(/not Active/)
    repo().reset()
    repo().update('user_accounts', row => row.user_id === UBND_USER, { account_status: 'Disabled' })
    await expect(run({ dryRun: true })).rejects.toThrow(/not Active/)
    repo().reset()
    const other = repo().all('ubnd_village_assignments').find(row => row.village_id !== PHU_VINH)!
    repo().insert('ubnd_village_assignments', { ...other, village_id: PHU_VINH })
    await expect(run({ dryRun: true })).rejects.toThrow(/ambiguous/)
  })

  it('stops when a tester email already belongs to another user', async () => {
    repo().update('user_accounts', row => row.email === 'thanhvien22@example.invalid', { email: EMAILS.provider })
    await expect(run({ dryRun: true })).rejects.toThrow(/provider-tester@example\.invalid.*another user/)
  })
})

describe('db:set-test-passwords --lecturer | dry run and real run', () => {
  beforeEach(() => { repo().reset(); writes.insert.mockClear(); writes.update.mockClear() })
  afterEach(() => vi.unstubAllEnvs())

  it('--dry-run prints the planned emails, user ids and village and writes nothing', async () => {
    const before = repo().snapshot(TABLES)
    const result = await run({ dryRun: true })
    expect(writes.insert).not.toHaveBeenCalled()
    expect(writes.update).not.toHaveBeenCalled()
    expect(repo().snapshot(TABLES)).toEqual(before)
    expect(result.credentials).toEqual([])
    const text = result.lines.join('\n')
    for (const value of [PHU_VINH, 'Phú Vinh', PROVIDER_USER, UBND_USER, 'thanhvien21@example.invalid', 'thanhvien3@example.invalid', ...Object.values(EMAILS)]) expect(text).toContain(value)
    expect(text).toMatch(/agency-tester@example\.invalid: create/)
    expect(text).toMatch(/hdt-tester@example\.invalid: create/)
  })

  it('creates the Agency and HDT, moves the Provider/UBND logins, prints each password once and logs none', async () => {
    openSession(PROVIDER_USER); openSession(UBND_USER)
    const log = logger()
    const result = await run({}, ENV, log)
    expect(result.credentials.map((c: { email: string }) => c.email).sort()).toEqual(Object.values(EMAILS).sort())
    for (const { password } of result.credentials) { expect(meetsPasswordRule(password)).toBe(true); expect(logText(log)).not.toContain(password) }
    // Checked before any login below: a login opens a new session.
    for (const id of [PROVIDER_USER, UBND_USER]) expect(repo().all('sessions').filter(row => row.user_id === id && !row.revoked_at)).toHaveLength(0)

    const agency = user(EMAILS.agency)!
    expect(agency).toMatchObject({ role_code: 'Tour_Agency', account_status: 'Approved', must_change_password: 'false' })
    const profile = repo().find('agency_profiles', row => row.user_id === agency.user_id)!
    expect(profile.company_name).toBe('[Tester] Công ty du lịch')
    const hdtSeed = user('thanhvien9@example.invalid')!
    expect(repo().find('agency_review_records', row => row.registration_request_id === profile.registration_request_id)).toMatchObject({ decision: 'Approve', hdt_user_id: hdtSeed.user_id })
    expect(await productionLogin(EMAILS.agency, passwordOf(result, EMAILS.agency))).toMatchObject({ ok: true, path: '/explore' })

    expect(user(EMAILS.hdt)).toMatchObject({ role_code: 'ADMIN', admin_type: 'HDT', account_status: 'Active', must_change_password: 'false' })
    expect(await productionLogin(EMAILS.hdt, passwordOf(result, EMAILS.hdt))).toMatchObject({ ok: true, path: '/admin' })

    expect(user(EMAILS.provider)!.user_id).toBe(PROVIDER_USER)
    expect(user('thanhvien21@example.invalid')).toBeUndefined()
    expect(repo().find('provider_profiles', row => row.user_id === PROVIDER_USER)!.village_id).toBe(PHU_VINH)
    expect(await productionLogin(EMAILS.provider, passwordOf(result, EMAILS.provider))).toMatchObject({ ok: true })

    expect(user(EMAILS.ubnd)!.user_id).toBe(UBND_USER)
    expect(repo().find('ubnd_village_assignments', row => row.ubnd_user_id === UBND_USER)!.village_id).toBe(PHU_VINH)
    expect(await productionLogin(EMAILS.ubnd, passwordOf(result, EMAILS.ubnd))).toMatchObject({ ok: true, path: '/admin/providers' })
  })

  it('a re-run without --reset-passwords changes nothing and prints no password; old passwords keep working', async () => {
    const first = await run()
    const before = repo().snapshot(TABLES)
    const second = await run()
    expect(second.credentials).toEqual([])
    expect(Object.values(second.outcomes)).toEqual(['unchanged', 'unchanged', 'unchanged', 'unchanged'])
    expect(repo().snapshot(TABLES)).toEqual(before)
    expect(await productionLogin(EMAILS.provider, passwordOf(first, EMAILS.provider))).toMatchObject({ ok: true })
  })

  it('--reset-passwords sets new passwords for all four and revokes their sessions', async () => {
    const first = await run()
    const ids = Object.values(EMAILS).map(email => user(email)!.user_id)
    ids.forEach(openSession)
    const second = await run({ resetPasswords: true })
    expect(second.credentials).toHaveLength(4)
    // Checked before any login below: a login opens a new session.
    for (const id of ids) expect(repo().all('sessions').filter(row => row.user_id === id && !row.revoked_at)).toHaveLength(0)
    for (const email of Object.values(EMAILS)) {
      expect(passwordOf(second, email)).not.toBe(passwordOf(first, email))
      expect(await productionLogin(email, passwordOf(first, email))).toMatchObject({ ok: false })
      expect(await productionLogin(email, passwordOf(second, email))).toMatchObject({ ok: true })
    }
    expect(repo().all('user_accounts').filter(row => Object.values(EMAILS).includes(row.email))).toHaveLength(4)
  })
})

// PROD dry-run 2026-11-10 stopped with "Verified Provider in Phú Vinh is ambiguous (3 found)" (nothing written).
// Human request (linhkhanh-vu): optional HAB_LECTURER_PROVIDER_EMAIL picks exactly that user (exists, Active, Local
// Provider, profile Verified and in HAB_LECTURER_VILLAGE, else stop); without it, an ambiguous village stops and lists the
// candidates (email, business name, number of Experiences); same for UBND; the dry run says which user was selected and why.
describe('db:set-test-passwords --lecturer | choosing the Provider / UBND user', () => {
  const CHUONG_PROVIDER = '867719ea' // Xưởng thủ công Chuông (thanhvien22), moved into Phú Vinh to make it ambiguous
  const VAN_PHUC_UBND = 'thanhvien2@example.invalid'
  const crowd = () => {
    repo().update('provider_profiles', row => row.provider_id.startsWith(CHUONG_PROVIDER), { village_id: PHU_VINH })
    const extraUbnd = repo().find('user_accounts', row => row.email === VAN_PHUC_UBND)!
    repo().insert('ubnd_village_assignments', { ...repo().all('ubnd_village_assignments')[0], ubnd_user_id: extraUbnd.user_id, village_id: PHU_VINH })
  }
  const choose = { HAB_LECTURER_PROVIDER_EMAIL: 'thanhvien21@example.invalid', HAB_LECTURER_UBND_EMAIL: 'thanhvien3@example.invalid' }
  const message = async (env: Record<string, string>) => { try { await run({ dryRun: true }, env); return '' } catch (error) { return String((error as Error).message) } }

  beforeEach(() => { repo().reset(); writes.insert.mockClear(); writes.update.mockClear() })

  it('without the variable, an ambiguous village stops and lists each candidate: email, business name, number of Experiences', async () => {
    crowd()
    const text = await message(ENV)
    expect(text).toMatch(/ambiguous/)
    expect(text).toContain('HAB_LECTURER_PROVIDER_EMAIL')
    expect(text).toContain('thanhvien21@example.invalid — Xưởng thủ công Phú Vinh — 1 Experience')
    expect(text).toContain('thanhvien22@example.invalid — Xưởng thủ công Chuông — 1 Experience')
  })

  it('an ambiguous UBND assignment stops the same way and lists the UBND users', async () => {
    crowd()
    const text = await message({ ...ENV, HAB_LECTURER_PROVIDER_EMAIL: choose.HAB_LECTURER_PROVIDER_EMAIL })
    expect(text).toMatch(/UBND .*ambiguous/)
    expect(text).toContain('HAB_LECTURER_UBND_EMAIL')
    expect(text).toContain('thanhvien3@example.invalid')
    expect(text).toContain(VAN_PHUC_UBND)
  })

  it('the explicit emails select exactly those users, and the dry run says which and why while writing nothing', async () => {
    crowd()
    const before = repo().snapshot(TABLES)
    const { plan, lines } = await run({ dryRun: true }, { ...ENV, ...choose })
    expect(plan.provider).toMatchObject({ user_id: PROVIDER_USER, from: 'thanhvien21@example.invalid', to: EMAILS.provider })
    expect(plan.ubnd).toMatchObject({ user_id: UBND_USER, from: 'thanhvien3@example.invalid', to: EMAILS.ubnd })
    const text = lines.join('\n')
    expect(text).toMatch(/Provider selected: thanhvien21@example\.invalid \(40ed08b5-27a5-55b4-aea3-e8e80352ee76\), Xưởng thủ công Phú Vinh, 1 Experience — HAB_LECTURER_PROVIDER_EMAIL/)
    expect(text).toMatch(/UBND selected: thanhvien3@example\.invalid \(adcd99a2-ef24-5895-9a4e-59256bb1a23f\) — HAB_LECTURER_UBND_EMAIL/)
    expect(writes.insert).not.toHaveBeenCalled()
    expect(writes.update).not.toHaveBeenCalled()
    expect(repo().snapshot(TABLES)).toEqual(before)
  })

  it('without the variables and one candidate each, the dry run says it was the only one', async () => {
    const text = (await run({ dryRun: true })).lines.join('\n')
    expect(text).toMatch(/Provider selected: thanhvien21@example\.invalid .* — only Verified Provider in Phú Vinh/)
    expect(text).toMatch(/UBND selected: thanhvien3@example\.invalid .* — only UBND user assigned to Phú Vinh/)
  })

  it('an explicit Provider email in another village, not Verified, not Active, not a Provider or unknown stops', async () => {
    expect(await message({ ...ENV, HAB_LECTURER_PROVIDER_EMAIL: 'thanhvien20@example.invalid' })).toMatch(/not in Phú Vinh/)
    expect(await message({ ...ENV, HAB_LECTURER_PROVIDER_EMAIL: 'thanhvien3@example.invalid' })).toMatch(/not a Local Provider/)
    expect(await message({ ...ENV, HAB_LECTURER_PROVIDER_EMAIL: 'nobody@example.invalid' })).toMatch(/No user with email nobody@example\.invalid/)
    repo().update('provider_profiles', row => row.user_id === PROVIDER_USER, { verification_status: 'Suspended' })
    expect(await message({ ...ENV, HAB_LECTURER_PROVIDER_EMAIL: 'thanhvien21@example.invalid' })).toMatch(/not Verified/)
    repo().reset()
    repo().update('user_accounts', row => row.user_id === PROVIDER_USER, { account_status: 'Disabled' })
    expect(await message({ ...ENV, HAB_LECTURER_PROVIDER_EMAIL: 'thanhvien21@example.invalid' })).toMatch(/not Active/)
  })

  it('an explicit UBND email for another village stops', async () => {
    expect(await message({ ...ENV, HAB_LECTURER_UBND_EMAIL: VAN_PHUC_UBND })).toMatch(/not assigned to Phú Vinh/)
  })

  it('after the real run, a re-run with the variables still set finds the renamed users and changes nothing', async () => {
    crowd()
    await run({}, { ...ENV, ...choose })
    const before = repo().snapshot(TABLES)
    const again = await run({}, { ...ENV, ...choose })
    expect(again.credentials).toEqual([])
    expect(repo().snapshot(TABLES)).toEqual(before)
    expect(again.lines.join('\n')).toMatch(/Provider selected: provider-tester@example\.invalid .* — already provider-tester/)
  })
})
