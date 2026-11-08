import { beforeEach, describe, expect, it } from 'vitest'
import { updateAgencyProfile } from '@/lib/prf/agency-service'
import { reviewAgency } from '@/lib/auth/agency-review'
import { demoSessionContextFor } from '@/lib/auth/session'
import { demoRepository } from '@/lib/demo/json-repository'

// Issue #83. spec-AUT FR-018 lets HDT answer a major Agency change (PRF BR-017) with Approve, Request More
// Information or Reject. The schema (major_change_reviewed_chk) says Pending Review / Request More Information have
// no reviewed_at, Approved / Rejected have one. The JSON fixture does not enforce the CHECK, so this test asserts the
// rule directly; tests/postgres/agency-major-change.test.ts runs the same flow on PostgreSQL.
const AGENCY = '02e568d8-d65e-54b1-a554-b411150d1dcb'
const repo = () => demoRepository()
const change = () => repo().all('agency_major_change_requests').filter(row => row.agency_id === AGENCY).at(-1)!

async function proposeAndDecide(decision: string, comment: string) {
  await updateAgencyProfile(AGENCY, await demoSessionContextFor('agency'), { company_name: 'Tên pháp lý mới #83' })
  return reviewAgency(await demoSessionContextFor('hdt'), change().major_change_id, 'change', decision, comment)
}

describe('#83 AUT FR-018 / PRF BR-017 | HDT decision on a major Agency change keeps reviewed_at consistent', () => {
  beforeEach(() => repo().reset())

  it('FR-018 (normal): Request More Information keeps the change open: status Request More Information, no reviewed_at', async () => {
    await proposeAndDecide('Request More Information', 'Gửi giấy phép đổi tên.')
    expect(change()).toMatchObject({ review_status: 'Request More Information' })
    expect(change().reviewed_at ?? '').toBe('')
  })

  it.each([['Approve', 'Approved', ''], ['Reject', 'Rejected', 'Không khớp hồ sơ.']])('FR-018 (boundary): %s closes the change with reviewed_at set', async (decision, status, comment) => {
    await proposeAndDecide(decision, comment)
    expect(change().review_status).toBe(status)
    expect(change().reviewed_at).not.toBe('')
  })

  it('FR-018 (error): Request More Information without a comment is refused and the change stays Pending Review without reviewed_at', async () => {
    await expect(proposeAndDecide('Request More Information', '  ')).rejects.toThrow('INVALID_REVIEW')
    expect(change()).toMatchObject({ review_status: 'Pending Review' })
    expect(change().reviewed_at ?? '').toBe('')
  })
})
