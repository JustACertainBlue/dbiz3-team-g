// Adapted from linh-daotruc's PR #11 registration/OTP business rules.
import { randomInt, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { demoRepository } from '../db/application-store'
import type { DemoRow } from '../demo/types'
import { registrationSchema } from './registration-validation'
import { hashPassword } from './password'

export type OtpDelivery = (message: { to: string; registration_request_id: string; otp: string; expires_at: string }) => void
export class RegistrationError extends Error {
  constructor(message: string, public status = 422) { super(message) }
}
function fail(message: string, status = 422): never { throw new RegistrationError(message, status) }
const table = (tables: Record<string, DemoRow[]>, name: string) => tables[name] ??= []

export async function submitRegistration(input: unknown, files: DemoRow[], deliver: OtpDelivery) {
  const parsed = registrationSchema.safeParse(input)
  if (!parsed.success) fail(parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '))
  const data = parsed.data
  const passwordHash = await hashPassword(data.password)
  const otp = String(randomInt(100000, 1000000))
  const otpHash = await hashPassword(otp)
  const id = randomUUID(), now = new Date().toISOString(), expires = new Date(Date.now() + 600000).toISOString()
  return (await demoRepository().transaction(["user_accounts","agency_profiles","agency_registration_requests","registration_submission_versions","registration_otp_challenges","stored_files","registration_documents","audit_logs"], tables => {
    const email = data.email.trim().toLowerCase()
    if (table(tables, 'user_accounts').some(row => row.email.toLowerCase() === email)
      || table(tables, 'agency_registration_requests').some(row => row.email.toLowerCase() === email)) fail('Email already exists')
    if (table(tables, 'agency_profiles').some(row => row.tax_id === data.tax_id)
      || table(tables, 'registration_submission_versions').some(row => row.tax_id === data.tax_id)) fail('Tax ID already registered')
    if (!files.length) fail('Registration document required')
    deliver({ to: email, registration_request_id: id, otp, expires_at: expires })
    table(tables, 'agency_registration_requests').push({ registration_request_id: id, email, pending_password_hash: passwordHash, current_status: 'Awaiting OTP', agency_user_id: '', current_version_no: '1', created_at: now, updated_at: now })
    table(tables, 'registration_submission_versions').push({ registration_request_id: id, version_no: '1', submitted_at: now, submitted_by: '', full_name: data.full_name, company_name: data.company_name, company_type: data.company_type, tax_id: data.tax_id, location: JSON.stringify(data.location), contact_information: JSON.stringify(data.contact_information), team_size: String(data.team_size), tour_types: JSON.stringify(data.tour_types) })
    for (const file of files) {
      table(tables, 'stored_files').push(file)
      table(tables, 'registration_documents').push({ registration_request_id: id, version_no: '1', file_id: file.file_id, document_type: 'Business Registration Certificate' })
    }
    table(tables, 'registration_otp_challenges').push({ challenge_id: randomUUID(), registration_request_id: id, email, otp_verifier: otpHash, issued_at: now, expires_at: expires, used_at: '', invalidated_at: '', attempt_count: '0', resend_sequence: '0' })
    return { registration_request_id: id, is_valid: true }
  }))
}

export async function verifyRegistration(id: string, code: string) {
  if (!/^[0-9]{6}$/.test(code)) fail('Invalid OTP')
  // Return rejected attempts instead of throwing inside the transaction so the counter persists.
  const result = (await demoRepository().transaction(["user_accounts","agency_profiles","agency_registration_requests","registration_submission_versions","registration_otp_challenges","stored_files","registration_documents","audit_logs"], tables => {
    const request = table(tables, 'agency_registration_requests').find(row => row.registration_request_id === id)
    if (!request || request.current_status !== 'Awaiting OTP' || request.agency_user_id) return { error: 'Verification Failed' }
    const challenge = table(tables, 'registration_otp_challenges').find(row => row.registration_request_id === id && !row.used_at && !row.invalidated_at)
    if (!challenge) return { error: 'Verification Failed' }
    if (Number(challenge.attempt_count) >= 5) return { error: 'Maximum Attempts Exceeded' }
    if (Date.parse(challenge.expires_at) <= Date.now()) return { error: 'Expired OTP' }
    if (!bcrypt.compareSync(code, challenge.otp_verifier)) {
      challenge.attempt_count = String(Number(challenge.attempt_count) + 1)
      return { error: Number(challenge.attempt_count) >= 5 ? 'Maximum Attempts Exceeded' : 'Invalid OTP' }
    }
    const version = table(tables, 'registration_submission_versions').find(row => row.registration_request_id === id && row.version_no === request.current_version_no)
    if (!version || !request.pending_password_hash) return { error: 'Verification Failed' }
    if (table(tables, 'user_accounts').some(row => row.email.toLowerCase() === request.email.toLowerCase())) return { error: 'Email already exists' }
    if (table(tables, 'agency_profiles').some(row => row.tax_id === version.tax_id)) return { error: 'Tax ID already registered' }
    const userId = randomUUID(), agencyId = randomUUID(), now = new Date().toISOString()
    table(tables, 'user_accounts').push({ user_id: userId, email: request.email, password_hash: request.pending_password_hash, role_code: 'Tour_Agency', admin_type: '', account_status: 'Pending Approval', full_name: version.full_name, title: '', phone: '', avatar_file_id: '', must_change_password: 'false', password_changed_at: now, last_login: '', created_at: now, updated_at: now })
    table(tables, 'agency_profiles').push({ agency_id: agencyId, user_id: userId, registration_request_id: id, company_name: version.company_name, company_type: version.company_type, tax_id: version.tax_id, location: version.location, description: '', contact_info: version.contact_information, team_size: version.team_size, tour_types: version.tour_types, created_at: now, updated_at: now })
    challenge.used_at = now
    request.current_status = 'Pending Approval'; request.agency_user_id = userId; request.pending_password_hash = ''; request.updated_at = now
    table(tables, 'audit_logs').push({ audit_id: randomUUID(), actor_user_id: userId, action: 'AGENCY_REGISTRATION_COMPLETED', target_type: 'UserAccount', target_id: userId, occurred_at: now, change_or_result: JSON.stringify({ status: 'Pending Approval' }) })
    return { otp_verified: true, account_status: 'Pending Approval', user_id: userId, agency_account_id: agencyId, confirmation_email_status: 'Not configured' }
  }))
  if ('error' in result) fail(result.error!)
  return result
}

export async function resendRegistrationOtp(id: string, deliver: OtpDelivery) {
  const otp = String(randomInt(100000, 1000000)), hash = await hashPassword(otp)
  return (await demoRepository().transaction(["user_accounts","agency_profiles","agency_registration_requests","registration_submission_versions","registration_otp_challenges","stored_files","registration_documents","audit_logs"], tables => {
    const request = table(tables, 'agency_registration_requests').find(row => row.registration_request_id === id && row.current_status === 'Awaiting OTP')
    if (!request) fail('Verification Failed')
    const challenges = table(tables, 'registration_otp_challenges').filter(row => row.registration_request_id === id)
    const first = challenges.find(row => row.resend_sequence === '0')
    const sequence = Math.max(-1, ...challenges.map(row => Number(row.resend_sequence))) + 1
    if (!first || Date.now() - Date.parse(first.issued_at) >= 900000 || sequence > 3) fail('Resend Limit Exceeded', 429)
    const now = new Date().toISOString(), expires = new Date(Date.now() + 600000).toISOString()
    deliver({ to: request.email, registration_request_id: id, otp, expires_at: expires })
    for (const row of challenges) if (!row.used_at && !row.invalidated_at) row.invalidated_at = now
    table(tables, 'registration_otp_challenges').push({ challenge_id: randomUUID(), registration_request_id: id, email: request.email, otp_verifier: hash, issued_at: now, expires_at: expires, used_at: '', invalidated_at: '', attempt_count: '0', resend_sequence: String(sequence) })
    return { resent: true }
  }))
}
