// scripts/db/dev-seed-pending-reviews.mjs: the data it builds (no database). The rows are also loaded into the
// fixture repository and read by the same code the review screens use, so the demo data is known to show up.
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEV_PROJECT_REF, ADMIN_RESET_EMAIL_NOTE, assertDevTarget, buildPendingReviewData, pickDemoVillages, planAdminPasswordReset, undoOps,
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
    for (const env of [{ DATABASE_APP_URL: url('euxclvszgiknjosbwjya') }, { DATABASE_APP_URL: url('someotherprojectref') }, {}, { DATABASE_APP_URL: 'not a url' }]) {
      let message = ''
      try { assertDevTarget(env as any) } catch (error) { message = (error as Error).message }
      expect(message).not.toBe('')
      expect(message).not.toContain('secret-pw')
    }
  })
})

describe('buildPendingReviewData: Agencies', () => {
  const data = build()
  it('three registrations: waiting, more information asked, rejected', () => {
    const requests = rows(data, 'agency_registration_requests')
    expect(requests.map((r: any) => r.current_status)).toEqual(['Pending Approval', 'Pending Approval', 'Rejected'])
    const accounts = rows(data, 'user_accounts').filter((r: any) => r.role_code === 'Tour_Agency')
    expect(accounts.map((r: any) => r.account_status)).toEqual(['Pending Approval', 'Pending Approval', 'Rejected'])
    const reviews = rows(data, 'agency_review_records')
    expect(reviews.map((r: any) => r.decision)).toEqual(['Request More Information', 'Reject'])
    for (const review of reviews) {
      expect(String(review.comments).trim().length).toBeGreaterThan(10)
      expect(review.hdt_user_id).toBe('hdt-1')
      expect(review.major_change_id).toBeNull()
    }
    expect(reviews[0].registration_request_id).toBe(requests[1].registration_request_id)
    expect(reviews[1].registration_request_id).toBe(requests[2].registration_request_id)
  })
  it('each registration has its submission, profile and certificate record; synthetic tax ids differ', () => {
    expect(rows(data, 'registration_submission_versions')).toHaveLength(3)
    expect(rows(data, 'agency_profiles')).toHaveLength(3)
    expect(rows(data, 'registration_documents')).toHaveLength(3)
    expect(rows(data, 'stored_files')).toHaveLength(3)
    const tax = rows(data, 'registration_submission_versions').map((r: any) => r.tax_id)
    expect(new Set(tax).size).toBe(3)
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
    expect(emails).toHaveLength(5)
    for (const email of emails) expect(email).toMatch(/@example\.invalid$/)
    expect(new Set(emails).size).toBe(5)
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
    expect(data.summary).toHaveLength(5)
    expect(data.summary.map((s: any) => s.status)).toEqual(['Chờ duyệt', 'Cần bổ sung', 'Bị từ chối', 'Chờ UBND duyệt', 'Chờ UBND duyệt'])
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

describe('planAdminPasswordReset', () => {
  it('lists Active ADMIN accounts (HDT and UBND) by email, skips Disabled and other roles, carries no hash', () => {
    const plan = planAdminPasswordReset([
      { user_id: '1', email: 'a@example.invalid', role_code: 'ADMIN', admin_type: 'HDT', account_status: 'Active', password_hash: 'secret-hash-1' },
      { user_id: '2', email: 'b@example.invalid', role_code: 'ADMIN', admin_type: 'UBND', account_status: 'Active', password_hash: 'secret-hash-2' },
      { user_id: '3', email: 'c@example.invalid', role_code: 'ADMIN', admin_type: 'UBND', account_status: 'Disabled', password_hash: 'x' },
      { user_id: '4', email: 'd@example.invalid', role_code: 'Tour_Agency', admin_type: null, account_status: 'Approved', password_hash: 'x' },
    ])
    expect(plan.targets.map((t: any) => t.email)).toEqual(['a@example.invalid', 'b@example.invalid'])
    expect(plan.skipped).toBe(1)
    expect(JSON.stringify(plan)).not.toContain('secret-hash')
    expect(typeof ADMIN_RESET_EMAIL_NOTE).toBe('string')
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
  it('HDT: three Agency rows (two waiting, one rejected) and both workshops view only', async () => {
    const { data } = await seed()
    const hdt = await demoSessionContextFor('hdt')
    const { rows: queue } = await loadReviewQueue(hdt)
    const names = (kind: string) => queue.filter(r => r.kind === kind).map(r => r.name)
    for (const item of data.summary.filter((s: any) => s.kind === 'agency')) expect(queue.map(r => r.name)).toContain(item.name)
    const mine = queue.filter(r => data.summary.some((s: any) => s.kind === 'agency' && s.name === r.name))
    expect(mine.filter(r => !r.processed)).toHaveLength(2)
    expect(mine.filter(r => r.processed && r.statusLabel === 'Từ chối')).toHaveLength(1)
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
})
