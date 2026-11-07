import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as register } from '@/app/api/register/route'
import { POST as resendOtp } from '@/app/api/register/resend-otp/route'
import { POST as forgot } from '@/app/api/auth/forgot-password/route'
import { withApplicationStore, type ApplicationStore } from '@/lib/db/application-store'
import { demoRepository as fixtureRepository } from '@/lib/demo/json-repository'
import { demoSessionContextFor } from '@/lib/auth/session'
import { createManagedAccount, resetManagedPassword } from '@/lib/auth/lifecycle'
import { reviewAgency } from '@/lib/auth/agency-review'
import { submitRegistration, verifyRegistration } from '@/lib/auth/registration-service'

// ADR 0001 and the spec-AUT EARS line (edge cases): on the hosted (production) build there is no email
// service. IF a flow needs to send an email and none is configured, THEN the system shows "Email chưa được
// cấu hình", creates no OTP, token, account or temporary password, and does not claim an email was sent.
// HAB_EMAIL_MODE=dev-outbox is set on purpose: production must refuse it.
// Every call runs inside withApplicationStore(fixtures), so NODE_ENV=production never reaches a real database.
const fixtures: ApplicationStore = {
  all: async name => fixtureRepository().all(name),
  find: async (name, predicate) => fixtureRepository().find(name, predicate),
  snapshot: async names => fixtureRepository().snapshot(names),
  insert: async (name, row) => fixtureRepository().insert(name, row),
  update: async (name, predicate, changes) => fixtureRepository().update(name, predicate, changes),
  remove: async (name, predicate) => fixtureRepository().remove(name, predicate),
  applyBatch: async operations => fixtureRepository().applyBatch(operations),
  transaction: async (_names, work) => fixtureRepository().transaction(work),
  atomic: async (_names, work) => work(),
}
const inFixtures = <T>(work: () => Promise<T>) => withApplicationStore(fixtures, work)
const asProduction = <T>(work: () => Promise<T>) => {
  vi.stubEnv('NODE_ENV', 'production')
  return inFixtures(work).finally(() => vi.stubEnv('NODE_ENV', 'test'))
}

// Built under NODE_ENV=test in beforeEach: demo identities resolve to Guest when NODE_ENV=production.
let HDT: Awaited<ReturnType<typeof demoSessionContextFor>>
const NOT_CONFIGURED = /Email chưa được cấu hình/
const repo = () => fixtureRepository()
const count = (table: string) => repo().all(table).length
const json = (path: string, body: unknown) =>
  new Request(`http://localhost${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const input = {
  full_name: 'Applicant', email: 'no-email@example.invalid', password: 'Secure123!', confirm_password: 'Secure123!',
  company_name: 'Synthetic Travel', company_type: 'Travel Agency', tax_id: '9998887770',
  location: { street: 'Street', ward: 'Ward', district: 'District', city_province: 'Hanoi' },
  contact_information: { contact_person_name: 'Applicant', phone_number: '0912345678' }, team_size: 2,
  tour_types: ['Cultural/Heritage'], registration_documents: [{}],
}
async function pendingRegistration() {
  let code = ''
  const submitted = await inFixtures(() => submitRegistration(input, [{ file_id: 'f1', storage_key: 'private', file_name: 'a.pdf' }], m => { code = m.otp }))
  return { id: submitted.registration_request_id as string, code }
}

describe('ADR 0001 / spec-AUT EARS | email flows without an email service (production, fixture store)', () => {
  beforeEach(async () => {
    repo().reset(); vi.stubEnv('HAB_EMAIL_MODE', 'dev-outbox')
    HDT = await inFixtures(() => demoSessionContextFor('hdt'))
  })
  afterEach(() => vi.unstubAllEnvs())

  it('F-AUTH-01/02 registration: 503 "Email chưa được cấu hình", no request, OTP or file stored', async () => {
    const before = [count('agency_registration_requests'), count('registration_otp_challenges'), count('stored_files')]
    const form = new FormData()
    form.set('email', 'no-email@example.invalid')
    form.append('registration_documents', new File(['%PDF-1.4'], 'doc.pdf', { type: 'application/pdf' }))
    const response = await asProduction(() => register(new Request('http://localhost/api/register', { method: 'POST', body: form })))
    expect(response.status).toBe(503)
    expect((await response.json()).message).toMatch(NOT_CONFIGURED)
    expect([count('agency_registration_requests'), count('registration_otp_challenges'), count('stored_files')]).toEqual(before)
  })

  it('F-AUTH-23 resend OTP: 503 "Email chưa được cấu hình", the existing OTP is not replaced', async () => {
    const { id, code } = await pendingRegistration()
    expect(code).toHaveLength(6)
    const challenges = JSON.stringify(repo().all('registration_otp_challenges'))
    const response = await asProduction(() => resendOtp(json('/api/register/resend-otp', { registration_request_id: id })))
    expect(response.status).toBe(503)
    expect((await response.json()).error_message).toMatch(NOT_CONFIGURED)
    expect(JSON.stringify(repo().all('registration_otp_challenges'))).toBe(challenges)
  })

  it('F-AUTH-11 forgot password: 503 "Email chưa được cấu hình", no reset token', async () => {
    const before = count('password_reset_tokens')
    const response = await asProduction(() => forgot(json('/api/auth/forgot-password', { email: 'thanhvien13@example.invalid' })))
    expect(response.status).toBe(503)
    expect(JSON.stringify(await response.json())).toMatch(NOT_CONFIGURED)
    expect(count('password_reset_tokens')).toBe(before)
  })

  it('F-AUTH-19 create UBND account: refused with "Email chưa được cấu hình", no account or temporary password', async () => {
    const before = count('user_accounts')
    await expect(asProduction(() => createManagedAccount(HDT, 'ubnd', {
      // Valid input (Bát Tràng village id), so the request reaches the email check instead of the 400 validation.
      name: 'UBND Test', email: 'ubnd-new@example.invalid', phone: '+84900000003', village_id: '20896522-6235-5699-aeaf-f48b8150d895',
    }))).rejects.toMatchObject({ status: 503, message: expect.stringMatching(NOT_CONFIGURED) })
    expect(count('user_accounts')).toBe(before)
  })

  it('F-AUTH-22 admin password reset: refused with "Email chưa được cấu hình", password unchanged', async () => {
    const target = repo().find('user_accounts', row => row.email === 'thanhvien19@example.invalid')!
    await expect(asProduction(() => resetManagedPassword(HDT, target.user_id)))
      .rejects.toMatchObject({ status: 503, message: expect.stringMatching(NOT_CONFIGURED) })
    expect(repo().find('user_accounts', row => row.user_id === target.user_id)!.password_hash).toBe(target.password_hash)
  })

  it('F-AUTH-26 Request More Information: decision recorded, no edit token, delivery reported as not configured', async () => {
    const { id, code } = await pendingRegistration()
    await inFixtures(() => verifyRegistration(id, code))
    const result = await asProduction(() => reviewAgency(HDT, id, 'registration', 'Request More Information', 'Add licence'))
    expect(result.email_delivery_status).toBe('Not configured')
    expect(repo().all('registration_resubmission_tokens').filter(r => r.registration_request_id === id)).toHaveLength(0)
  })
})
