import { beforeEach, describe, expect, it } from 'vitest'
import { PATCH as patchAgency } from '@/app/api/prf/agency/[agencyId]/route'
import { reviewAgency } from '@/lib/auth/agency-review'
import { demoSessionContextFor } from '@/lib/auth/session'
import { demoRepository } from '@/lib/demo/json-repository'

// Issues #57 and #83. spec-AUT FR-018 (line approved 08/11): "For a major change, Request More Information closes
// the change like Reject (status Rejected, decision recorded as Request More Information); the Agency submits a
// new change from its profile." Schema: major_change_reviewed_chk (Rejected needs reviewed_at) and
// agency_one_pending_major_change_uq (one Pending Review / Request More Information row per Agency).
const AGENCY = '02e568d8-d65e-54b1-a554-b411150d1dcb' // demo Agency, Công ty Du lịch Tràng An
const repo = () => demoRepository()
const profile = () => repo().find('agency_profiles', p => p.agency_id === AGENCY)!
const changes = () => repo().all('agency_major_change_requests').filter(c => c.agency_id === AGENCY)
const open = () => changes().filter(c => ['Pending Review', 'Request More Information'].includes(c.review_status))
async function patch(body: unknown) {
  const request = new Request(`http://localhost:3000/api/prf/agency/${AGENCY}`, {
    method: 'PATCH', headers: { cookie: 'hab_demo_account=agency', 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
  return patchAgency(request, { params: { agencyId: AGENCY } })
}
async function proposeAndRequestMore(comment = 'Thiếu giấy phép kinh doanh mới.') {
  await patch({ company_name: 'Công ty Du lịch Tràng An Mới' })
  const id = open()[0].major_change_id
  const result = await reviewAgency(await demoSessionContextFor('hdt'), id, 'change', 'Request More Information', comment)
  return { id, result }
}

describe('#57 / #83 spec-AUT FR-018 | Request More Information on a major change closes it like Reject', () => {
  beforeEach(() => repo().reset())

  it('FR-018 (normal): the change is closed as Rejected with reviewed_at, the decision is recorded as Request More Information with the comment', async () => {
    const before = profile().company_name
    const { id, result } = await proposeAndRequestMore()
    expect(result.success).toBe(true)
    const change = changes().find(c => c.major_change_id === id)!
    expect(change.review_status).toBe('Rejected')
    expect(change.reviewed_at).not.toBe('')
    expect(repo().all('agency_review_records').filter(r => r.major_change_id === id).map(r => [r.decision, r.comments]))
      .toEqual([['Request More Information', 'Thiếu giấy phép kinh doanh mới.']])
    expect(profile().company_name).toBe(before)
  })

  it('FR-018 (normal): the Agency is notified to submit a new change from its profile', async () => {
    const { id } = await proposeAndRequestMore()
    const note = repo().all('notifications').filter(n => n.source_id === id).at(-1)!
    expect(note.recipient_user_id).toBe(profile().user_id)
    const payload = JSON.parse(note.payload)
    expect(payload).toMatchObject({ decision: 'Request More Information', comment: 'Thiếu giấy phép kinh doanh mới.' })
    expect(payload.next_step).toMatch(/gửi thay đổi mới/)
  })

  it('FR-018 / #83 (boundary): no open row is left, so the Agency can submit a new change and HDT sees exactly one pending request', async () => {
    const { id } = await proposeAndRequestMore()
    expect(open()).toHaveLength(0)
    expect((await patch({ company_name: 'Công ty Du lịch Tràng An Mới 2' })).status).toBe(200)
    expect(open().map(c => [c.review_status, c.proposed_company_name])).toEqual([['Pending Review', 'Công ty Du lịch Tràng An Mới 2']])
    expect(open()[0].major_change_id).not.toBe(id)
  })

  it('FR-018 (error): the closed change cannot be decided again, and Request More Information still needs a comment', async () => {
    const { id } = await proposeAndRequestMore()
    await expect(reviewAgency(await demoSessionContextFor('hdt'), id, 'change', 'Approve', '')).rejects.toThrow('STALE_REVIEW')
    await patch({ tax_id: '0109999998' })
    const next = open()[0].major_change_id
    await expect(reviewAgency(await demoSessionContextFor('hdt'), next, 'change', 'Request More Information', '  ')).rejects.toThrow('INVALID_REVIEW')
    expect(open().map(c => c.review_status)).toEqual(['Pending Review'])
  })
})
