// AUT US-4..US-10 adapted from linh-daotruc's PR #11 to the shared repository.
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { demoRepository } from '../db/application-store'
import type { DemoRow } from '../demo/types'
import type { SessionContext } from './session'
import { hashPassword, verifyPassword } from './password'
import { registrationFields } from './registration-validation'

export class AuthError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}
function fail(message: string, status = 400): never { throw new AuthError(message, status) }
export type Delivery = (message: Record<string, string>) => void
export function authDelivery(): Delivery {
  if (process.env.NODE_ENV === 'production' || process.env.HAB_EMAIL_MODE !== 'dev-outbox') fail('Email chưa được cấu hình. Chức năng này đang chờ dịch vụ email.', 503)
  return message => {
    const directory = join(process.cwd(), '.demo-data', 'auth-outbox')
    mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, `${randomUUID()}.json`), JSON.stringify(message), { mode: 0o600 })
  }
}
export const verifier = (token: string) => createHash('sha256').update(token).digest('hex')
const tokenValue = () => randomBytes(32).toString('base64url')
const rows = (tables: Record<string, DemoRow[]>, name: string) => tables[name] ??= []
function audit(tables: Record<string, DemoRow[]>, actor: string, action: string, target: string, detail: unknown = {}) {
  rows(tables, 'audit_logs').push({ audit_id: randomUUID(), actor_user_id: actor, action, target_type: 'UserAccount', target_id: target, occurred_at: new Date().toISOString(), change_or_result: JSON.stringify(detail) })
}
function revoke(tables: Record<string, DemoRow[]>, user: string) {
  for (const row of rows(tables, 'sessions')) if (row.user_id === user && !row.revoked_at) row.revoked_at = new Date().toISOString()
}
function passwordInput(password: string, confirmation: string) {
  if (password !== confirmation) fail('Passwords do not match')
  if (password.length < 8 || password.length > 64 || /\s/.test(password) || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) fail('Password must contain 8–64 characters, uppercase, lowercase, number and special character, with no whitespace')
}

export async function requestPasswordReset(emailInput: unknown, deliver?: Delivery) {
  const parsed = z.string().email().max(254).safeParse(emailInput)
  if (!parsed.success) fail('Invalid email')
  const email = parsed.data.trim().toLowerCase()
  const deliverMessage = deliver ?? authDelivery()
  const raw = tokenValue(), now = Date.now()
  // Rate limiting also records unknown emails, so response does not reveal membership.
  return (await demoRepository().transaction(["user_accounts","sessions","password_reset_tokens","audit_logs","auth_rate_limits","villages","ubnd_village_assignments","provider_profiles","provider_profile_versions","agency_registration_requests","agency_review_records","registration_submission_versions","registration_resubmission_tokens","agency_profiles","stored_files","registration_documents"], tables => {
    const key = verifier(email)
    const limits = rows(tables, 'auth_rate_limits')
    const cutoff = now - 900000
    tables.auth_rate_limits = limits.filter(row => Number(row.at) > cutoff)
    if (tables.auth_rate_limits.filter(row => row.key === key).length >= 3) fail('Too many requests; try again later', 429)
    tables.auth_rate_limits.push({ key, at: String(now) })
    const account = rows(tables, 'user_accounts').find(row => row.email.toLowerCase() === email)
    if (account) {
      deliverMessage({ kind: 'password-reset', to: email, token: raw, path: `/reset-password?token=${encodeURIComponent(raw)}` })
      for (const row of rows(tables, 'password_reset_tokens')) if (row.user_id === account.user_id && !row.used_at) row.used_at = new Date(now).toISOString()
      rows(tables, 'password_reset_tokens').push({ token_id: randomUUID(), user_id: account.user_id, token_verifier: verifier(raw), issued_at: new Date(now).toISOString(), expires_at: new Date(now + 900000).toISOString(), used_at: '' })
      audit(tables, account.user_id, 'PASSWORD_RESET_REQUESTED', account.user_id)
    }
    return { success: true, result_message: 'If this email is registered, a recovery link will be delivered.', email_delivery_status: 'Dev outbox' }
  }))
}

export async function resetPassword(token: string, password: string, confirmation: string) {
  passwordInput(password, confirmation)
  if (!token || token.length > 200) fail('Invalid or expired recovery link')
  const hash = await hashPassword(password)
  return (await demoRepository().transaction(["user_accounts","sessions","password_reset_tokens","audit_logs","auth_rate_limits","villages","ubnd_village_assignments","provider_profiles","provider_profile_versions","agency_registration_requests","agency_review_records","registration_submission_versions","registration_resubmission_tokens","agency_profiles","stored_files","registration_documents"], tables => {
    const row = rows(tables, 'password_reset_tokens').find(row => row.token_verifier === verifier(token) && !row.used_at && Date.parse(row.expires_at) > Date.now())
    if (!row) fail('Invalid or expired recovery link')
    const account = rows(tables, 'user_accounts').find(item => item.user_id === row.user_id)
    if (!account) fail('Invalid or expired recovery link')
    const now = new Date().toISOString()
    account.password_hash = hash; account.must_change_password = 'false'; account.password_changed_at = now; account.updated_at = now
    for (const item of rows(tables, 'password_reset_tokens')) if (item.user_id === account.user_id && !item.used_at) item.used_at = now
    revoke(tables, account.user_id); audit(tables, account.user_id, 'PASSWORD_RESET_COMPLETED', account.user_id)
    return { success: true, redirect_url: '/login' }
  }))
}

export async function changePassword(session: SessionContext, current: string, password: string, confirmation: string) {
  if (!session.authenticated || !session.userId) fail('Unauthenticated', 401)
  passwordInput(password, confirmation)
  const repo = demoRepository(), before = (await repo.find('user_accounts', row => row.user_id === session.userId))
  if (!before || !await verifyPassword(current, before.password_hash)) fail('Current password incorrect')
  if (current === password) fail('Choose a different password')
  const hash = await hashPassword(password)
  return (await repo.transaction(["user_accounts","sessions","password_reset_tokens","audit_logs","auth_rate_limits","villages","ubnd_village_assignments","provider_profiles","provider_profile_versions","agency_registration_requests","agency_review_records","registration_submission_versions","registration_resubmission_tokens","agency_profiles","stored_files","registration_documents"], tables => {
    const account = rows(tables, 'user_accounts').find(row => row.user_id === session.userId && row.password_hash === before.password_hash)
    if (!account) fail('Account changed; sign in again', 409)
    const now = new Date().toISOString()
    account.password_hash = hash; account.must_change_password = 'false'; account.password_changed_at = now; account.updated_at = now
    revoke(tables, account.user_id); audit(tables, account.user_id, 'PASSWORD_CHANGED', account.user_id)
    return { success: true, redirect_url: '/login' }
  }))
}

const accountSchema = z.object({ name: z.string().trim().min(1).max(100), email: z.string().email().max(254), phone: z.string().regex(/^\+?[0-9]{10,15}$/), village_id: z.string().uuid(), address: z.string().trim().max(500).optional() })
// F-AUTH-19 (spec-AUT FR-019 / §5.1, OQ #22, decision 2026-11-10, #242): HDT names the village instead of picking an id.
const ubndAccountSchema = z.object({ name: z.string().trim().min(1).max(100), email: z.string().email().max(254), phone: z.string().regex(/^\+?[0-9]{10,15}$/), village_name: z.string().trim().min(1).max(255) })
const newVillageCode = (taken: Set<string>) => { for (;;) { const code = `HDT-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`; if (!taken.has(code)) return code } }
// #170: ADM117 Contact (F-AUTH-20 element #10, Required): a Provider account needs contact
// { contact_person_name, phone_number } (decision 09/11: enforced on the server).
const contactSchema = z.object({ contact_person_name: z.string().trim().min(1).max(100), phone_number: z.string().trim().regex(/^\+?[0-9]{10,15}$/) })
export async function createManagedAccount(session: SessionContext, kind: string, input: unknown, delivery?: Delivery) {
  if (!session.authenticated || session.role !== 'ADMIN' || !session.permissions.includes('manage_users') || (kind === 'ubnd' ? session.adminType !== 'HDT' : kind !== 'provider' || session.adminType !== 'UBND')) fail('Forbidden', 403)
  if (kind === 'ubnd') return createUbndAccount(session, input, delivery)
  const parsed = accountSchema.safeParse(input)
  if (!parsed.success) fail('Check name, email, phone and assigned village')
  const data = parsed.data
  // F-AUTH-20 unchanged (spec-AUT OQ #22): a Provider only in its UBND's assigned, ACTIVE village (checked below).
  if (kind === 'provider' && (!data.address || session.assignedVillageId !== data.village_id)) fail('Provider must belong to your assigned village', 403)
  const contact = kind === 'provider' ? contactSchema.safeParse(input && typeof input === 'object' ? (input as { contact?: unknown }).contact : undefined) : undefined
  if (contact && !contact.success) fail('Check contact person and contact phone')
  const contactInformation = contact?.success ? contact.data : null
  const deliver = delivery ?? authDelivery(), temporary = `Aa1!${tokenValue()}`, hash = await hashPassword(temporary)
  return (await demoRepository().transaction(["user_accounts","sessions","password_reset_tokens","audit_logs","auth_rate_limits","villages","ubnd_village_assignments","provider_profiles","provider_profile_versions","agency_registration_requests","agency_review_records","registration_submission_versions","registration_resubmission_tokens","agency_profiles","stored_files","registration_documents"], tables => {
    const village = rows(tables, 'villages').find(row => row.village_id === data.village_id && row.is_active === 'true')
    if (!village) fail('Village not found or inactive')
    if (kind === 'ubnd' && rows(tables, 'ubnd_village_assignments').some(row => row.village_id === data.village_id)) fail('Village already has an assigned UBND', 409)
    const email = data.email.trim().toLowerCase()
    if (rows(tables, 'user_accounts').some(row => row.email.toLowerCase() === email) || rows(tables, 'agency_registration_requests').some(row => row.email.toLowerCase() === email)) fail('Email already exists', 409)
    const user = randomUUID(), profile = randomUUID(), now = new Date().toISOString()
    deliver({ kind: 'account-created', to: email, temporary_password: temporary })
    rows(tables, 'user_accounts').push({ user_id: user, email, password_hash: hash, role_code: kind === 'ubnd' ? 'ADMIN' : 'Local_Provider', admin_type: kind === 'ubnd' ? 'UBND' : '', account_status: 'Active', full_name: data.name, title: '', phone: data.phone, avatar_file_id: '', must_change_password: 'true', password_changed_at: '', last_login: '', created_at: now, updated_at: now })
    if (kind === 'ubnd') rows(tables, 'ubnd_village_assignments').push({ ubnd_user_id: user, village_id: data.village_id, assigned_by: session.userId!, assigned_at: now })
    else {
      rows(tables, 'provider_profiles').push({ provider_id: profile, user_id: user, village_id: data.village_id, verification_status: 'Draft', current_version_no: '1', published_version_no: '', created_at: now, updated_at: now })
      rows(tables, 'provider_profile_versions').push({ provider_id: profile, version_no: '1', version_status: 'Draft', business_registration_number: '', business_name: data.name, craft_type: '', artisan_names: '[]', location_address: data.address!, description: '', contact_information: JSON.stringify(contactInformation), booking_conditions: '', submitted_at: '', published_at: '' })
    }
    audit(tables, session.userId!, kind === 'ubnd' ? 'UBND_ACCOUNT_CREATED' : 'LOCAL_PROVIDER_ACCOUNT_CREATED', user, { village_id: data.village_id })
    return { user_id: user, provider_id: kind === 'provider' ? profile : null, account_status: 'Active', must_change_password: true, email_delivery_status: 'Dev outbox' }
  }))
}

// F-AUTH-19 by village name (spec-AUT FR-019, US-7 AS-1/1a/1b/1c, OQ #22; ADM117 §3 #5). Same order as before: validate,
// email adapter (503 when not configured), then one transaction, so a delivery failure also rolls back a new village.
async function createUbndAccount(session: SessionContext, input: unknown, delivery?: Delivery) {
  const parsed = ubndAccountSchema.safeParse(input)
  if (!parsed.success) fail('Check name, email, phone and village name')
  const data = parsed.data
  const deliver = delivery ?? authDelivery(), temporary = `Aa1!${tokenValue()}`, hash = await hashPassword(temporary)
  return (await demoRepository().transaction(["user_accounts","sessions","password_reset_tokens","audit_logs","auth_rate_limits","villages","ubnd_village_assignments","provider_profiles","provider_profile_versions","agency_registration_requests","agency_review_records","registration_submission_versions","registration_resubmission_tokens","agency_profiles","stored_files","registration_documents"], tables => {
    const villages = rows(tables, 'villages'), wanted = data.village_name.toLocaleLowerCase('vi')
    const match = villages.find(row => row.name.trim().toLocaleLowerCase('vi') === wanted)
    if (match && match.is_active !== 'true') fail('Village is inactive', 409) // US-7 1c
    if (match && rows(tables, 'ubnd_village_assignments').some(row => row.village_id === match.village_id)) fail('Village already has an assigned UBND', 409) // 1b, BR-008
    const email = data.email.trim().toLowerCase()
    if (rows(tables, 'user_accounts').some(row => row.email.toLowerCase() === email) || rows(tables, 'agency_registration_requests').some(row => row.email.toLowerCase() === email)) fail('Email already exists', 409)
    const user = randomUUID(), now = new Date().toISOString()
    deliver({ kind: 'account-created', to: email, temporary_password: temporary })
    // 1a: no village has this name → a new ACTIVE village with only its name (system source_code, Hanoi-only MVP).
    const villageId = match?.village_id ?? randomUUID()
    if (!match) villages.push({ village_id: villageId, source_code: newVillageCode(new Set(villages.map(row => row.source_code))), name: data.village_name, district: '', city_province: 'Hà Nội', is_active: 'true' })
    rows(tables, 'user_accounts').push({ user_id: user, email, password_hash: hash, role_code: 'ADMIN', admin_type: 'UBND', account_status: 'Active', full_name: data.name, title: '', phone: data.phone, avatar_file_id: '', must_change_password: 'true', password_changed_at: '', last_login: '', created_at: now, updated_at: now })
    rows(tables, 'ubnd_village_assignments').push({ ubnd_user_id: user, village_id: villageId, assigned_by: session.userId!, assigned_at: now })
    audit(tables, session.userId!, 'UBND_ACCOUNT_CREATED', user, { village_id: villageId, village_created: !match })
    return { user_id: user, provider_id: null, account_status: 'Active', must_change_password: true, email_delivery_status: 'Dev outbox' }
  }))
}

export async function resetManagedPassword(session: SessionContext, userId: string, delivery?: Delivery) {
  if (!session.authenticated || session.role !== 'ADMIN' || !session.permissions.includes('manage_users')) fail('Forbidden', 403)
  const deliver = delivery ?? authDelivery(), temporary = `Aa1!${tokenValue()}`, hash = await hashPassword(temporary)
  return (await demoRepository().transaction(["user_accounts","sessions","password_reset_tokens","audit_logs","auth_rate_limits","villages","ubnd_village_assignments","provider_profiles","provider_profile_versions","agency_registration_requests","agency_review_records","registration_submission_versions","registration_resubmission_tokens","agency_profiles","stored_files","registration_documents"], tables => {
    const account = rows(tables, 'user_accounts').find(row => row.user_id === userId)
    if (!account || (session.adminType !== 'HDT' && !(session.adminType === 'UBND' && account.role_code === 'Local_Provider' && rows(tables, 'provider_profiles').some(row => row.user_id === userId && row.village_id === session.assignedVillageId)))) fail('Forbidden', 403)
    deliver({ kind: 'temporary-password', to: account.email, temporary_password: temporary })
    account.password_hash = hash; account.must_change_password = 'true'; account.updated_at = new Date().toISOString()
    revoke(tables, userId); audit(tables, session.userId!, 'ADMIN_PASSWORD_RESET', userId)
    return { success: true, email_delivery_status: 'Dev outbox' }
  }))
}

// Tokens are hashed at rest; only the delivery adapter sees the opaque edit link.
export function issueResubmission(tables: Record<string, DemoRow[]>, id: string, deliver: Delivery) {
  const request = rows(tables, 'agency_registration_requests').find(row => row.registration_request_id === id && row.current_status === 'Pending Approval')
  if (!request) fail('Registration is not pending', 409)
  const raw = tokenValue(), now = new Date().toISOString()
  deliver({ kind: 'revise-registration', to: request.email, token: raw, path: `/register/revise?token=${encodeURIComponent(raw)}` })
  for (const token of rows(tables, 'registration_resubmission_tokens')) if (token.registration_request_id === id && !token.used_at && !token.invalidated_at) token.invalidated_at = now
  rows(tables, 'registration_resubmission_tokens').push({ token_id: randomUUID(), registration_request_id: id, token_verifier: verifier(raw), issued_at: now, expires_at: new Date(Date.parse(now) + 86400000).toISOString(), used_at: '', invalidated_at: '' })
}

function resubmissionContext(tables: Record<string, DemoRow[]>, token: string) {
  if (!token || token.length > 200) fail('Invalid or expired edit link', 403)
  const row = rows(tables, 'registration_resubmission_tokens').find(row => row.token_verifier === verifier(token) && !row.used_at && !row.invalidated_at && Date.parse(row.expires_at) > Date.now())
  const request = row && rows(tables, 'agency_registration_requests').find(item => item.registration_request_id === row.registration_request_id && item.current_status === 'Pending Approval')
  const latest = request && rows(tables, 'agency_review_records').filter(item => item.registration_request_id === request.registration_request_id).sort((a,b) => b.decided_at.localeCompare(a.decided_at))[0]
  if (!row || !request || latest?.decision !== 'Request More Information') fail('Invalid or expired edit link', 403)
  const version = rows(tables, 'registration_submission_versions').find(item => item.registration_request_id === request.registration_request_id && item.version_no === request.current_version_no)
  if (!version) fail('Submission not found', 404)
  return { row, request, version, comments: latest.comments }
}
export async function readResubmission(token: string) {
  const repo = demoRepository()
  return (await repo.transaction(["user_accounts","sessions","password_reset_tokens","audit_logs","auth_rate_limits","villages","ubnd_village_assignments","provider_profiles","provider_profile_versions","agency_registration_requests","agency_review_records","registration_submission_versions","registration_resubmission_tokens","agency_profiles","stored_files","registration_documents"], tables => {
    const { request, version, comments } = resubmissionContext(tables, token)
    return { registration_request_id: request.registration_request_id, comments, email: request.email, full_name: version.full_name, company_name: version.company_name, company_type: version.company_type, tax_id: version.tax_id, location: JSON.parse(version.location), contact_information: JSON.parse(version.contact_information), team_size: Number(version.team_size), tour_types: JSON.parse(version.tour_types) }
  }))
}
export async function resubmitRegistration(token: string, input: unknown, files: DemoRow[] = []) {
  const revised = registrationFields.omit({ password: true, confirm_password: true, email: true, registration_documents: true }).safeParse(input)
  if (!revised.success) fail('Check all company, contact and tour fields')
  return (await demoRepository().transaction(["user_accounts","sessions","password_reset_tokens","audit_logs","auth_rate_limits","villages","ubnd_village_assignments","provider_profiles","provider_profile_versions","agency_registration_requests","agency_review_records","registration_submission_versions","registration_resubmission_tokens","agency_profiles","stored_files","registration_documents"], tables => {
    const { row, request, version } = resubmissionContext(tables, token)
    const data = revised.data, now = new Date().toISOString(), id = request.registration_request_id, number = String(Number(request.current_version_no) + 1)
    if (rows(tables, 'agency_profiles').some(item => item.tax_id === data.tax_id && item.user_id !== request.agency_user_id)) fail('Tax ID already registered', 409)
    rows(tables, 'registration_submission_versions').push({ ...version, version_no: number, submitted_at: now, full_name: data.full_name, company_name: data.company_name, company_type: data.company_type, tax_id: data.tax_id, location: JSON.stringify(data.location), contact_information: JSON.stringify(data.contact_information), team_size: String(data.team_size), tour_types: JSON.stringify(data.tour_types) })
    if (files.length) {
      for (const file of files) {
        rows(tables, 'stored_files').push(file)
        rows(tables, 'registration_documents').push({ registration_request_id: id, version_no: number, file_id: file.file_id, document_type: 'Business Registration Certificate' })
      }
    } else for (const doc of [...rows(tables, 'registration_documents')]) if (doc.registration_request_id === id && doc.version_no === request.current_version_no) rows(tables, 'registration_documents').push({ ...doc, version_no: number })
    request.current_version_no = number; request.updated_at = now; row.used_at = now
    const account = rows(tables, 'user_accounts').find(item => item.user_id === request.agency_user_id)
    if (account?.account_status === 'Pending Approval') { account.full_name = data.full_name; account.updated_at = now }
    for (const item of rows(tables, 'registration_resubmission_tokens')) if (item.registration_request_id === id && !item.used_at) item.invalidated_at = now
    rows(tables, 'agency_profiles').filter(item => item.user_id === request.agency_user_id).forEach(profile => Object.assign(profile, { company_name: data.company_name, company_type: data.company_type, tax_id: data.tax_id, location: JSON.stringify(data.location), contact_info: JSON.stringify(data.contact_information), team_size: String(data.team_size), tour_types: JSON.stringify(data.tour_types), updated_at: now }))
    audit(tables, request.agency_user_id, 'REGISTRATION_RESUBMITTED', request.agency_user_id, { version_no: number })
    return { success: true, account_status: 'Pending Approval' }
  }))
}
