import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as dashboard } from '@/app/api/adm/dashboard/route'
import { POST as verifyRoute } from '@/app/api/prf/provider/[providerId]/verify/route'
import { listPendingVerification } from '@/lib/adm/pending-service'
import { reviewProvider } from '@/lib/prf/provider-service'
import { demoRepository } from '@/lib/demo/json-repository'
import { createUbndSession, SEED_ADMIN_IDS } from '../adm/helpers/mock-session'

// Integration contract §8 "PRF → ADM: pending verification list" (docs/test/integration-contract.md).
// The PRF verification state is what the ADM079 panel lists: ADM FR-008 / screen ADM079 panel, PRF BR-006
// (Pending Verification → Verified / Revision Required), PRF BR-005 (UBND reviews only its village),
// ADM BR-003 (UBND locked to its village), consistency-contract.md:50 (Agency registrations are platform-wide).
const PENDING_PROVIDER = '3a5d2ffc-79fa-5b75-a1e6-82beea3bed59' // seed: Pending Verification, Hạ Thái
const HA_THAI = SEED_ADMIN_IDS.haThaiVillageId // demo UBND (thanhvien8) is assigned here
const repo = () => demoRepository()
const request = (url: string, account: string, method = 'GET', body?: unknown) => new NextRequest(`http://localhost:3000${url}`, {
  method, headers: { cookie: `hab_demo_account=${account}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
})
async function pending(account: string) {
  const response = await dashboard(request('/api/adm/dashboard?preset=Last+30+days', account))
  expect(response.status).toBe(200)
  return (await response.json()).pendingVerification as Array<{ kind: string; id: string; name: string; villageId: string | null }>
}
const verify = (account: string, body: unknown) => verifyRoute(request(`/api/prf/provider/${PENDING_PROVIDER}/verify`, account, 'POST', body), { params: { providerId: PENDING_PROVIDER } })
const currentName = () => {
  const profile = repo().find('provider_profiles', p => p.provider_id === PENDING_PROVIDER)!
  return repo().find('provider_profile_versions', v => v.provider_id === PENDING_PROVIDER && v.version_no === profile.current_version_no)!.business_name
}

describe('Contract PRF → ADM | pending verification list (integration-contract §8)', () => {
  beforeEach(() => repo().reset())

  it('PRF BR-006 → ADM FR-008 (normal): a Provider in Pending Verification is listed for HDT and for the UBND of its village, with its current version name', async () => {
    const item = { kind: 'Provider', id: PENDING_PROVIDER, name: currentName(), villageId: HA_THAI }
    expect(await pending('hdt')).toContainEqual(expect.objectContaining(item))
    expect(await pending('ubnd')).toContainEqual(expect.objectContaining(item))
  })

  it('PRF BR-006 / BR-007 (boundary): after the village UBND approves through PRF, the Provider leaves the pending list', async () => {
    const response = await verify('ubnd', { decision: 'Approve' })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ verification_status: 'Verified' })
    expect((await pending('hdt')).some(i => i.id === PENDING_PROVIDER)).toBe(false)
  })

  it('PRF BR-006 Request Revision / consistency-contract.md:50 (boundary): a returned Provider leaves the list; a pending Agency registration is listed for HDT only', async () => {
    expect((await verify('ubnd', { decision: 'Request Revision', revision_comments: 'Bổ sung giấy phép.' })).status).toBe(200)
    expect((await pending('hdt')).some(i => i.id === PENDING_PROVIDER)).toBe(false)
    const registration = repo().all('agency_registration_requests')[0]
    repo().update('agency_registration_requests', r => r.registration_request_id === registration.registration_request_id, { current_status: 'Pending Approval' })
    expect(await pending('hdt')).toContainEqual(expect.objectContaining({ kind: 'Agency', id: registration.registration_request_id, villageId: null }))
    expect((await pending('ubnd')).some(i => i.kind === 'Agency')).toBe(false)
  })

  it('PRF BR-005 / ADM BR-003 (error): the UBND of another village neither sees nor can review the Provider; it stays pending', async () => {
    const otherUbnd = createUbndSession(SEED_ADMIN_IDS.batTrangVillageId)
    expect((await listPendingVerification(otherUbnd)).some(i => i.id === PENDING_PROVIDER)).toBe(false)
    await expect(reviewProvider(PENDING_PROVIDER, otherUbnd, 'Approve')).rejects.toThrow(/BR-005/)
    expect((await verify('hdt', { decision: 'Approve' })).status).toBe(403)
    expect((await pending('hdt')).some(i => i.id === PENDING_PROVIDER)).toBe(true)
  })
})
