import { beforeEach, describe, expect, it } from 'vitest'
import { GET as getAgency, PATCH as patchAgency } from '@/app/api/prf/agency/[agencyId]/route'
import { GET as listReviews, POST as review } from '@/app/api/auth/agency-reviews/route'
import { demoRepository } from '@/lib/demo/json-repository'

// Integration contract §9 "AUT ↔ PRF: Agency major legal change review" (docs/test/integration-contract.md).
// PRF FR-002 / BR-017: Company Name and Tax ID changes wait for HDT; the approved values stay in effect
// and the account stays Approved. AUT FR-018: HDT approves (values applied, Tax ID unique) or rejects
// (changes discarded); a comment is required unless Approve; only HDT reviews.
const AGENCY = '02e568d8-d65e-54b1-a554-b411150d1dcb' // demo Agency, Công ty Du lịch Tràng An
const repo = () => demoRepository()
const request = (url: string, account: string, method = 'GET', body?: unknown) => new Request(`http://localhost:3000${url}`, {
  method, headers: { cookie: `hab_demo_account=${account}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
})
const ctx = { params: { agencyId: AGENCY } }
async function patch(body: unknown) {
  const response = await patchAgency(request(`/api/prf/agency/${AGENCY}`, 'agency', 'PATCH', body), ctx)
  return { status: response.status, body: await response.json() as any }
}
const profile = () => repo().find('agency_profiles', p => p.agency_id === AGENCY)!
const pendingChanges = () => repo().all('agency_major_change_requests').filter(c => c.agency_id === AGENCY && c.review_status === 'Pending Review')
async function decide(account: string, id: string, decision: string, comment = '') {
  const response = await review(request('/api/auth/agency-reviews', account, 'POST', { id, kind: 'change', decision, comment }))
  return { status: response.status, body: await response.json() as any }
}

describe('Contract AUT ↔ PRF | Agency major legal change review (integration-contract §9)', () => {
  beforeEach(() => repo().reset())

  it('PRF FR-002 / BR-017 → AUT FR-018 (normal): a Company Name change waits for HDT, then Approve applies it', async () => {
    const oldName = profile().company_name
    const saved = await patch({ company_name: 'Công ty Du lịch Tràng An Mới' })
    expect(saved).toMatchObject({ status: 200, body: { requires_hdt_rereview: true, account_status: 'Approved' } })
    expect(profile().company_name).toBe(oldName)
    const change = pendingChanges()[0]
    const listed = (await (await listReviews(request('/api/auth/agency-reviews', 'hdt'))).json()).data
    expect(listed).toContainEqual(expect.objectContaining({ id: change.major_change_id, kind: 'change', status: 'Pending Review' }))
    expect((await decide('hdt', change.major_change_id, 'Approve')).status).toBe(200)
    const shown = await (await getAgency(request(`/api/prf/agency/${AGENCY}`, 'agency'), ctx)).json()
    expect(shown.agency_name).toBe('Công ty Du lịch Tràng An Mới')
  })

  it('PRF BR-017 (boundary): a minor field, or the same Company Name again, needs no HDT review', async () => {
    expect((await patch({ description: 'Mô tả mới, không phải thay đổi pháp lý.' })).body.requires_hdt_rereview).toBe(false)
    expect((await patch({ company_name: profile().company_name })).body.requires_hdt_rereview).toBe(false)
    expect(pendingChanges()).toHaveLength(0)
  })

  it('AUT FR-018 Reject (boundary): rejected changes are discarded, and the same request cannot be decided twice', async () => {
    const before = { company_name: profile().company_name, tax_id: profile().tax_id }
    await patch({ company_name: 'Tên bị từ chối', tax_id: '0109999999' })
    const id = pendingChanges()[0].major_change_id
    expect((await decide('hdt', id, 'Reject', 'Giấy tờ không khớp.')).status).toBe(200)
    expect({ company_name: profile().company_name, tax_id: profile().tax_id }).toEqual(before)
    expect((await decide('hdt', id, 'Approve')).status).toBe(409)
    expect(profile().company_name).toBe(before.company_name)
  })

  it('AUT FR-018 (error): only HDT may review, Reject needs a comment, and a Tax ID already used by another Agency is refused on Approve', async () => {
    const otherTaxId = repo().all('agency_profiles').find(p => p.agency_id !== AGENCY && p.tax_id)!.tax_id
    const before = profile().tax_id
    await patch({ tax_id: otherTaxId })
    const id = pendingChanges()[0]?.major_change_id
    expect(id).toBeDefined()
    expect((await decide('ubnd', id, 'Approve')).status).toBe(403)
    expect((await decide('agency', id, 'Approve')).status).toBe(403)
    expect((await decide('hdt', id, 'Reject')).status).toBe(409)
    expect((await decide('hdt', id, 'Approve')).status).toBe(409)
    expect(profile().tax_id).toBe(before)
    expect(pendingChanges().map(c => c.major_change_id)).toEqual([id])
  })

  // Issue #84: the profile PATCH is the only way a major change is created (PRF FR-002); a separate
  // POST .../major-change must not answer 201 "created" while writing nothing.
  it('PRF FR-002 (issue #84): POST /api/prf/agency/[agencyId]/major-change no longer answers 201 without writing a request', async () => {
    const routeModule = '@/app/api/prf/agency/[agencyId]/major-change/route'
    const stub = await import(/* @vite-ignore */ routeModule).catch(() => null)
    if (stub) {
      const before = repo().all('agency_major_change_requests').length
      const response = await stub.POST(request(`/api/prf/agency/${AGENCY}/major-change`, 'agency', 'POST', { company_name: 'Tên mới' }), ctx)
      expect({ status: response.status, written: repo().all('agency_major_change_requests').length - before })
        .not.toEqual({ status: 201, written: 0 })
    }
    expect(stub, 'the stub route module should be removed').toBeNull()
  })
})
