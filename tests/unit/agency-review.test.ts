import { it, expect, describe } from 'vitest'
import { agencyReviews, reviewAgency } from '../../src/lib/auth/agency-review'
import { demoSessionContextFor } from '../../src/lib/auth/session'
import { demoRepository } from '../../src/lib/demo/json-repository'

describe('Agency review', () => {
  it('rejects UBND and guests', async () => {
    ;(await expect(async () => (await agencyReviews((await demoSessionContextFor('ubnd'))))).rejects.toThrow('FORBIDDEN'))
    ;(await expect(async () => (await agencyReviews((await demoSessionContextFor('guest'))))).rejects.toThrow('FORBIDDEN'))
  })
  it('applies approved legal changes without changing account status; rejects stale decisions', async () => {
    const repo = demoRepository()
    const actor = (await demoSessionContextFor('hdt'))
    const agency = repo.all('agency_profiles')[0]
    const before = repo.find('user_accounts', row => row.user_id === agency.user_id)!.account_status
    repo.insert('agency_major_change_requests', { major_change_id:'review-test', agency_id:agency.agency_id, proposed_company_name:'Synthetic Reviewed Name', proposed_tax_id:'', review_status:'Pending Review', submitted_at:new Date().toISOString(), reviewed_at:'' })
    ;(await expect(async () => (await reviewAgency(actor,'review-test','change','Reject',''))).rejects.toThrow('INVALID_REVIEW'))
    ;(await reviewAgency(actor,'review-test','change','Approve',''))
    expect(repo.find('agency_profiles', row => row.agency_id === agency.agency_id)?.company_name).toBe('Synthetic Reviewed Name')
    expect(repo.find('user_accounts', row => row.user_id === agency.user_id)?.account_status).toBe(before)
    ;(await expect(async () => (await reviewAgency(actor,'review-test','change','Reject','Late'))).rejects.toThrow('STALE_REVIEW'))
    expect((await agencyReviews(actor)).find(item => item.id === 'review-test')?.history).toHaveLength(1)
  })
  it('keeps a request for more information pending and preserves approved legal data on rejection', async () => {
    const repo = demoRepository()
    const actor = (await demoSessionContextFor('hdt'))
    const registration = repo.all('agency_registration_requests')[0]
    repo.update('agency_registration_requests', row => row.registration_request_id === registration.registration_request_id, { current_status:'Pending Approval' })
    ;(await reviewAgency(actor, registration.registration_request_id, 'registration', 'Request More Information', 'Provide the missing document'))
    expect(repo.find('agency_registration_requests', row => row.registration_request_id === registration.registration_request_id)?.current_status).toBe('Pending Approval')
    const agency = repo.all('agency_profiles')[1]
    repo.insert('agency_major_change_requests', { major_change_id:'rejected-test', agency_id:agency.agency_id, proposed_company_name:'Rejected Synthetic Name', proposed_tax_id:'', review_status:'Pending Review', submitted_at:new Date().toISOString(), reviewed_at:'' })
    ;(await reviewAgency(actor, 'rejected-test', 'change', 'Reject', 'Invalid supporting evidence'))
    expect(repo.find('agency_profiles', row => row.agency_id === agency.agency_id)?.company_name).toBe(agency.company_name)
  })
})
