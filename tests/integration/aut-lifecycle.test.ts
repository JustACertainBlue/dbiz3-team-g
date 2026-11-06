import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { demoSessionContextFor, sessionContextFromRequest } from '@/lib/auth/session'
import { createManagedAccount, changePassword, requestPasswordReset, resetPassword, resetManagedPassword, readResubmission, resubmitRegistration, verifier, type Delivery } from '@/lib/auth/lifecycle'
import { authenticateAccount, productSessionFromRequest, PRODUCT_SESSION_COOKIE, workspacePath } from '@/lib/auth/product-session'
import { hashPassword } from '@/lib/auth/password'
import { reviewAgency } from '@/lib/auth/agency-review'
import { submitRegistration, verifyRegistration } from '@/lib/auth/registration-service'
import { accountAction } from '@/lib/auth/admin-accounts'

const village = '12eb6828-903d-44df-a4c1-b1564c6587c0'
const request = (token: string, path = '/api/auth/session') => new Request(`http://localhost${path}`, { headers: { cookie: `${PRODUCT_SESSION_COOKIE}=${token}` } })
const input = { full_name: 'Applicant', email: 'revision@example.invalid', password: 'Secure123!', confirm_password: 'Secure123!', company_name: 'Synthetic Travel', company_type: 'Travel Agency', tax_id: '9998887776', location: { street: 'Street', ward: 'Ward', district: 'District', city_province: 'Hanoi' }, contact_information: { contact_person_name: 'Applicant', phone_number: '0912345678' }, team_size: 2, tour_types: ['Cultural/Heritage'], registration_documents: [{}] }

describe('PR #11 remaining AUT stories on the shared repository', () => {
  beforeEach(() => demoRepository().reset())
  it('HDT creates scoped UBND; first login requires password change; UBND creates Draft Provider', async () => {
    const repo = demoRepository(), messages: Record<string,string>[] = [], delivery: Delivery = value => { messages.push(value) }
    repo.insert('villages', { village_id: village, name: 'Synthetic village', is_active: 'true' })
    const user = await createManagedAccount(demoSessionContextFor('hdt'), 'ubnd', { name: 'Synthetic UBND', email: 'new-ubnd@example.invalid', phone: '0912345678', village_id: village }, delivery)
    const login = await authenticateAccount('new-ubnd@example.invalid', messages[0].temporary_password)
    expect(login.ok).toBe(true); if (!login.ok) return
    expect(workspacePath(login.identity)).toBe('/account/change-password')
    expect(sessionContextFromRequest(request(login.token, '/api/auth/users')).authenticated).toBe(false)
    const context = sessionContextFromRequest(request(login.token, '/api/auth/change-password'))
    expect(context).toMatchObject({ authenticated: true, role: 'ADMIN', adminType: 'UBND', assignedVillageId: village })
    await changePassword(context, messages[0].temporary_password, 'Changed123!', 'Changed123!')
    expect(productSessionFromRequest(request(login.token))).toBeNull()
    const renewed = await authenticateAccount('new-ubnd@example.invalid', 'Changed123!')
    expect(renewed.ok).toBe(true); if (!renewed.ok) return
    const ubnd = sessionContextFromRequest(request(renewed.token))
    await expect(createManagedAccount(ubnd, 'provider', { name: 'Wrong village', email: 'wrong@example.invalid', phone: '0912345678', village_id: 'a28d2842-b623-49ea-aac7-52e85a1d94ce', address: 'Street' }, delivery)).rejects.toThrow('assigned village')
    const provider = await createManagedAccount(ubnd, 'provider', { name: 'Synthetic Workshop', email: 'workshop@example.invalid', phone: '0912345678', village_id: village, address: 'Street' }, delivery)
    expect(repo.find('provider_profiles', row => row.provider_id === provider.provider_id)).toMatchObject({ verification_status: 'Draft', village_id: village, published_version_no: '' })
    expect(repo.find('user_accounts', row => row.user_id === user.user_id)?.must_change_password).toBe('false')
    await expect(createManagedAccount(demoSessionContextFor('hdt'), 'ubnd', { name: 'Duplicate', email: 'duplicate@example.invalid', phone: '0912345678', village_id: village }, delivery)).rejects.toThrow('already has')
  }, 20000)
  it('rejects wrong creators and rolls back all account records when delivery fails', async () => {
    const repo = demoRepository()
    await expect(createManagedAccount(demoSessionContextFor('provider'), 'ubnd', {}, () => {})).rejects.toThrow('Forbidden')
    await expect(createManagedAccount(demoSessionContextFor('hdt'), 'provider', {}, () => {})).rejects.toThrow('Forbidden')
    repo.insert('villages', { village_id: village, name: 'Synthetic', is_active: 'true' })
    await expect(createManagedAccount(demoSessionContextFor('hdt'), 'ubnd', { name:'Delivery Failure', email:'delivery-fail@example.invalid', phone:'0912345678', village_id:village }, () => { throw new Error('Delivery failure') })).rejects.toThrow('Delivery failure')
    expect(repo.find('user_accounts', row => row.email === 'delivery-fail@example.invalid')).toBeUndefined()
    expect(repo.find('ubnd_village_assignments', row => row.village_id === village)).toBeUndefined()
  })
  it('resets with a hashed single-use 15-minute token and revokes existing sessions', async () => {
    const repo = demoRepository(), account = repo.find('user_accounts', row => row.email === 'thanhvien13@example.invalid')!
    repo.update('user_accounts', row => row.user_id === account.user_id, { password_hash: await hashPassword('Original123!') })
    const login = await authenticateAccount(account.email, 'Original123!'); expect(login.ok).toBe(true)
    let token = ''
    const delivered = await requestPasswordReset(account.email, message => { token = message.token })
    const unknown = await requestPasswordReset('unknown@example.invalid', () => { throw new Error('Unknown emails must not be delivered') })
    expect(unknown).toEqual(delivered)
    const stored = repo.find('password_reset_tokens', row => row.user_id === account.user_id && !row.used_at)!
    expect(stored.token_verifier).not.toBe(token)
    expect(Date.parse(stored.expires_at) - Date.parse(stored.issued_at)).toBe(900000)
    await expect(resetPassword(token, 'weak', 'weak')).rejects.toThrow('Password must')
    await resetPassword(token, 'Recovered123!', 'Recovered123!')
    await expect(resetPassword(token, 'Again123!', 'Again123!')).rejects.toThrow('Invalid or expired')
    if (login.ok) expect(productSessionFromRequest(request(login.token))).toBeNull()
    expect((await authenticateAccount(account.email, 'Recovered123!')).ok).toBe(true)
  }, 15000)
  it('refuses expired tokens, mismatched confirmations and reset-rate overflow', async () => {
    const repo = demoRepository(), email = 'thanhvien13@example.invalid'
    let token = ''
    await requestPasswordReset(email, message => { token = message.token })
    repo.update('password_reset_tokens', row => row.token_verifier === verifier(token), { expires_at: new Date(Date.now() - 1).toISOString() })
    await expect(resetPassword(token, 'Recovered123!', 'Other123!')).rejects.toThrow('match')
    await expect(resetPassword(token, 'Recovered123!', 'Recovered123!')).rejects.toThrow('Invalid or expired')
    await requestPasswordReset(email, () => {}); await requestPasswordReset(email, () => {})
    await expect(requestPasswordReset(email, () => {})).rejects.toThrow('Too many')
  })
  it('revises the same request once with a 24-hour hashed token and preserves review/doc history', async () => {
    let code = '', token = ''
    const repo = demoRepository()
    const submitted = await submitRegistration(input, [{ file_id:'original-file', storage_key:'private', file_name:'original.pdf' }], message => { code = message.otp })
    const verified = verifyRegistration(submitted.registration_request_id, code)
    const actor = demoSessionContextFor('hdt')
    reviewAgency(actor, submitted.registration_request_id, 'registration', 'Request More Information', 'Correct company information', message => { token = message.token })
    const oldToken = token
    expect(readResubmission(token).company_name).toBe(input.company_name)
    reviewAgency(actor, submitted.registration_request_id, 'registration', 'Request More Information', 'Replacement link', message => { token = message.token })
    expect(() => readResubmission(oldToken)).toThrow('Invalid or expired')
    const row = repo.find('registration_resubmission_tokens', row => !row.used_at && !row.invalidated_at && row.registration_request_id === submitted.registration_request_id)!
    expect(row.token_verifier).not.toBe(token)
    expect(Date.parse(row.expires_at) - Date.parse(row.issued_at)).toBeGreaterThanOrEqual(86399000)
    resubmitRegistration(token, { ...input, full_name: 'Revised Applicant', company_name: 'Revised Synthetic Travel' }, [{ file_id:'replacement-file', storage_key:'private', file_name:'replacement.pdf' }])
    expect(() => resubmitRegistration(token, input)).toThrow('Invalid or expired')
    expect(repo.all('registration_submission_versions').filter(row => row.registration_request_id === submitted.registration_request_id)).toHaveLength(2)
    expect(repo.all('registration_documents').filter(row => row.registration_request_id === submitted.registration_request_id)).toHaveLength(2)
    expect(repo.find('user_accounts', row => row.user_id === verified.user_id)?.account_status).toBe('Pending Approval')
    expect(repo.find('user_accounts', row => row.user_id === verified.user_id)?.full_name).toBe('Revised Applicant')
    reviewAgency(actor, submitted.registration_request_id, 'registration', 'Approve', '')
    expect((await authenticateAccount(input.email, input.password)).ok).toBe(true)
  }, 15000)
  it('admin resets only an allowed target and restores the pre-disable status', async () => {
    const repo = demoRepository(), actor = demoSessionContextFor('hdt'), agency = repo.find('user_accounts', row => row.email === 'thanhvien13@example.invalid')!
    await expect(resetManagedPassword(demoSessionContextFor('ubnd'), agency.user_id, () => {})).rejects.toThrow('Forbidden')
    let temporary = ''
    const beforeHistory = repo.all('account_status_history').filter(row => row.user_id === agency.user_id).length
    await resetManagedPassword(actor, agency.user_id, message => { temporary = message.temporary_password })
    const login = await authenticateAccount(agency.email, temporary)
    expect(login.ok).toBe(true)
    accountAction(actor, agency.user_id, 'disable')
    if (login.ok) expect(productSessionFromRequest(request(login.token))).toBeNull()
    accountAction(actor, agency.user_id, 'enable')
    expect(repo.find('user_accounts', row => row.user_id === agency.user_id)?.account_status).toBe('Approved')
    expect(repo.all('account_status_history').filter(row => row.user_id === agency.user_id)).toHaveLength(beforeHistory + 2)
  }, 15000)
})
