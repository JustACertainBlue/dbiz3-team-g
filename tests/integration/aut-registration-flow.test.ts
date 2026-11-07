import { beforeEach, describe, expect, it } from 'vitest'
import { submitRegistration, verifyRegistration, resendRegistrationOtp, type OtpDelivery } from '@/lib/auth/registration-service'
import { demoRepository } from '@/lib/demo/json-repository'
import { authenticateAccount } from '@/lib/auth/product-session'
import { reviewAgency } from '@/lib/auth/agency-review'
import { demoSessionContextFor } from '@/lib/auth/session'

const input = { full_name: 'Agency Test', email: 'new-registration@example.invalid', password: 'Secure123!', confirm_password: 'Secure123!', company_name: 'Test Agency', company_type: 'Travel Agency', tax_id: '9999999999', location: { street: 'Street', ward: 'Ward', district: 'District', city_province: 'Hanoi' }, contact_information: { contact_person_name: 'Agency Test', phone_number: '0912345678' }, team_size: 2, tour_types: ['Cultural/Heritage'], registration_documents: [{}] }
const files = [{ file_id: 'test-file', storage_key: 'registration-documents/test-file', file_name: 'certificate.pdf', media_type: 'application/pdf', file_size_bytes: '50' }]

describe('AUT registration integrated with shared review and login', () => {
  beforeEach(() => demoRepository().reset())
  it('creates no account before OTP, then creates exactly one Pending account; HDT approval unlocks password login', async () => {
    let otp = ''
    const deliver: OtpDelivery = message => { otp = message.otp }
    const submitted = await submitRegistration(input, files, deliver)
    const repo = demoRepository()
    expect(repo.find('user_accounts', row => row.email === input.email)).toBeUndefined()
    const result = (await verifyRegistration(submitted.registration_request_id, otp))
    expect(result.account_status).toBe('Pending Approval')
    ;(await expect(async () => (await verifyRegistration(submitted.registration_request_id, otp))).rejects.toThrow('Verification Failed'))
    expect(repo.all('user_accounts').filter(row => row.email === input.email)).toHaveLength(1)
    expect(await authenticateAccount(input.email, input.password)).toEqual({ ok: false, reason: 'ACCOUNT_INACTIVE' })
    ;(await reviewAgency((await demoSessionContextFor('hdt')), submitted.registration_request_id, 'registration', 'Approve', ''))
    const login = await authenticateAccount(input.email, input.password)
    expect(login.ok).toBe(true)
    if (login.ok) expect(login.identity.agencyId).toBe(result.agency_account_id)
  }, 15000)
  it('persists failed attempts and locks the challenge on the fifth wrong code', async () => {
    let code = ''
    const { registration_request_id: id } = await submitRegistration(input, files, message => { code = message.otp })
    const wrong = code === '100000' ? '100001' : '100000'
    for (let attempt = 1; attempt <= 5; attempt++) (await expect(async () => (await verifyRegistration(id, wrong))).rejects.toThrow(attempt === 5 ? 'Maximum Attempts Exceeded' : 'Invalid OTP'))
    ;(await expect(async () => (await verifyRegistration(id, code))).rejects.toThrow('Maximum Attempts Exceeded'))
    expect(demoRepository().find('registration_otp_challenges', row => row.registration_request_id === id)?.attempt_count).toBe('5')
  }, 15000)
  it('rolls back a failed delivery and invalidates the previous code on resend', async () => {
    await expect(submitRegistration(input, files, () => { throw new Error('Delivery failed') })).rejects.toThrow('Delivery failed')
    expect(demoRepository().find('agency_registration_requests', row => row.email === input.email)).toBeUndefined()
    let latest = ''
    const deliver: OtpDelivery = message => { latest = message.otp }
    const { registration_request_id: id } = await submitRegistration(input, files, deliver)
    await resendRegistrationOtp(id, deliver)
    const challenges = demoRepository().all('registration_otp_challenges').filter(row => row.registration_request_id === id)
    expect(challenges.filter(row => !row.invalidated_at)).toHaveLength(1)
    expect(challenges.find(row => row.resend_sequence === '0')?.invalidated_at).toBeTruthy()
    expect((await verifyRegistration(id, latest)).otp_verified).toBe(true)
  }, 15000)
  it('rejects expired OTP and duplicate pending submissions without creating another request', async () => {
    let code = ''
    const deliver: OtpDelivery = message => { code = message.otp }
    const { registration_request_id: id } = await submitRegistration(input, files, deliver)
    await expect(submitRegistration(input, files, deliver)).rejects.toThrow('Email already exists')
    const repo = demoRepository()
    repo.update('registration_otp_challenges', row => row.registration_request_id === id, { expires_at: new Date(Date.now() - 1).toISOString() })
    ;(await expect(async () => (await verifyRegistration(id, code))).rejects.toThrow('Expired OTP'))
    expect(repo.all('agency_registration_requests').filter(row => row.email === input.email)).toHaveLength(1)
    expect(repo.find('user_accounts', row => row.email === input.email)).toBeUndefined()
  }, 15000)
})
