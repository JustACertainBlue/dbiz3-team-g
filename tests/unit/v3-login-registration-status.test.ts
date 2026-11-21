/**
 * UI v3 screens 18b, 18c (png/18b, png/18c): a correct password on an Agency account that is waiting, needs documents
 * or was rejected returns { status, reason, reviewed_at } and NO session. A wrong password keeps the generic error.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { POST as login } from '@/app/api/auth/login/route'
import { hashPassword } from '@/lib/auth/password'
import { demoRepository } from '@/lib/demo/json-repository'

const PASSWORD = 'Agency#2026ok'
const AGENCY = 'thanhvien14@example.invalid'
const repo = () => demoRepository()
const userId = () => repo().find('user_accounts', row => row.email === AGENCY)!.user_id

async function post(password = PASSWORD, email = AGENCY) {
  const response = await login(new Request('http://localhost:3000/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
  }))
  return { status: response.status, body: await response.json() as any, cookie: response.headers.get('set-cookie') }
}

function setRegistration(accountStatus: string, requestStatus: string, review?: { decision: string; comments: string; decided_at: string }) {
  repo().update('user_accounts', row => row.email === AGENCY, { account_status: accountStatus })
  repo().remove('agency_registration_requests', row => row.agency_user_id === userId())
  const id = 'aaaaaaaa-0000-4000-8000-000000000001'
  repo().remove('agency_review_records', row => row.registration_request_id === id)
  repo().insert('agency_registration_requests', { registration_request_id: id, email: AGENCY, pending_password_hash: '', current_status: requestStatus, agency_user_id: userId(), current_version_no: '1', created_at: '2026-11-12T09:00:00+07:00', updated_at: '2026-11-12T09:00:00+07:00' })
  if (review) repo().insert('agency_review_records', { review_id: 'bbbbbbbb-0000-4000-8000-000000000001', registration_request_id: id, registration_version_no: '1', major_change_id: '', hdt_user_id: 'x', ...review })
}

describe('login returns the registration status only after the right password', () => {
  beforeEach(async () => {
    repo().reset()
    repo().update('user_accounts', row => row.email === AGENCY, { password_hash: await hashPassword(PASSWORD), must_change_password: 'false' })
  })

  it('waiting: status "pending", no reason, no session cookie', async () => {
    setRegistration('Pending Approval', 'Pending Approval')
    const res = await post()
    expect(res.status).toBe(403)
    expect(res.body.registration_status).toEqual({ status: 'pending', reason: '', reviewed_at: '' })
    expect(res.cookie ?? '').not.toContain('hab_session=')
    expect(res.body.data).toBeUndefined()
  })

  it('needs documents: Pending Approval whose last review is "Request More Information" gives status "revise" with the reviewer comment and time', async () => {
    setRegistration('Pending Approval', 'Pending Approval', { decision: 'Request More Information', comments: 'Bản mờ phần mã số thuế.', decided_at: '2026-11-13T10:15:00+07:00' })
    const res = await post()
    expect(res.body.registration_status).toEqual({ status: 'revise', reason: 'Bản mờ phần mã số thuế.', reviewed_at: '2026-11-13T10:15:00+07:00' })
  })

  it('rejected: status "rejected" with the reason and time', async () => {
    setRegistration('Rejected', 'Rejected', { decision: 'Reject', comments: 'MST không khớp.', decided_at: '2026-11-13T15:40:00+07:00' })
    const res = await post()
    expect(res.status).toBe(403)
    expect(res.body.registration_status).toEqual({ status: 'rejected', reason: 'MST không khớp.', reviewed_at: '2026-11-13T15:40:00+07:00' })
    expect(res.body.error_message).toBe('Account not approved')
  })

  it('carries only status, reason and reviewed_at (nothing else about the registration)', async () => {
    setRegistration('Rejected', 'Rejected', { decision: 'Reject', comments: 'x', decided_at: '2026-11-13T15:40:00+07:00' })
    const res = await post()
    expect(Object.keys(res.body.registration_status).sort()).toEqual(['reason', 'reviewed_at', 'status'])
  })

  it.each(['Pending Approval', 'Rejected'])('wrong password on a %s account: generic error, no registration_status, no status in the body', async status => {
    setRegistration(status, status, { decision: 'Reject', comments: 'Lý do riêng.', decided_at: '2026-11-13T15:40:00+07:00' })
    const res = await post('Wrong#2026ok')
    expect(res.status).toBe(401)
    expect(res.body.error_message).toBe('Invalid credentials')
    expect(res.body.registration_status).toBeUndefined()
    expect(JSON.stringify(res.body)).not.toMatch(/Lý do riêng|rejected|pending|revise/i)
  })

  it('unknown email: same generic error as a wrong password', async () => {
    const res = await post(PASSWORD, 'nobody@example.invalid')
    expect(res.status).toBe(401)
    expect(res.body.registration_status).toBeUndefined()
  })

  it('a Disabled account gets no registration_status (only the existing "Account disabled")', async () => {
    repo().update('user_accounts', row => row.email === AGENCY, { account_status: 'Disabled' })
    const res = await post()
    expect(res.body.error_message).toBe('Account disabled')
    expect(res.body.registration_status).toBeUndefined()
  })

  it('an Approved Agency still logs in normally', async () => {
    const res = await post()
    expect(res.status).toBe(200)
    expect(res.body.registration_status).toBeUndefined()
  })
})
