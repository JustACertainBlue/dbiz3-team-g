// scripts/db/dev-seed-pending-reviews.mjs: the data it builds (no database). The rows are also loaded into the
// fixture repository and read by the same code the review screens use, so the demo data is known to show up.
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEV_PROJECT_REF, assertDevTarget, buildDemoAdminData, buildPendingReviewData, demoAdminPlan, pickDemoVillages, undoDependants, undoOps, validateUndoFile,
} from '../../scripts/db/dev-seed-pending-reviews.mjs'
import { demoRepository } from '../../src/lib/demo/json-repository'
import { demoSessionContextFor } from '../../src/lib/auth/session'
import type { SessionContext } from '../../src/lib/auth/session'
import { loadReviewQueue } from '../../src/lib/adm/v3-loaders'

const PASSWORD = 'Dev#Seed-2026-pw'
const HASH = '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ0123' // stands for bcrypt(PASSWORD); the builder never sees the plain text
const NOW = new Date('2026-11-21T03:00:00Z')
const repo = () => demoRepository()
const asFixture = (value: unknown) => value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)

function build(villages = [{ village_id: 'v-a', name: 'Làng A', craft_type: 'Ceramics' }, { village_id: 'v-b', name: 'Làng B', craft_type: 'Woodcarving' }]) {
  let n = 0
  return buildPendingReviewData({ now: NOW, passwordHash: HASH, hdtUserId: 'hdt-1', villages, newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}` })
}
const rows = (data: ReturnType<typeof build>, table: string) => data.ops.filter((op: any) => op.table === table).map((op: any) => op.row)

describe('assertDevTarget', () => {
  const url = (ref: string) => `postgresql://hab_app.${ref}:secret-pw@aws-0-x.pooler.supabase.com:5432/postgres`
  it('accepts the DEV project only', () => {
    expect(assertDevTarget({ DATABASE_APP_URL: url(DEV_PROJECT_REF) })).toBe(DEV_PROJECT_REF)
    expect(DEV_PROJECT_REF).toBe('jfrpnffknjpgmkyquxql')
  })
  it('stops for another ref (PROD included), a missing URL, and never echoes the URL', () => {
    for (const env of [{ DATABASE_APP_URL: url('pdeioligjeksgfnodgzs') }, { DATABASE_APP_URL: url('someotherprojectref') }, {}, { DATABASE_APP_URL: 'not a url' }]) {
      let message = ''
      try { assertDevTarget(env as any) } catch (error) { message = (error as Error).message }
      expect(message).not.toBe('')
      expect(message).not.toContain('secret-pw')
    }
  })
})

describe('CLI order', () => {
  it('loads the env files before the DEV target check, and the target check before any connection or hashing', () => {
    const source = readFileSync('scripts/db/dev-seed-pending-reviews.mjs', 'utf8')
    const at = (needle: string) => source.indexOf(needle)
    expect(at('loadEnvConfig(envDir)')).toBeGreaterThan(-1)
    expect(at('loadEnvConfig(envDir)')).toBeLessThan(at('assertDevTarget(process.env)'))
    expect(at('assertDevTarget(process.env)')).toBeLessThan(at("import('bcryptjs')"))
    expect(at('assertDevTarget(process.env)')).toBeLessThan(at("connection('application')"))
  })
  it('reads the env files of the directory the command was run from when it has a .env.local, else those of the repository', () => {
    const source = readFileSync('scripts/db/dev-seed-pending-reviews.mjs', 'utf8')
    expect(source).toMatch(/const envDir = existsSync\(join\(runDir, '\.env\.local'\)\) \? runDir : repoRoot/)
    expect(source).toContain('const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), \'..\', \'..\')')
  })
  it('the missing-password message names the env directory (never a value)', () => {
    const source = readFileSync('scripts/db/dev-seed-pending-reviews.mjs', 'utf8')
    expect(source).toContain('Env directory used: ${envDir}')
    expect(source).not.toMatch(/\$\{password\}/)
  })
  it('defers the provider version foreign keys right after BEGIN (they are DEFERRABLE, but a migration made them INITIALLY IMMEDIATE)', () => {
    const source = readFileSync('scripts/db/dev-seed-pending-reviews.mjs', 'utf8')
    expect(source.indexOf("query('BEGIN')")).toBeLessThan(source.indexOf("query('SET CONSTRAINTS ALL DEFERRED')"))
    expect(source.indexOf("query('SET CONSTRAINTS ALL DEFERRED')")).toBeLessThan(source.indexOf('db.insert(op.table, op.row)'))
  })
  it('database errors print table and constraint names but never error.detail', () => {
    const source = readFileSync('scripts/db/dev-seed-pending-reviews.mjs', 'utf8')
    expect(source).toContain('error.constraint')
    expect(source).not.toContain('error.detail')
  })
})

describe('buildPendingReviewData: Agencies', () => {
  const data = build()
  it('four registrations: two waiting, more information asked, rejected', () => {
    const requests = rows(data, 'agency_registration_requests')
    expect(requests.map((r: any) => r.current_status)).toEqual(['Pending Approval', 'Pending Approval', 'Pending Approval', 'Rejected'])
    const accounts = rows(data, 'user_accounts').filter((r: any) => r.role_code === 'Tour_Agency')
    expect(accounts.map((r: any) => r.account_status)).toEqual(['Pending Approval', 'Pending Approval', 'Pending Approval', 'Rejected'])
    const reviews = rows(data, 'agency_review_records')
    expect(reviews.map((r: any) => r.decision)).toEqual(['Request More Information', 'Reject'])
    for (const review of reviews) {
      expect(String(review.comments).trim().length).toBeGreaterThan(10)
      expect(review.hdt_user_id).toBe('hdt-1')
      expect(review.major_change_id).toBeNull()
    }
    expect(reviews[0].registration_request_id).toBe(requests[2].registration_request_id)
    expect(reviews[1].registration_request_id).toBe(requests[3].registration_request_id)
  })
  it('each registration has its submission, profile and certificate record; synthetic tax ids differ', () => {
    expect(rows(data, 'registration_submission_versions')).toHaveLength(4)
    expect(rows(data, 'agency_profiles')).toHaveLength(4)
    expect(rows(data, 'registration_documents')).toHaveLength(4)
    expect(rows(data, 'stored_files')).toHaveLength(4)
    const tax = rows(data, 'registration_submission_versions').map((r: any) => r.tax_id)
    expect(new Set(tax).size).toBe(4)
    for (const t of tax) expect(t).toMatch(/^[0-9]{10}$/)
    expect(rows(data, 'registration_resubmission_tokens')).toHaveLength(0)
  })
})

describe('buildPendingReviewData: workshops', () => {
  const data = build()
  it('two workshops waiting for UBND, in two different villages', () => {
    const profiles = rows(data, 'provider_profiles')
    expect(profiles).toHaveLength(2)
    expect(profiles.map((p: any) => p.verification_status)).toEqual(['Pending Verification', 'Pending Verification'])
    expect(new Set(profiles.map((p: any) => p.village_id))).toEqual(new Set(['v-a', 'v-b']))
    const versions = rows(data, 'provider_profile_versions')
    for (const v of versions) {
      expect(v.version_status).toBe('Pending Verification')
      for (const field of ['business_registration_number', 'business_name', 'craft_type', 'artisan_names', 'location_address', 'contact_information', 'submitted_at']) expect(v[field]).not.toBeNull()
      expect(['Ceramics', 'Silk/Textile', 'Woodcarving', 'Food/Culinary', 'Metalwork', 'Paper/Painting', 'Other']).toContain(v.craft_type)
      expect(v.published_at).toBeNull()
    }
  })
  it('refuses fewer than two villages', () => {
    expect(() => build([{ village_id: 'v-a', name: 'A', craft_type: 'Ceramics' }])).toThrow(/two villages/i)
  })
})

describe('buildPendingReviewData: safety', () => {
  const data = build()
  it('only fictional @example.invalid emails, unique ids, hash from the caller, no plain password', () => {
    const emails = rows(data, 'user_accounts').map((r: any) => r.email)
    expect(emails).toHaveLength(6)
    for (const email of emails) expect(email).toMatch(/@example\.invalid$/)
    expect(new Set(emails).size).toBe(6)
    for (const user of rows(data, 'user_accounts')) { expect(user.password_hash).toBe(HASH); expect(user.must_change_password).toBe(false) }
    expect(JSON.stringify(data)).not.toContain(PASSWORD)
    const ids = data.ops.map((op: any) => JSON.stringify(op.key))
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('parents are inserted before the rows that reference them', () => {
    const seen = new Set<string>()
    const fk: Record<string, Array<[string, string]>> = {
      agency_registration_requests: [['agency_user_id', 'user_accounts.user_id']], agency_profiles: [['user_id', 'user_accounts.user_id'], ['registration_request_id', 'agency_registration_requests.registration_request_id']],
      registration_submission_versions: [['registration_request_id', 'agency_registration_requests.registration_request_id']],
      stored_files: [['uploaded_by', 'user_accounts.user_id']], registration_documents: [['file_id', 'stored_files.file_id'], ['registration_request_id', 'agency_registration_requests.registration_request_id']],
      agency_review_records: [['registration_request_id', 'agency_registration_requests.registration_request_id']],
      account_status_history: [['user_id', 'user_accounts.user_id']],
      provider_profiles: [['user_id', 'user_accounts.user_id']], provider_profile_versions: [['provider_id', 'provider_profiles.provider_id']],
    }
    for (const op of data.ops as any[]) {
      for (const [column, target] of fk[op.table] ?? []) {
        if (op.row[column] === null || op.row[column] === 'hdt-1') continue
        expect(seen.has(`${target}=${op.row[column]}`), `${op.table}.${column} references a row inserted later`).toBe(true)
      }
      for (const [column, value] of Object.entries(op.key)) seen.add(`${op.table}.${column}=${value}`)
    }
  })
  it('undo deletes in reverse order using only the keys', () => {
    const undo = undoOps(data.ops)
    expect(undo).toHaveLength(data.ops.length)
    expect(undo[0]).toEqual({ table: data.ops[data.ops.length - 1].table, key: data.ops[data.ops.length - 1].key })
    expect(JSON.stringify(undo)).not.toContain(HASH)
  })
  it('the summary lists names and emails to create', () => {
    expect(data.summary).toHaveLength(6)
    expect(data.summary.map((s: any) => s.status)).toEqual(['Chờ duyệt', 'Chờ duyệt', 'Cần bổ sung', 'Bị từ chối', 'Chờ UBND duyệt', 'Chờ UBND duyệt'])
  })
})

describe('pickDemoVillages', () => {
  it('two active villages that have an active UBND, sorted by name', () => {
    const villages = [{ village_id: 'v1', name: 'Zeta', is_active: 'true' }, { village_id: 'v2', name: 'Alpha', is_active: 'true' }, { village_id: 'v3', name: 'Beta', is_active: 'false' }, { village_id: 'v4', name: 'Gamma', is_active: 'true' }]
    const assignments = [{ ubnd_user_id: 'u1', village_id: 'v1' }, { ubnd_user_id: 'u2', village_id: 'v2' }, { ubnd_user_id: 'u3', village_id: 'v3' }]
    const users = [{ user_id: 'u1', account_status: 'Active' }, { user_id: 'u2', account_status: 'Active' }, { user_id: 'u3', account_status: 'Active' }]
    expect(pickDemoVillages({ villages, assignments, users }).map((v: any) => v.village_id)).toEqual(['v2', 'v1'])
  })
  it('stops when fewer than two qualify', () => {
    expect(() => pickDemoVillages({ villages: [{ village_id: 'v1', name: 'A', is_active: 'true' }], assignments: [{ ubnd_user_id: 'u1', village_id: 'v1' }], users: [{ user_id: 'u1', account_status: 'Active' }] })).toThrow(/two villages/i)
  })
})

describe('the script no longer touches existing accounts', () => {
  const source = readFileSync('scripts/db/dev-seed-pending-reviews.mjs', 'utf8')
  it('has no admin password reset', () => {
    expect(source).not.toContain('reset-admin-passwords')
    expect(source).not.toContain('planAdminPasswordReset')
    expect(source).not.toMatch(/UPDATE public\./)
    expect(source).not.toMatch(/db\.update\(/)
  })
})

describe('buildDemoAdminData (--create-demo-admins)', () => {
  const village = { village_id: 'v-bt', name: 'Bát Tràng' }
  let n = 0
  const data = buildDemoAdminData({ now: NOW, passwordHash: HASH, hdtUserId: 'hdt-1', village, newId: () => `20000000-0000-4000-8000-${String(++n).padStart(12, '0')}` })
  it('one HDT of the Sở Du lịch and one UBND, both fictional, Active, with the caller\'s hash and no forced change', () => {
    const users = data.ops.filter((op: any) => op.table === 'user_accounts').map((op: any) => op.row)
    expect(users.map((u: any) => [u.role_code, u.admin_type, u.account_status])).toEqual([['ADMIN', 'HDT', 'Active'], ['ADMIN', 'UBND', 'Active']])
    for (const u of users) { expect(u.email).toMatch(/^demo-[a-z-]+@example\.invalid$/); expect(u.password_hash).toBe(HASH); expect(u.must_change_password).toBe(false); expect(u.full_name).toContain('(mẫu)') }
    expect(JSON.stringify(data)).not.toContain(PASSWORD)
    expect(data.summary.map((s: any) => s.email)).toEqual(['demo-hdt-so-du-lich@example.invalid', 'demo-ubnd-bat-trang@example.invalid'])
  })
  it('the UBND is assigned to the village through ubnd_village_assignments, by the seed HDT, inserted after its user', () => {
    const ops = data.ops as any[]
    const user = ops.find(op => op.table === 'user_accounts' && op.row.admin_type === 'UBND')
    const index = ops.findIndex(op => op.table === 'ubnd_village_assignments')
    expect(index).toBeGreaterThan(ops.indexOf(user))
    expect(ops[index].row).toMatchObject({ ubnd_user_id: user.row.user_id, village_id: 'v-bt', assigned_by: 'hdt-1' })
    expect(ops[index].key).toEqual({ ubnd_user_id: user.row.user_id })
    expect(ops).toHaveLength(3)
  })
  it('undo of the admins is valid for validateUndoFile', () => {
    const file = { kind: 'dev-seed-pending-reviews', ref: DEV_PROJECT_REF, ops: undoOps(data.ops) }
    expect(validateUndoFile(file)).toHaveLength(3)
  })
})

describe('demoAdminPlan: no duplicates', () => {
  it('creates only the admins whose email does not exist yet', () => {
    expect(demoAdminPlan([]).create).toEqual(['hdt', 'ubnd'])
    expect(demoAdminPlan(['demo-hdt-so-du-lich@example.invalid']).create).toEqual(['ubnd'])
    expect(demoAdminPlan(['DEMO-UBND-BAT-TRANG@example.invalid', 'demo-hdt-so-du-lich@example.invalid']).create).toEqual([])
  })
  it('buildDemoAdminData builds only what the plan asks for', () => {
    const only = buildDemoAdminData({ now: NOW, passwordHash: HASH, hdtUserId: 'hdt-1', village: { village_id: 'v-bt', name: 'Bát Tràng' }, create: ['hdt'] })
    expect(only.ops.map((op: any) => op.table)).toEqual(['user_accounts'])
    expect(buildDemoAdminData({ now: NOW, passwordHash: HASH, hdtUserId: 'hdt-1', village: { village_id: 'v-bt', name: 'Bát Tràng' }, create: [] }).ops).toEqual([])
  })
})

describe('undoDependants: rows other code writes after the load (reviews, logins) that would block the delete', () => {
  const ops = [
    { table: 'user_accounts', key: { user_id: 'u1' } }, { table: 'user_accounts', key: { user_id: 'u2' } },
    { table: 'agency_registration_requests', key: { registration_request_id: 'r1' } },
    { table: 'provider_profiles', key: { provider_id: 'p1' } },
    { table: 'agency_profiles', key: { agency_id: 'a1' } },
  ]
  const deps = undoDependants(ops)
  const has = (table: string, column: string, value: string) => deps.some((d: any) => d.table === table && d.column === column && d.value === value)
  it('for each user: sessions, notifications, audit logs, reset tokens, status history, and the reviews the user wrote', () => {
    for (const u of ['u1', 'u2']) {
      expect(has('sessions', 'user_id', u)).toBe(true)
      expect(has('notifications', 'recipient_user_id', u)).toBe(true)
      expect(has('audit_logs', 'actor_user_id', u)).toBe(true)
      expect(has('password_reset_tokens', 'user_id', u)).toBe(true)
      expect(has('account_status_history', 'user_id', u)).toBe(true)
      expect(has('account_status_history', 'changed_by', u)).toBe(true)
      expect(has('agency_review_records', 'hdt_user_id', u)).toBe(true)
      expect(has('provider_verification_reviews', 'reviewer_user_id', u)).toBe(true)
    }
  })
  it('for each registration request and workshop: their tokens, challenges and reviews', () => {
    expect(has('registration_resubmission_tokens', 'registration_request_id', 'r1')).toBe(true)
    expect(has('registration_otp_challenges', 'registration_request_id', 'r1')).toBe(true)
    expect(has('agency_review_records', 'registration_request_id', 'r1')).toBe(true)
    expect(has('provider_verification_reviews', 'provider_id', 'p1')).toBe(true)
  })
  it('nothing outside those keys: every criterion is one of the listed ids', () => {
    expect(deps.every((d: any) => ['u1', 'u2', 'r1', 'p1'].includes(d.value))).toBe(true)
  })
  it('the CLI runs the dependants before the listed deletes', () => {
    const source = readFileSync('scripts/db/dev-seed-pending-reviews.mjs', 'utf8')
    expect(source.indexOf('undoDependants(ops)')).toBeGreaterThan(-1)
    expect(source.indexOf('undoDependants(ops)')).toBeLessThan(source.indexOf('removed += await db.remove(op.table, op.key)'))
  })
})

describe('where files go and how undo behaves', () => {
  const source = readFileSync('scripts/db/dev-seed-pending-reviews.mjs', 'utf8')
  it('the undo file goes to the directory the command was run from, resolved before the script changes to the repository root', () => {
    expect(source).toContain('const runDir = process.cwd()')
    expect(source.indexOf('const runDir = process.cwd()')).toBeLessThan(source.indexOf('process.chdir('))
    expect(source).toContain("join(runDir, '.demo-data', `dev-seed-undo-")
    expect(source).toContain('resolve(runDir, undoFile)')
  })
  it('undo removes sessions and other rows written for the users it deletes before deleting them', () => {
    expect(source.indexOf('undoDependants(ops)')).toBeLessThan(source.indexOf('removed += await db.remove(op.table, op.key)'))
  })
})

describe('the built data shows up on the review screens (fixture repository, real loaders)', () => {
  beforeEach(() => repo().reset())
  async function seed() {
    const hdt = repo().find('user_accounts', r => r.email === 'thanhvien9@example.invalid')!
    const villages = pickDemoVillages({ villages: repo().all('villages'), assignments: repo().all('ubnd_village_assignments'), users: repo().all('user_accounts') })
    let n = 0
    const data = buildPendingReviewData({ now: new Date(), passwordHash: HASH, hdtUserId: hdt.user_id, villages, newId: () => `10000000-0000-4000-8000-${String(++n).padStart(12, '0')}` })
    for (const op of data.ops as any[]) repo().insert(op.table, Object.fromEntries(Object.entries(op.row).map(([k, v]) => [k, asFixture(v)])))
    return { data, villages }
  }
  it('HDT: four Agency rows (two waiting, one needing more information, one rejected) and both workshops view only', async () => {
    const { data } = await seed()
    const hdt = await demoSessionContextFor('hdt')
    const { rows: queue } = await loadReviewQueue(hdt)
    const names = (kind: string) => queue.filter(r => r.kind === kind).map(r => r.name)
    for (const item of data.summary.filter((s: any) => s.kind === 'agency')) expect(queue.map(r => r.name)).toContain(item.name)
    const mine = queue.filter(r => data.summary.some((s: any) => s.kind === 'agency' && s.name === r.name))
    expect(mine.filter(r => !r.processed).map(r => r.statusLabel)).toEqual(['Chờ duyệt', 'Chờ duyệt'])
    expect(mine.filter(r => r.processed).map(r => r.statusLabel).sort()).toEqual(['Cần bổ sung', 'Từ chối'])
    for (const item of data.summary.filter((s: any) => s.kind === 'workshop')) {
      const row = queue.find(r => r.name === item.name)!
      expect(row.processed).toBe(false)
      expect(row.canDecide).toBe(false)
    }
    expect(names('workshop').length).toBeGreaterThanOrEqual(2)
  })
  it('UBND of each village: its workshop waits and can be decided', async () => {
    const { data, villages } = await seed()
    for (const village of villages) {
      const ubndId = repo().find('ubnd_village_assignments', r => r.village_id === village.village_id)!.ubnd_user_id
      const session = { authenticated: true, userId: ubndId, role: 'ADMIN', adminType: 'UBND', agencyId: null, providerId: null, assignedVillageId: village.village_id, permissions: ['manage_users'], dataScope: null } as unknown as SessionContext
      const { rows: queue } = await loadReviewQueue(session)
      const mine = data.summary.find((s: any) => s.kind === 'workshop' && s.village_id === village.village_id)!
      const row = queue.find(r => r.name === mine.name)!
      expect(row).toMatchObject({ processed: false, canDecide: true })
      expect(queue.some(r => r.kind !== 'workshop')).toBe(false)
    }
  })
  it('the demo UBND of Bát Tràng sees the Bát Tràng workshop waiting and can decide it', async () => {
    const { data, villages } = await seed()
    const batTrang = repo().find('villages', r => r.name === 'Bát Tràng')!
    const hdt = repo().find('user_accounts', r => r.email === 'thanhvien9@example.invalid')!
    const admins = buildDemoAdminData({ now: new Date(), passwordHash: HASH, hdtUserId: hdt.user_id, village: { village_id: batTrang.village_id, name: batTrang.name } })
    for (const op of admins.ops as any[]) repo().insert(op.table, Object.fromEntries(Object.entries(op.row).map(([k, v]) => [k, asFixture(v)])))
    const ubnd = (admins.ops as any[]).find(op => op.table === 'user_accounts' && op.row.admin_type === 'UBND').row
    const session = { authenticated: true, userId: ubnd.user_id, role: 'ADMIN', adminType: 'UBND', agencyId: null, providerId: null, assignedVillageId: batTrang.village_id, permissions: ['manage_users'], dataScope: null } as unknown as SessionContext
    const { rows: queue } = await loadReviewQueue(session)
    const workshop = data.summary.find((s: any) => s.kind === 'workshop' && s.village_id === batTrang.village_id)
    if (workshop) expect(queue.find(r => r.name === workshop.name)).toMatchObject({ processed: false, canDecide: true })
    else expect(villages.some((v: any) => v.village_id === batTrang.village_id)).toBe(false) // Bát Tràng not among the two picked in this fixture
  })
})
