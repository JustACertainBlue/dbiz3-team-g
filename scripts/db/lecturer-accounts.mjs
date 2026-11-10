// Lecturer mode of `npm run db:set-test-passwords -- --lecturer [--dry-run] [--reset-passwords]`
// (human decision linhkhanh-vu 2026-11-10; docs/build/deploy-runbook.md §2.1). Four tester logins on one village:
// - agency-tester@example.invalid: new Agency, Approved, company "[Tester] Công ty du lịch" (approved by the seed HDT);
// - hdt-tester@example.invalid: new HDT;
// - provider-tester@example.invalid / ubnd-tester@example.invalid: the email of the village's Verified Provider user and of
//   its UBND user is changed; user ids, profiles and the village assignment stay as they are.
// Passwords are generated here, returned once to the CLI (which prints them to an interactive terminal only) and never
// logged. No database access in this file: the caller passes the port { findOne, findAll, insert, update, transaction }.
import { randomBytes } from 'node:crypto'
import { SEED_HDT_APPROVER, createAgency, createHdt, meetsPasswordRule, setPassword } from './test-accounts.mjs'

export const LECTURER_EMAILS = Object.freeze({
  agency: 'agency-tester@example.invalid', hdt: 'hdt-tester@example.invalid',
  provider: 'provider-tester@example.invalid', ubnd: 'ubnd-tester@example.invalid',
})
const AGENCY_NAMING = { label: '[Tester]', companyName: '[Tester] Công ty du lịch', taxKey: 'lecturer:tester' }
const HDT_FULL_NAME = '[Tester] HDT thử nghiệm'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Supabase project ref from a pooler user (`hab_app.<ref>`) or a direct host (`db.<ref>.supabase.co`); null if neither. */
export function projectRefFromDatabaseUrl(value) {
  let url
  try { url = new URL(value) } catch { throw new Error('DATABASE_APP_URL must be a PostgreSQL URI') }
  let user = ''
  try { user = decodeURIComponent(url.username) } catch { throw new Error('DATABASE_APP_URL has an invalid user encoding') }
  const fromUser = user.includes('.') ? user.slice(user.indexOf('.') + 1) : null
  const fromHost = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)?.[1] ?? null
  if (fromUser && fromHost && fromUser !== fromHost) throw new Error('DATABASE_APP_URL names two different project refs (user and host)')
  return fromUser ?? fromHost
}

/** Runs before any connection: HAB_EXPECT_PROJECT_REF must match DATABASE_APP_URL, and a village must be named. */
export function lecturerPreflight(env) {
  const expected = String(env.HAB_EXPECT_PROJECT_REF ?? '').trim()
  if (!expected) throw new Error('HAB_EXPECT_PROJECT_REF is required in lecturer mode (the Supabase project ref this run must target). Nothing was changed.')
  if (!env.DATABASE_APP_URL) throw new Error('DATABASE_APP_URL is not configured. Nothing was changed.')
  const actual = projectRefFromDatabaseUrl(env.DATABASE_APP_URL)
  if (!actual) throw new Error('Cannot read the Supabase project ref from DATABASE_APP_URL (expected user hab_app.<ref> or host db.<ref>.supabase.co). Nothing was changed.')
  if (actual !== expected) throw new Error(`DATABASE_APP_URL points to project ref "${actual}", which does not match HAB_EXPECT_PROJECT_REF "${expected}". Nothing was changed.`)
  const village = String(env.HAB_LECTURER_VILLAGE ?? '').trim()
  if (!village) throw new Error('HAB_LECTURER_VILLAGE is required in lecturer mode (village name or village_id). Nothing was changed.')
  return { projectRef: actual, village }
}

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ', LOWER = 'abcdefghijkmnopqrstuvwxyz', DIGITS = '23456789', SPECIAL = '!#$%*+-=?@_'
const ALL = UPPER + LOWER + DIGITS + SPECIAL
/** 20 characters with at least one upper, lower, digit and special character (AUT rule), no space. */
export function generatePassword(random = randomBytes) {
  const bytes = random(40)
  const chars = [UPPER, LOWER, DIGITS, SPECIAL].map((set, index) => set[bytes[index] % set.length])
  for (let index = 4; index < 20; index += 1) chars.push(ALL[bytes[index] % ALL.length])
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const other = bytes[20 + index] % (index + 1);
    [chars[index], chars[other]] = [chars[other], chars[index]]
  }
  const password = chars.join('')
  if (!meetsPasswordRule(password)) throw new Error('Generated password does not meet the password rule')
  return password
}

const active = row => String(row.is_active) === 'true'
const one = (rows, what) => {
  if (rows.length === 0) throw new Error(`No ${what} found`)
  if (rows.length > 1) throw new Error(`${what} is ambiguous (${rows.length} found)`)
  return rows[0]
}

async function resolveVillage(port, value) {
  const rows = UUID.test(value) ? await port.findAll('villages', { village_id: value.toLowerCase() }) : await port.findAll('villages', { name: value.normalize('NFC') })
  const village = one(rows, `village "${value}"`)
  if (!active(village)) throw new Error(`Village "${village.name}" is not active`)
  return village
}

async function resolveUser(port, userId, role, adminType, what) {
  const row = await port.findOne('user_accounts', { user_id: userId })
  if (!row) throw new Error(`${what} user ${userId} not found`)
  if (row.role_code !== role || (adminType && row.admin_type !== adminType)) throw new Error(`${what} user ${userId} has another role`)
  if (!['Active', 'Approved'].includes(row.account_status)) throw new Error(`${what} user ${userId} is not Active (${row.account_status})`)
  return row
}

async function moveTarget(port, row, to) {
  const holder = await port.findOne('user_accounts', { email: to })
  if (holder && holder.user_id !== row.user_id) throw new Error(`${to} already belongs to another user (${holder.user_id})`)
  return { user_id: row.user_id, from: row.email, to, action: row.email === to ? 'keep' : 'change-email' }
}

async function newAccount(port, email, check, what) {
  const row = await port.findOne('user_accounts', { email })
  if (!row) return { email, action: 'create' }
  if (!check(row)) throw new Error(`${email} already exists with another role; it is not the ${what} tester`)
  return { email, user_id: row.user_id, action: 'exists' }
}

const plural = count => `${count} Experience${count === 1 ? '' : 's'}`

/** Business name (published version, else current) and number of Experiences, for the candidate list and dry run. */
async function providerSummary(port, profile) {
  const versions = await port.findAll('provider_profile_versions', { provider_id: profile.provider_id })
  const wanted = [profile.published_version_no, profile.current_version_no].map(value => String(value ?? '')).filter(Boolean)
  const version = wanted.map(no => versions.find(row => String(row.version_no) === no)).find(Boolean)
  const experiences = (await port.findAll('experiences', { provider_id: profile.provider_id })).length
  return `${version?.business_name || '(no business name)'} — ${plural(experiences)}`
}

const ambiguous = (what, variable, candidates) => new Error(
  `${what} is ambiguous (${candidates.length} found). Set ${variable} to one of:\n${candidates.map(line => `  - ${line}`).join('\n')}\nNothing was changed.`)

/** The village's Verified Provider user: HAB_LECTURER_PROVIDER_EMAIL, else the one already renamed, else the only one. */
async function selectProvider(port, env, village) {
  const target = LECTURER_EMAILS.provider
  const variable = 'HAB_LECTURER_PROVIDER_EMAIL'
  const explicit = String(env[variable] ?? '').trim().toLowerCase()
  const describe = async profile => {
    const user = await port.findOne('user_accounts', { user_id: profile.user_id })
    return { profile, user, line: `${user?.email ?? `(no user ${profile.user_id})`} — ${await providerSummary(port, profile)}` }
  }
  if (explicit) {
    let user = await port.findOne('user_accounts', { email: explicit })
    let reason = variable
    if (!user) {
      // A re-run after the real run: the chosen user now carries the tester email.
      user = await port.findOne('user_accounts', { email: target })
      if (!user) throw new Error(`No user with email ${explicit} (${variable}). Nothing was changed.`)
      reason = `already ${target} (${explicit} no longer exists)`
    }
    if (user.role_code !== 'Local_Provider') throw new Error(`${user.email} (${variable}) is not a Local Provider. Nothing was changed.`)
    if (!['Active', 'Approved'].includes(user.account_status)) throw new Error(`${user.email} (${variable}) is not Active (${user.account_status}). Nothing was changed.`)
    const profile = await port.findOne('provider_profiles', { user_id: user.user_id })
    if (!profile) throw new Error(`${user.email} (${variable}) has no provider profile. Nothing was changed.`)
    if (profile.verification_status !== 'Verified') throw new Error(`${user.email} (${variable}) is not Verified (${profile.verification_status}). Nothing was changed.`)
    if (profile.village_id !== village.village_id) throw new Error(`${user.email} (${variable}) is not in ${village.name}. Nothing was changed.`)
    return { profile, user, reason, line: (await describe(profile)).line }
  }
  const candidates = await Promise.all((await port.findAll('provider_profiles', { village_id: village.village_id, verification_status: 'Verified' })).map(describe))
  if (candidates.length === 0) throw new Error(`No Verified Provider in ${village.name} found`)
  const renamed = candidates.filter(item => item.user?.email === target)
  if (renamed.length === 1) return { ...renamed[0], reason: `already ${target}` }
  if (candidates.length > 1) throw ambiguous(`Verified Provider in ${village.name}`, variable, candidates.map(item => item.line))
  return { ...candidates[0], reason: `only Verified Provider in ${village.name}` }
}

/** The village's UBND user: HAB_LECTURER_UBND_EMAIL, else the one already renamed, else the only one. */
async function selectUbnd(port, env, village) {
  const target = LECTURER_EMAILS.ubnd
  const variable = 'HAB_LECTURER_UBND_EMAIL'
  const explicit = String(env[variable] ?? '').trim().toLowerCase()
  const assignments = await port.findAll('ubnd_village_assignments', { village_id: village.village_id })
  const candidates = await Promise.all(assignments.map(async row => {
    const user = await port.findOne('user_accounts', { user_id: row.ubnd_user_id })
    return { userId: row.ubnd_user_id, user, line: `${user?.email ?? `(no user ${row.ubnd_user_id})`} — ${user?.full_name ?? ''}`.replace(/ — $/, '') }
  }))
  if (explicit) {
    let user = await port.findOne('user_accounts', { email: explicit })
    let reason = variable
    if (!user) {
      user = await port.findOne('user_accounts', { email: target })
      if (!user) throw new Error(`No user with email ${explicit} (${variable}). Nothing was changed.`)
      reason = `already ${target} (${explicit} no longer exists)`
    }
    if (!candidates.some(item => item.userId === user.user_id)) throw new Error(`${user.email} (${variable}) is not assigned to ${village.name}. Nothing was changed.`)
    return { userId: user.user_id, reason }
  }
  if (candidates.length === 0) throw new Error(`No UBND assignment in ${village.name} found`)
  const renamed = candidates.filter(item => item.user?.email === target)
  if (renamed.length === 1) return { ...renamed[0], reason: `already ${target}` }
  if (candidates.length > 1) throw ambiguous(`UBND assignment in ${village.name}`, variable, candidates.map(item => item.line))
  return { ...candidates[0], reason: `only UBND user assigned to ${village.name}` }
}

/** Read-only: resolves the village and the four accounts, or throws. */
export async function resolveLecturerPlan(port, env) {
  const value = String(env.HAB_LECTURER_VILLAGE ?? '').trim()
  if (!value) throw new Error('HAB_LECTURER_VILLAGE is required in lecturer mode (village name or village_id)')
  const village = await resolveVillage(port, value)
  const provider = await selectProvider(port, env, village)
  const ubnd = await selectUbnd(port, env, village)
  const providerUser = await resolveUser(port, provider.profile.user_id, 'Local_Provider', null, 'Provider')
  const ubndUser = await resolveUser(port, ubnd.userId, 'ADMIN', 'UBND', 'UBND')
  const approver = await port.findOne('user_accounts', { email: SEED_HDT_APPROVER })
  const agency = await newAccount(port, LECTURER_EMAILS.agency, row => row.role_code === 'Tour_Agency', 'Agency')
  if (agency.action === 'create' && !approver) throw new Error(`Seed HDT ${SEED_HDT_APPROVER} not found; cannot approve ${LECTURER_EMAILS.agency}`)
  return {
    village: { village_id: village.village_id, name: village.name },
    provider: { ...await moveTarget(port, providerUser, LECTURER_EMAILS.provider), provider_id: provider.profile.provider_id, summary: provider.line.slice(provider.line.indexOf(' — ') + 3), reason: provider.reason },
    ubnd: { ...await moveTarget(port, ubndUser, LECTURER_EMAILS.ubnd), reason: ubnd.reason },
    agency,
    hdt: await newAccount(port, LECTURER_EMAILS.hdt, row => row.role_code === 'ADMIN' && row.admin_type === 'HDT', 'HDT'),
    approver: approver ? { user_id: approver.user_id, email: approver.email } : null,
  }
}

/** Lines printed by --dry-run (and before a real run). No passwords. */
export function describeLecturerPlan(plan, { resetPasswords = false } = {}) {
  const password = existing => existing ? (resetPasswords ? 'new password' : 'password kept') : 'new password'
  const { village, agency, hdt, provider, ubnd, approver } = plan
  return [
    `[lecturer] village: ${village.name} (${village.village_id})`,
    `[lecturer] Provider selected: ${provider.from} (${provider.user_id}), ${provider.summary.replace(' — ', ', ')} — ${provider.reason}`,
    `[lecturer] UBND selected: ${ubnd.from} (${ubnd.user_id}) — ${ubnd.reason}`,
    agency.action === 'create'
      ? `[lecturer] ${agency.email}: create Tour_Agency, Approved, company "${AGENCY_NAMING.companyName}", approved by ${approver.email} (${approver.user_id}); new password`
      : `[lecturer] ${agency.email}: exists (${agency.user_id}); ${password(true)}`,
    hdt.action === 'create' ? `[lecturer] ${hdt.email}: create ADMIN/HDT; new password` : `[lecturer] ${hdt.email}: exists (${hdt.user_id}); ${password(true)}`,
    ...[['Provider', provider], ['UBND', ubnd]].map(([what, item]) => item.action === 'change-email'
      ? `[lecturer] ${item.to}: change email of ${what} user ${item.user_id} from ${item.from}; new password; sessions revoked`
      : `[lecturer] ${item.to}: already on ${what} user ${item.user_id}; ${password(true)}`),
  ]
}

async function changeEmail(port, item, password, deps) {
  const now = deps.now().toISOString()
  await port.update('user_accounts', { user_id: item.user_id }, {
    email: item.to, password_hash: await deps.hash(password), must_change_password: false, password_changed_at: now, updated_at: now,
  })
  await port.update('sessions', { user_id: item.user_id, revoked_at: null }, { revoked_at: now })
}

/**
 * Resolves, then (unless dryRun) applies everything in one transaction.
 * Returns { plan, lines, outcomes: { email: created|updated|unchanged }, credentials: [{ email, password }] }.
 * Credentials hold only passwords set in this run; they are never passed to deps.log.
 */
export async function runLecturer(port, env, deps, { dryRun = false, resetPasswords = false } = {}) {
  if (dryRun) {
    const plan = await resolveLecturerPlan(port, env)
    return { plan, lines: describeLecturerPlan(plan, { resetPasswords }), outcomes: {}, credentials: [] }
  }
  return port.transaction(async () => {
    const plan = await resolveLecturerPlan(port, env)
    const lines = describeLecturerPlan(plan, { resetPasswords })
    const outcomes = {}, credentials = []
    const fresh = email => { const password = generatePassword(); credentials.push({ email, password }); return password }
    const reset = async (email, userId) => {
      if (!resetPasswords) return 'unchanged'
      const row = await port.findOne('user_accounts', { user_id: userId })
      return setPassword(port, { email, password: fresh(email) }, row, deps)
    }

    outcomes[plan.agency.email] = plan.agency.action === 'create'
      ? await createAgency(port, { name: 'Tester', email: plan.agency.email, password: fresh(plan.agency.email) }, plan.approver.user_id, deps, AGENCY_NAMING)
      : await reset(plan.agency.email, plan.agency.user_id)
    if (outcomes[plan.agency.email] === 'skipped') throw new Error(`${plan.agency.email} could not be created (synthetic tax id already used). Nothing was changed.`)
    outcomes[plan.hdt.email] = plan.hdt.action === 'create'
      ? await createHdt(port, { name: 'Tester', email: plan.hdt.email, password: fresh(plan.hdt.email) }, deps, HDT_FULL_NAME)
      : await reset(plan.hdt.email, plan.hdt.user_id)
    for (const item of [plan.provider, plan.ubnd]) {
      if (item.action === 'change-email') { await changeEmail(port, item, fresh(item.to), deps); outcomes[item.to] = 'updated' }
      else outcomes[item.to] = await reset(item.to, item.user_id)
    }
    for (const [email, outcome] of Object.entries(outcomes)) deps.log.info(`[lecturer] ${email}: ${outcome}`)
    return { plan, lines, outcomes, credentials }
  })
}
