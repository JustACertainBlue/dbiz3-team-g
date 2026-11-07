// Core of `npm run db:set-test-passwords` (ADR 0001, docs/test/test-plan.md §3). No database access here:
// the caller passes a small port { findOne, insert, update, transaction } so tests run on an in-memory fixture
// and the CLI (set-test-passwords.mjs) runs it on PostgreSQL. Passwords come only from environment variables
// and are never logged.
import { createHash, randomUUID } from 'node:crypto'

const NAME = /^[A-Za-z][A-Za-z0-9]{0,19}$/
const OUTSIDER = 'Khach' // "[T-Khach]": the Agency account for testers outside the team
const SEED_HDT_APPROVER = 'thanhvien9@example.invalid' // seed HDT that approves every seed Agency
// Existing accounts that only get a password; nothing new is created for these roles.
const EXISTING = [
  { env: 'HAB_TEST_PASSWORD_PROVIDER', email: 'thanhvien19@example.invalid', role: 'Local_Provider' }, // Xưởng thủ công Bát Tràng, Verified
  { env: 'HAB_TEST_PASSWORD_UBND', email: 'thanhvien1@example.invalid', role: 'ADMIN' }, // UBND Bát Tràng (active village)
]

/** Same rule as AUT password change/reset (lifecycle.ts passwordInput): 8–64, upper, lower, digit, special, no space. */
export function meetsPasswordRule(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 64 && !/\s/.test(password)
    && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)
}

function names(value, variable, log) {
  const list = []
  for (const raw of String(value ?? '').split(',').map(item => item.trim()).filter(Boolean)) {
    if (!NAME.test(raw)) { log.warn(`[test-accounts] ${variable}: "${raw}" is not 1–20 plain letters/digits starting with a letter; skipped.`); continue }
    if (!list.some(item => item.toLowerCase() === raw.toLowerCase())) list.push(raw)
  }
  return list
}

/**
 * Reads names and variable names from the environment; passwords stay in `env` until applied.
 * @param {Record<string, string | undefined>} env
 * @param {{ warn: (message: string) => void }} [log]
 */
export function planTestAccounts(env, log = console) {
  const agencyNames = names(env.HAB_TEST_AGENCY_NAMES, 'HAB_TEST_AGENCY_NAMES', log).filter(name => name.toLowerCase() !== OUTSIDER.toLowerCase())
  const agencies = [...agencyNames, OUTSIDER].map(name => ({
    name, email: `t-${name.toLowerCase()}-agency@example.invalid`, env: `HAB_TEST_PASSWORD_AGENCY_${name.toUpperCase()}`, password: env[`HAB_TEST_PASSWORD_AGENCY_${name.toUpperCase()}`],
  }))
  const hdt = names(env.HAB_TEST_HDT_NAMES, 'HAB_TEST_HDT_NAMES', log).map(name => ({
    name, email: `t-${name.toLowerCase()}-hdt@example.invalid`, env: `HAB_TEST_PASSWORD_HDT_${name.toUpperCase()}`, password: env[`HAB_TEST_PASSWORD_HDT_${name.toUpperCase()}`],
  }))
  const existing = EXISTING.map(item => ({ ...item, password: env[item.env] }))
  return { agencies, hdt, existing }
}

function usable(account, log) {
  if (!account.password) { log.warn(`[test-accounts] ${account.env} is not set; ${account.email} skipped.`); return false }
  if (!meetsPasswordRule(account.password)) {
    log.warn(`[test-accounts] ${account.env} does not meet the password rule (8–64 chars, upper, lower, digit, special, no space); ${account.email} skipped.`)
    return false
  }
  return true
}

/** Deterministic synthetic 10-digit tax id for a tester name (not a real company). */
function taxIdFor(name) {
  const digits = BigInt(`0x${createHash('sha256').update(`hab-test-agency:${name.toLowerCase()}`).digest('hex').slice(0, 15)}`) % 100000000n
  return `09${digits.toString().padStart(8, '0')}`
}

/** Sets the password of an existing account; unchanged password → no write. A changed one revokes its sessions. */
async function setPassword(port, account, row, deps) {
  const same = !String(row.password_hash ?? '').includes('seedhash') && await deps.verify(account.password, row.password_hash)
  const mustChange = String(row.must_change_password) === 'true'
  if (same && !mustChange) return 'unchanged'
  const now = deps.now().toISOString()
  const changes = same ? { must_change_password: false, updated_at: now }
    : { password_hash: await deps.hash(account.password), must_change_password: false, password_changed_at: now, updated_at: now }
  await port.update('user_accounts', { user_id: row.user_id }, changes)
  if (!same) await port.update('sessions', { user_id: row.user_id, revoked_at: null }, { revoked_at: now })
  return 'updated'
}

async function createAgency(port, account, approverId, deps) {
  const now = deps.now().toISOString()
  const taxId = taxIdFor(account.name)
  if (await port.findOne('agency_profiles', { tax_id: taxId }) || await port.findOne('registration_submission_versions', { tax_id: taxId })) {
    deps.log.warn(`[test-accounts] synthetic tax id for ${account.email} is already used; skipped.`); return 'skipped'
  }
  const userId = randomUUID(), requestId = randomUUID(), agencyId = randomUUID()
  const label = `[T-${account.name}]`
  const companyName = `${label} Công ty du lịch thử nghiệm`
  const location = { street: `${label} Địa chỉ thử nghiệm`, ward: 'Hàng Trống', district: 'Hoàn Kiếm', city_province: 'Hà Nội' }
  const contact = { contact_person_name: `${label} Người thử nghiệm`, phone_number: '+84900000000', business_email: account.email }
  const tourTypes = ['Craft Village/Experiential']
  await port.insert('user_accounts', {
    user_id: userId, email: account.email, password_hash: await deps.hash(account.password), role_code: 'Tour_Agency', admin_type: null,
    account_status: 'Approved', full_name: `${label} Người thử nghiệm`, title: null, phone: null, avatar_file_id: null,
    must_change_password: false, password_changed_at: now, last_login: null, created_at: now, updated_at: now,
  })
  // Same records as an approved seed Agency: request (Approved, version 1), its submission, HDT approval, status history.
  await port.insert('agency_registration_requests', {
    registration_request_id: requestId, email: account.email, pending_password_hash: null, current_status: 'Approved',
    agency_user_id: userId, current_version_no: 1, created_at: now, updated_at: now,
  })
  await port.insert('registration_submission_versions', {
    registration_request_id: requestId, version_no: 1, submitted_at: now, submitted_by: userId, full_name: contact.contact_person_name,
    company_name: companyName, company_type: 'Travel Agency', tax_id: taxId, location, contact_information: contact, team_size: 5, tour_types: tourTypes,
  })
  await port.insert('agency_profiles', {
    agency_id: agencyId, user_id: userId, registration_request_id: requestId, company_name: companyName, company_type: 'Travel Agency',
    tax_id: taxId, location, description: null, contact_info: contact, team_size: 5, tour_types: tourTypes, created_at: now, updated_at: now,
  })
  await port.insert('agency_review_records', {
    review_id: randomUUID(), registration_request_id: requestId, registration_version_no: 1, major_change_id: null, hdt_user_id: approverId,
    decision: 'Approve', comments: 'Synthetic test account created by db:set-test-passwords', decided_at: now,
  })
  await port.insert('account_status_history', {
    history_id: randomUUID(), user_id: userId, from_status: 'Pending Approval', to_status: 'Approved', changed_by: approverId,
    changed_at: now, reason: 'Tài khoản test (db:set-test-passwords)',
  })
  return 'created'
}

async function createHdt(port, account, deps) {
  const now = deps.now().toISOString()
  await port.insert('user_accounts', {
    user_id: randomUUID(), email: account.email, password_hash: await deps.hash(account.password), role_code: 'ADMIN', admin_type: 'HDT',
    account_status: 'Active', full_name: `[T-${account.name}] HDT thử nghiệm`, title: null, phone: null, avatar_file_id: null,
    must_change_password: false, password_changed_at: now, last_login: null, created_at: now, updated_at: now,
  })
  return 'created'
}

/** Applies the plan; one transaction per account. Returns { email: outcome } (never passwords). */
export async function applyTestAccounts(port, plan, deps) {
  const { log } = deps
  const result = {}
  const report = (account, outcome) => { result[account.email] = outcome; log.info(`[test-accounts] ${account.email}: ${outcome}`) }
  const approver = await port.findOne('user_accounts', { email: SEED_HDT_APPROVER })
  for (const account of plan.agencies) {
    if (!usable(account, log)) { report(account, 'skipped'); continue }
    report(account, await port.transaction(async () => {
      const row = await port.findOne('user_accounts', { email: account.email })
      if (row) {
        if (row.role_code !== 'Tour_Agency') { log.warn(`[test-accounts] ${account.email} exists with another role; skipped.`); return 'skipped' }
        return setPassword(port, account, row, deps)
      }
      if (!approver) { log.warn(`[test-accounts] seed HDT ${SEED_HDT_APPROVER} not found; cannot approve ${account.email}; skipped.`); return 'skipped' }
      return createAgency(port, account, approver.user_id, deps)
    }))
  }
  for (const account of plan.hdt) {
    if (!usable(account, log)) { report(account, 'skipped'); continue }
    report(account, await port.transaction(async () => {
      const row = await port.findOne('user_accounts', { email: account.email })
      if (!row) return createHdt(port, account, deps)
      if (row.role_code !== 'ADMIN' || row.admin_type !== 'HDT') { log.warn(`[test-accounts] ${account.email} exists with another role; skipped.`); return 'skipped' }
      return setPassword(port, account, row, deps)
    }))
  }
  for (const account of plan.existing) {
    if (!usable(account, log)) { report(account, 'skipped'); continue }
    report(account, await port.transaction(async () => {
      const row = await port.findOne('user_accounts', { email: account.email })
      if (!row || row.role_code !== account.role || !['Active', 'Approved'].includes(row.account_status)) {
        log.warn(`[test-accounts] ${account.email} is missing, has another role or is not Active; skipped.`); return 'skipped'
      }
      return setPassword(port, account, row, deps)
    }))
  }
  return result
}
