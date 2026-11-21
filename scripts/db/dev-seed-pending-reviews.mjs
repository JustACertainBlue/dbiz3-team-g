// DEV only: demo data for the profile-review flow (screens 18b/18c, 41, 41a) and two NEW demo admin accounts.
//
// Run it from ~/Desktop/dbiz3-devload so every undo file lands in one place:
//   cd ~/Desktop/dbiz3-devload && node ../dbiz3-admin/scripts/db/dev-seed-pending-reviews.mjs [flags]
// (DATABASE_APP_URL and DEV_TEST_PASSWORD are read from that directory's .env.local if it has one; a value already exported in the shell wins.)
//
//   (no flag)                     dry run: writes, then ROLLBACK (default)
//   --apply                       writes for real and saves .demo-data/dev-seed-undo-<time>.json in the directory you ran it from
//   --undo <file>                 deletes exactly the rows listed in an undo file (and the sessions of the users it deletes)
//   --create-demo-admins          also creates two NEW admin accounts: one HDT (Sở Du lịch) and one UBND assigned to Bát Tràng
//   --no-seed                     with --create-demo-admins: only the admins, no review demo rows
//
// Target check first: DATABASE_APP_URL must name the DEV Supabase project (jfrpnffknjpgmkyquxql); any other ref stops the run
// before a connection is opened. The password of every new account comes from DEV_TEST_PASSWORD (same rule as the app), is hashed
// with bcrypt cost 12 like the registration code, never printed and never written to a file. The undo file holds table names
// and primary keys only. The script never changes an existing account (no UPDATE anywhere). An admin account whose email
// already exists is skipped, not duplicated. All names, people and emails are fictional (@example.invalid). No migration, no
// schema change: only tables the code already reads.
import { createHash, randomUUID } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { projectRefFromDatabaseUrl } from './lecturer-accounts.mjs'
import { SEED_HDT_APPROVER, meetsPasswordRule } from './test-accounts.mjs'

export const DEV_PROJECT_REF = 'jfrpnffknjpgmkyquxql'

/** Stops (throws) unless DATABASE_APP_URL names the DEV project. Returns the ref; never includes the URL in a message. */
export function assertDevTarget(env) {
  if (!env.DATABASE_APP_URL) throw new Error('DATABASE_APP_URL is not set. Nothing was changed.')
  let ref
  try { ref = projectRefFromDatabaseUrl(env.DATABASE_APP_URL) } catch (error) { throw new Error(`${error.message}. Nothing was changed.`) }
  if (!ref) throw new Error('Cannot read the Supabase project ref from DATABASE_APP_URL. Nothing was changed.')
  if (ref !== DEV_PROJECT_REF) throw new Error(`DATABASE_APP_URL points to project ref "${ref}", not the DEV project. Stopping. Nothing was changed.`)
  return ref
}

const KEYS = {
  user_accounts: ['user_id'], agency_registration_requests: ['registration_request_id'],
  registration_submission_versions: ['registration_request_id', 'version_no'], agency_profiles: ['agency_id'], stored_files: ['file_id'],
  registration_documents: ['registration_request_id', 'version_no', 'file_id'], agency_review_records: ['review_id'],
  account_status_history: ['history_id'], ubnd_village_assignments: ['ubnd_user_id'], provider_profiles: ['provider_id'], provider_profile_versions: ['provider_id', 'version_no'],
}
export const SEEDED_TABLES = Object.keys(KEYS)

const AGENCIES = [
  { slug: 'cho-duyet', company: 'Công ty Du lịch Hoa Sen Xanh', person: 'Trần Minh Quân (mẫu)', phone: '+84900000101', ageDays: 2, status: 'Pending Approval', label: 'Chờ duyệt' },
  { slug: 'cho-duyet-2', company: 'Công ty Lữ hành Thăng Long Xanh', person: 'Võ Hải Đăng (mẫu)', phone: '+84900000104', ageDays: 1, status: 'Pending Approval', label: 'Chờ duyệt' },
  { slug: 'bo-sung', company: 'Công ty Lữ hành Sông Hồng Mới', person: 'Lê Thu Hà (mẫu)', phone: '+84900000102', ageDays: 5, status: 'Pending Approval', label: 'Cần bổ sung',
    decision: 'Request More Information', decidedDaysAgo: 3, comment: 'Giấy đăng ký kinh doanh bị mờ phần mã số thuế, vui lòng tải lại bản rõ.' },
  { slug: 'tu-choi', company: 'Công ty Du lịch Phố Cũ Việt', person: 'Phạm Quốc Bảo (mẫu)', phone: '+84900000103', ageDays: 9, status: 'Rejected', label: 'Bị từ chối',
    decision: 'Reject', decidedDaysAgo: 7, comment: 'Mã số thuế không khớp với giấy đăng ký kinh doanh đã nộp.' },
]
const WORKSHOPS = [
  { slug: 'xuong-1', business: 'Xưởng Sen Vàng (mẫu)', person: 'Nguyễn Văn Lâm (mẫu)', phone: '+84900000201', ageDays: 1, artisan: 'Nguyễn Văn Lâm (mẫu)', description: 'Xưởng thủ công gia đình (dữ liệu mẫu), nhận đoàn nhỏ trải nghiệm làm sản phẩm thủ công.' },
  { slug: 'xuong-2', business: 'Xưởng Cây Đa (mẫu)', person: 'Đỗ Thị Mai (mẫu)', phone: '+84900000202', ageDays: 4, artisan: 'Đỗ Thị Mai (mẫu)', description: 'Xưởng nghề truyền thống (dữ liệu mẫu), có nghệ nhân hướng dẫn khách tại chỗ.' },
]
export const demoEmail = slug => `demo-review-${slug}@example.invalid`

const taxIdFor = slug => `09${(BigInt(`0x${createHash('sha256').update(`hab-dev-seed-pending:${slug}`).digest('hex').slice(0, 15)}`) % 100000000n).toString().padStart(8, '0')}`
const CRAFTS = ['Ceramics', 'Silk/Textile', 'Woodcarving', 'Food/Culinary', 'Metalwork', 'Paper/Painting', 'Other']

/** Two active villages that have an active UBND, sorted by name. Rows may carry strings (`'true'`) or booleans. */
export function pickDemoVillages({ villages, assignments, users }) {
  const active = value => value === true || value === 'true'
  const activeUsers = new Set(users.filter(user => user.account_status === 'Active').map(user => user.user_id))
  const withUbnd = new Set(assignments.filter(row => activeUsers.has(row.ubnd_user_id)).map(row => row.village_id))
  const picked = villages.filter(village => active(village.is_active) && withUbnd.has(village.village_id))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi')).slice(0, 2)
  if (picked.length < 2) throw new Error('Need two villages with an active UBND account; found fewer. Nothing was changed.')
  return picked.map((village, index) => ({ village_id: village.village_id, name: village.name, craft_type: CRAFTS.includes(village.craft_type) ? village.craft_type : ['Ceramics', 'Woodcarving'][index] }))
}

/**
 * Pure builder: the ordered inserts, their primary keys and a human summary. No database access.
 * @param {{ now: Date, passwordHash: string, hdtUserId: string, villages: Array<{village_id:string,name:string,craft_type?:string}>, newId?: () => string }} input
 */
export function buildPendingReviewData({ now, passwordHash, hdtUserId, villages, newId = randomUUID }) {
  if (!Array.isArray(villages) || villages.length < 2) throw new Error('Need two villages for the workshops.')
  const ops = [], summary = []
  const at = daysAgo => new Date(now.getTime() - daysAgo * 86_400_000).toISOString()
  const add = (table, row) => { ops.push({ table, row, key: Object.fromEntries(KEYS[table].map(column => [column, row[column]])) }); return row }
  const user = (email, role, status, fullName, phone, created) => add('user_accounts', {
    user_id: newId(), email, password_hash: passwordHash, role_code: role, admin_type: null, account_status: status, full_name: fullName,
    title: null, phone, avatar_file_id: null, must_change_password: false, password_changed_at: created, last_login: null, created_at: created, updated_at: created,
  })

  for (const a of AGENCIES) {
    const submitted = at(a.ageDays), decided = a.decidedDaysAgo ? at(a.decidedDaysAgo) : null
    const email = demoEmail(a.slug), taxId = taxIdFor(a.slug)
    const account = user(email, 'Tour_Agency', a.status, a.person, a.phone, submitted)
    const location = { street: `Số ${10 + AGENCIES.indexOf(a)} Phố Mẫu`, ward: 'Hàng Trống', district: 'Hoàn Kiếm', city_province: 'Hà Nội' }
    const contact = { contact_person_name: a.person, phone_number: a.phone, business_email: email }
    const tourTypes = ['Craft Village/Experiential']
    const request = add('agency_registration_requests', {
      registration_request_id: newId(), email, pending_password_hash: null, current_status: a.status, agency_user_id: account.user_id,
      current_version_no: 1, created_at: submitted, updated_at: decided ?? submitted,
    })
    const id = request.registration_request_id
    add('registration_submission_versions', {
      registration_request_id: id, version_no: 1, submitted_at: submitted, submitted_by: account.user_id, full_name: a.person, company_name: a.company,
      company_type: 'Travel Agency', tax_id: taxId, location, contact_information: contact, team_size: 6, tour_types: tourTypes,
    })
    add('agency_profiles', {
      agency_id: newId(), user_id: account.user_id, registration_request_id: id, company_name: a.company, company_type: 'Travel Agency', tax_id: taxId,
      location, description: null, contact_info: contact, team_size: 6, tour_types: tourTypes, created_at: submitted, updated_at: submitted,
    })
    const file = add('stored_files', {
      file_id: newId(), storage_key: '', file_name: 'GiayDKKD_MAU.pdf', media_type: 'application/pdf', file_size_bytes: 1153434,
      width_px: null, height_px: null, uploaded_by: account.user_id, created_at: submitted,
    })
    file.storage_key = `registration-documents/${file.file_id}`
    add('registration_documents', { registration_request_id: id, version_no: 1, file_id: file.file_id, document_type: 'Business Registration Certificate' })
    if (a.decision) add('agency_review_records', {
      review_id: newId(), registration_request_id: id, registration_version_no: 1, major_change_id: null, hdt_user_id: hdtUserId,
      decision: a.decision, comments: a.comment, decided_at: decided,
    })
    if (a.status === 'Rejected') add('account_status_history', {
      history_id: newId(), user_id: account.user_id, from_status: 'Pending Approval', to_status: 'Rejected', changed_by: hdtUserId, changed_at: decided, reason: a.comment,
    })
    summary.push({ kind: 'agency', name: a.company, person: a.person, email, status: a.label, note: a.comment ?? '' })
  }

  WORKSHOPS.forEach((w, index) => {
    const village = villages[index], submitted = at(w.ageDays), email = demoEmail(w.slug)
    const account = user(email, 'Local_Provider', 'Active', w.person, w.phone, submitted)
    const profile = add('provider_profiles', {
      provider_id: newId(), user_id: account.user_id, village_id: village.village_id, current_version_no: 1, published_version_no: null,
      verification_status: 'Pending Verification', created_at: submitted, updated_at: submitted,
    })
    add('provider_profile_versions', {
      provider_id: profile.provider_id, version_no: 1, version_status: 'Pending Verification', business_registration_number: `DEV-DEMO-HKD-${index + 1}`,
      business_name: w.business, craft_type: CRAFTS.includes(village.craft_type) ? village.craft_type : 'Other', artisan_names: [w.artisan],
      location_address: `Thôn nghề (mẫu), ${village.name}, Hà Nội`, description: w.description,
      contact_information: { contact_person_name: w.person, phone_number: w.phone, business_email: email }, booking_conditions: null, submitted_at: submitted, published_at: null,
    })
    summary.push({ kind: 'workshop', name: w.business, person: w.person, email, status: 'Chờ UBND duyệt', village_id: village.village_id, village: village.name, note: '' })
  })
  return { ops, summary }
}

export const DEMO_ADMINS = {
  hdt: { email: 'demo-hdt-so-du-lich@example.invalid', name: 'Hoàng Thị Lan (mẫu)', title: 'Chuyên viên Sở Du lịch (mẫu)', phone: '+84900000301', admin_type: 'HDT', label: 'Sở Du lịch (HDT)' },
  ubnd: { email: 'demo-ubnd-bat-trang@example.invalid', name: 'Vũ Đức Minh (mẫu)', title: 'Cán bộ UBND xã Bát Tràng (mẫu)', phone: '+84900000302', admin_type: 'UBND', label: 'UBND xã Bát Tràng (UBND)' },
}

/** Which demo admins still have to be created, given the emails already in the database (case-insensitive). */
export function demoAdminPlan(existingEmails) {
  const have = new Set(existingEmails.map(email => String(email).toLowerCase()))
  return { create: Object.keys(DEMO_ADMINS).filter(key => !have.has(DEMO_ADMINS[key].email)) }
}

/** Pure builder for the two demo admins; the UBND is assigned to `village` through ubnd_village_assignments. */
export function buildDemoAdminData({ now, passwordHash, hdtUserId, village, newId = randomUUID, create = ['hdt', 'ubnd'] }) {
  const ops = [], summary = []
  const at = now.toISOString()
  const add = (table, row) => { ops.push({ table, row, key: Object.fromEntries(KEYS[table].map(column => [column, row[column]])) }); return row }
  for (const key of create) {
    const d = DEMO_ADMINS[key]
    const user = add('user_accounts', {
      user_id: newId(), email: d.email, password_hash: passwordHash, role_code: 'ADMIN', admin_type: d.admin_type, account_status: 'Active', full_name: d.name,
      title: d.title, phone: d.phone, avatar_file_id: null, must_change_password: false, password_changed_at: at, last_login: null, created_at: at, updated_at: at,
    })
    if (key === 'ubnd') add('ubnd_village_assignments', { ubnd_user_id: user.user_id, village_id: village.village_id, assigned_by: hdtUserId, assigned_at: at })
    summary.push({ kind: 'admin', name: d.label, person: d.name, email: d.email, status: 'Active', village: key === 'ubnd' ? village.name : '' })
  }
  return { ops, summary }
}

/** Reverse-order deletes (table + primary key only) for an undo file. */
export function undoOps(ops) { return [...ops].reverse().map(({ table, key }) => ({ table, key })) }

/**
 * Rows that other code writes about the seeded users, requests and workshops after the load (reviews, notifications, audit logs,
 * logins) and whose foreign keys would block the undo. Only rows that point at a key listed in the undo file are named.
 */
export function undoDependants(ops) {
  const keys = table => ops.filter(op => op.table === table).map(op => Object.values(op.key)[0])
  const out = []
  const add = (table, column, values) => { for (const value of values) out.push({ table, column, value }) }
  const users = keys('user_accounts'), requests = keys('agency_registration_requests'), providers = keys('provider_profiles')
  add('sessions', 'user_id', users)
  add('password_reset_tokens', 'user_id', users)
  add('notifications', 'recipient_user_id', users)
  add('audit_logs', 'actor_user_id', users)
  add('agency_review_records', 'hdt_user_id', users)
  add('provider_verification_reviews', 'reviewer_user_id', users)
  add('account_status_history', 'user_id', users)
  add('account_status_history', 'changed_by', users)
  add('registration_resubmission_tokens', 'registration_request_id', requests)
  add('registration_otp_challenges', 'registration_request_id', requests)
  add('agency_review_records', 'registration_request_id', requests)
  add('provider_verification_reviews', 'provider_id', providers)
  return out
}

/** Validates an undo file read from disk: only seeded tables, only the primary-key columns of each. */
export function validateUndoFile(content) {
  if (!content || content.kind !== 'dev-seed-pending-reviews' || content.ref !== DEV_PROJECT_REF || !Array.isArray(content.ops)) throw new Error('Not an undo file of this script for the DEV project.')
  for (const op of content.ops) {
    const columns = KEYS[op.table]
    if (!columns || Object.keys(op.key ?? {}).sort().join() !== [...columns].sort().join()) throw new Error(`Undo file lists an unexpected table or key (${String(op.table)}).`)
  }
  return content.ops
}

// ---------------------------------------------------------------------------------------------------------------- CLI
const IDENTIFIER = /^[a-z][a-z0-9_]*$/
const quote = name => { if (!IDENTIFIER.test(name)) throw new Error('Invalid identifier'); return `"${name}"` }
const sqlValue = value => (value !== null && typeof value === 'object' ? JSON.stringify(value) : value)
const where = (criteria, start) => {
  const entries = Object.entries(criteria)
  return { sql: entries.map(([key], index) => `${quote(key)} IS NOT DISTINCT FROM $${start + index}`).join(' AND '), values: entries.map(([, value]) => value) }
}
const port = client => ({
  async findAll(table, criteria = {}) {
    const filter = where(criteria, 1)
    return (await client.query(`SELECT * FROM public.${quote(table)}${filter.sql ? ` WHERE ${filter.sql}` : ''}`, filter.values)).rows
  },
  async insert(table, row) {
    const entries = Object.entries(row)
    await client.query(`INSERT INTO public.${quote(table)} (${entries.map(([k]) => quote(k)).join(',')}) VALUES (${entries.map((_, i) => `$${i + 1}`).join(',')})`, entries.map(([, v]) => sqlValue(v)))
  },
  async remove(table, criteria) {
    if (!Object.keys(criteria).length) throw new Error('Unscoped deletes are forbidden')
    const filter = where(criteria, 1)
    return (await client.query(`DELETE FROM public.${quote(table)} WHERE ${filter.sql}`, filter.values)).rowCount
  },
})

async function main(argv) {
  const runDir = process.cwd() // undo files are written to, and --undo paths are resolved against, the directory the command was run from
  const flags = new Set(['--apply', '--undo', '--create-demo-admins', '--no-seed'])
  const undoIndex = argv.indexOf('--undo')
  const undoFile = undoIndex >= 0 ? argv[undoIndex + 1] : null
  const unknown = argv.filter((arg, i) => !flags.has(arg) && !(undoIndex >= 0 && i === undoIndex + 1))
  if (unknown.length) throw new Error(`Unknown option(s): ${unknown.join(' ')}. Nothing was changed.`)
  if (undoIndex >= 0 && !undoFile) throw new Error('--undo needs a file. Nothing was changed.')
  const apply = argv.includes('--apply'), admins = argv.includes('--create-demo-admins'), seed = !argv.includes('--no-seed')
  if (undoFile && (apply || admins)) throw new Error('--undo cannot be combined with --apply or --create-demo-admins. Nothing was changed.')
  if (!seed && !admins) throw new Error('--no-seed is only for --create-demo-admins. Nothing was changed.')

  const { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } = await import('node:fs')
  // The db helpers (TLS certificate path) expect the repository root as the working directory.
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
  process.chdir(repoRoot)
  // Env files: those of the directory the command was run from when it has a .env.local (e.g. ~/Desktop/dbiz3-devload), else the repository's.
  // Variables already set in the shell win. Done before the target check so DATABASE_APP_URL and DEV_TEST_PASSWORD are visible.
  const envDir = existsSync(join(runDir, '.env.local')) ? runDir : repoRoot
  const nextEnv = (await import('@next/env')).default
  nextEnv.loadEnvConfig(envDir)
  const ref = assertDevTarget(process.env) // before any connection

  let hash = null
  if (!undoFile) {
    const password = process.env.DEV_TEST_PASSWORD
    if (!password) throw new Error(`DEV_TEST_PASSWORD is not set. Env directory used: ${envDir} (${existsSync(join(envDir, '.env.local')) ? 'has' : 'no'} .env.local). Add a line DEV_TEST_PASSWORD=... to the .env.local there, or export it in the shell. Nothing was changed.`)
    if (!meetsPasswordRule(password)) throw new Error('DEV_TEST_PASSWORD does not meet the password rule (8–64 chars, upper, lower, digit, special, no space). Nothing was changed.')
    const bcrypt = (await import('bcryptjs')).default
    hash = await bcrypt.hash(password, 12)
  }

  const { connection } = await import('./shared.mjs')
  const client = connection('application')
  console.log(`[dev-seed] target: ${client.host}/${client.database}, project ref ${ref} (DEV). Mode: ${undoFile ? 'UNDO' : apply ? 'APPLY' : 'dry run (will ROLLBACK)'}.`)
  await client.connect()
  const db = port(client)
  let wrote = false, undoPath = null
  try {
    await client.query('BEGIN')
    // provider_profiles.current_version_no points at a version row that needs the profile first; those two FKs are DEFERRABLE.
    await client.query('SET CONSTRAINTS ALL DEFERRED')
    if (undoFile) {
      const ops = validateUndoFile(JSON.parse(readFileSync(resolve(runDir, undoFile), 'utf8')))
      // Rows written about the demo users after the load (a login, a review decision) would block the deletes.
      let dependants = 0
      for (const dep of undoDependants(ops)) dependants += await db.remove(dep.table, { [dep.column]: dep.value }) ?? 0
      if (dependants) console.log(`[dev-seed] undo: ${dependants} dependent rows (sessions, reviews, notifications, audit logs of the demo users) removed first.`)
      let removed = 0
      for (const op of ops) removed += await db.remove(op.table, op.key) ?? 0
      console.log(`[dev-seed] undo: ${removed} of ${ops.length} rows deleted.`)
      await client.query('COMMIT'); return
    }

    const hdt = (await db.findAll('user_accounts', { email: SEED_HDT_APPROVER }))[0]
    if (!hdt) throw new Error(`Seed HDT ${SEED_HDT_APPROVER} not found; needed to record decisions and village assignments. Rolled back.`)
    const allUsers = await db.findAll('user_accounts')
    const emails = new Set(allUsers.map(user => String(user.email).toLowerCase()))
    const ops = [], summary = []

    if (seed) {
      const villages = pickDemoVillages({ villages: await db.findAll('villages'), assignments: await db.findAll('ubnd_village_assignments'), users: allUsers })
      const data = buildPendingReviewData({ now: new Date(), passwordHash: hash, hdtUserId: hdt.user_id, villages })
      const present = data.summary.filter(item => emails.has(item.email))
      if (present.length === data.summary.length) console.log('[dev-seed] review demo data is already loaded: skipped, not duplicated.')
      else if (present.length) throw new Error(`${present[0].email} already exists but the set is incomplete. Undo the earlier load first. Rolled back.`)
      else { ops.push(...data.ops); summary.push(...data.summary) }
    }

    if (admins) {
      const village = (await db.findAll('villages')).find(row => row.name === 'Bát Tràng' && (row.is_active === true || row.is_active === 'true'))
      if (!village) throw new Error('Active village "Bát Tràng" not found. Rolled back.')
      const plan = demoAdminPlan([...emails])
      for (const key of Object.keys(DEMO_ADMINS)) if (!plan.create.includes(key)) console.log(`[dev-seed] ${DEMO_ADMINS[key].email} already exists: skipped, not duplicated.`)
      const data = buildDemoAdminData({ now: new Date(), passwordHash: hash, hdtUserId: hdt.user_id, village: { village_id: village.village_id, name: village.name }, create: plan.create })
      ops.push(...data.ops); summary.push(...data.summary)
    }

    for (const op of ops) await db.insert(op.table, op.row)
    console.log('[dev-seed] rows to create (fictional data):')
    for (const item of summary) console.log(`  - ${item.kind === 'agency' ? 'Agency ' : item.kind === 'workshop' ? 'Workshop' : 'Admin   '} | ${item.name} | ${item.person} | ${item.email} | ${item.status}${item.village ? ` | làng ${item.village}` : ''}`)
    console.log(`[dev-seed] ${ops.length} rows in ${new Set(ops.map(op => op.table)).size} tables.`)
    if (apply && ops.length) {
      mkdirSync(join(runDir, '.demo-data'), { recursive: true }) // git-ignored folder, so undo files never show up as untracked
      undoPath = join(runDir, '.demo-data', `dev-seed-undo-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
      writeFileSync(undoPath, JSON.stringify({ kind: 'dev-seed-pending-reviews', ref, created_at: new Date().toISOString(), ops: undoOps(ops) }, null, 1), { mode: 0o600 })
    }

    if (apply) { await client.query('COMMIT'); wrote = true; console.log(`[dev-seed] APPLIED.${undoPath ? ` Undo file: ${undoPath}` : ' Nothing new to write.'}`) }
    else { await client.query('ROLLBACK'); console.log('[dev-seed] dry run finished: everything was rolled back, nothing was written.') }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    if (undoPath && !wrote) { try { unlinkSync(undoPath) } catch { /* nothing to remove */ } }
    throw error
  } finally { await client.end().catch(() => undefined) }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).catch(async error => {
    const { safeDatabaseError } = await import('./config.mjs')
    // Table and constraint names carry no row values (the driver's detail text would, so it is never printed).
    const where = error?.code && (error.table || error.constraint) ? ` [table=${error.table ?? '?'}, constraint=${error.constraint ?? '?'}]` : ''
    console.error(error?.code ? `${safeDatabaseError(error)}${where}` : `[dev-seed] ${error?.message ?? error}`)
    process.exitCode = 1
  })
}
