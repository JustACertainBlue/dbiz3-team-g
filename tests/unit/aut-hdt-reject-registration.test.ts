import { beforeEach, describe, expect, it } from 'vitest'
import { POST as review } from '@/app/api/auth/agency-reviews/route'
import { submitRegistration, verifyRegistration } from '@/lib/auth/registration-service'
import { authenticateAccount } from '@/lib/auth/product-session'
import { demoRepository } from '@/lib/demo/json-repository'

// Issue #60. spec-AUT US-6 AS-3: "When HDT selects Reject, status becomes Rejected and the rejection reason is
// recorded." FR-018 §5.1: review_comment is required when decision = Reject (also Q12, Closed); only HDT
// reviews registrations. Exercised through POST /api/auth/agency-reviews (kind = registration).
const input = {
  full_name: 'Rejected Agency', email: 'reject-me@example.invalid', password: 'Secure123!', confirm_password: 'Secure123!',
  company_name: 'Agency To Reject', company_type: 'Travel Agency', tax_id: '9999999922', team_size: 3,
  location: { street: '2 Hang Bac', ward: 'Hang Bac', district: 'Hoan Kiem', city_province: 'Ha Noi' },
  contact_information: { contact_person_name: 'Rejected Agency', phone_number: '+84900000005' }, tour_types: ['Culinary'], registration_documents: [{}],
}
const files = [{ file_id: 'reject-file', storage_key: 'registration-documents/reject-file', file_name: 'certificate.pdf', media_type: 'application/pdf', file_size_bytes: '50' }]
const repo = () => demoRepository()
let requestId = '', userId = ''

async function decide(account: string, decision: string, comment: string) {
  const response = await review(new Request('http://localhost:3000/api/auth/agency-reviews', {
    method: 'POST', headers: { cookie: `hab_demo_account=${account}`, 'content-type': 'application/json' },
    body: JSON.stringify({ id: requestId, kind: 'registration', decision, comment }),
  }))
  return { status: response.status, body: await response.json() as any }
}
const registration = () => repo().find('agency_registration_requests', row => row.registration_request_id === requestId)!
const account = () => repo().find('user_accounts', row => row.user_id === userId)!
const records = () => repo().all('agency_review_records').filter(row => row.registration_request_id === requestId)

describe('#60 spec-AUT US-6 AS-3 / FR-018 | HDT rejects an Agency registration', () => {
  beforeEach(async () => {
    repo().reset()
    let otp = ''
    requestId = (await submitRegistration(input, files, message => { otp = message.otp })).registration_request_id
    userId = (await verifyRegistration(requestId, otp)).user_id
    expect(registration().current_status).toBe('Pending Approval')
  }, 15000)

  it('US-6 AS-3 (normal): Reject with a reason sets the registration and the account to Rejected and records the reason and the HDT reviewer', async () => {
    const res = await decide('hdt', 'Reject', 'Giấy phép kinh doanh không hợp lệ.')
    expect(res.status).toBe(200)
    expect(registration().current_status).toBe('Rejected')
    expect(account().account_status).toBe('Rejected')
    expect(records()).toEqual([expect.objectContaining({ decision: 'Reject', comments: 'Giấy phép kinh doanh không hợp lệ.', hdt_user_id: expect.any(String) })])
    expect((await authenticateAccount(input.email, input.password)).ok).toBe(false)
  })

  it.each(['', '   '])('FR-018 §5.1 (boundary): Reject with an empty or blank reason (%j) is refused and nothing changes', async comment => {
    const res = await decide('hdt', 'Reject', comment)
    expect(res.status).toBe(409)
    expect(registration().current_status).toBe('Pending Approval')
    expect(account().account_status).toBe('Pending Approval')
    expect(records()).toHaveLength(0)
  })

  it('FR-018 (boundary): a rejected registration cannot be decided again (Approve afterwards is refused)', async () => {
    expect((await decide('hdt', 'Reject', 'Thiếu hồ sơ.')).status).toBe(200)
    expect((await decide('hdt', 'Approve', '')).status).toBe(409)
    expect(account().account_status).toBe('Rejected')
    expect(records()).toHaveLength(1)
  })

  it('FR-018 (error): UBND and the Agency itself cannot reject a registration (403); nothing changes', async () => {
    for (const actor of ['ubnd', 'agency', 'provider']) {
      expect((await decide(actor, 'Reject', 'Không phải HDT.')).status, actor).toBe(403)
    }
    expect(registration().current_status).toBe('Pending Approval')
    expect(records()).toHaveLength(0)
  })
})
