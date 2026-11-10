/**
 * Provider review status shown to Admins (UBND / HDT) — defect from the 08/11 test session:
 * Minh Thư (UBND) saw "[DEMO] Xưởng gốm Bát Tràng 01" as "Verified" while its revision was Pending or
 * Revision Required; the revision was also missing from the ADM079 pending list.
 *
 * Spec: PRF Q32 (closed) / BR-007 — provider_profiles.verification_status stays Verified while a published
 * version exists; the review state of a later revision is provider_profile_versions.version_status of
 * current_version_no. PRF BR-006 / US-6 AC3: Request Revision needs a non-blank comment.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { demoRepository } from '@/lib/demo/json-repository'
import { updateProviderProfile, reviewProvider } from '@/lib/prf/provider-service'
import { listPendingVerification } from '@/lib/adm/pending-service'
import { POST as verifyRoute } from '@/app/api/prf/provider/[providerId]/verify/route'
import { adminProviderQueue, providerReviewState, reviewHistoryRows } from '@/lib/prf/provider-review-view'
import { providerSession, SEED_IDS } from '../helpers/mockSession'
import { createUbndSession, SEED_ADMIN_IDS } from '../../adm/helpers/mock-session'

const BAT_TRANG = SEED_IDS.provider1Verified // 50f2c8fc — Verified, published v1, Bát Tràng
const PENDING_HA_THAI = '3a5d2ffc-79fa-5b75-a1e6-82beea3bed59' // seed: Pending Verification v1, never published
const repo = () => demoRepository()
const ubndBatTrang = () => createUbndSession(SEED_ADMIN_IDS.batTrangVillageId)
const profile = (id: string) => repo().find('provider_profiles', p => p.provider_id === id)!
const versions = () => repo().all('provider_profile_versions')
const openRevision = () => updateProviderProfile(BAT_TRANG, providerSession(BAT_TRANG, SEED_IDS.provider1VerifiedUserId), { business_name: 'Xưởng thủ công Bát Tràng (bản sửa)' })

describe('Provider review status for Admins (Q32 / BR-007; test session 08/11)', () => {
  beforeEach(() => repo().reset())

  it('BR-007 (normal): a published provider with an open revision shows both versions: public Verified and the revision under review', async () => {
    await openRevision()
    expect(profile(BAT_TRANG).verification_status).toBe('Verified')
    expect(providerReviewState(profile(BAT_TRANG), versions())).toMatchObject({
      review_status: 'Pending Verification', review_version_no: 2, published_status: 'Verified', published_version_no: 1,
      label: 'Bản công khai v1: Verified · Bản đang xét v2: Pending Verification',
    })
    await reviewProvider(BAT_TRANG, ubndBatTrang(), 'Request Revision', 'Bổ sung ảnh xưởng.')
    expect(providerReviewState(profile(BAT_TRANG), versions())).toMatchObject({
      review_status: 'Revision Required', label: 'Bản công khai v1: Verified · Bản đang xét v2: Revision Required',
    })
  })

  it('BR-006 (boundary): a provider never published, or published with no open revision, shows one status', () => {
    expect(providerReviewState(profile(PENDING_HA_THAI), versions())).toMatchObject({
      review_status: 'Pending Verification', published_status: null, label: 'Pending Verification',
    })
    expect(providerReviewState(profile(BAT_TRANG), versions())).toMatchObject({
      review_status: 'Verified', published_status: 'Verified', label: 'Verified',
    })
  })

  it('ADM079 queue (normal): the /admin/providers rows, counts and order use the revision state, not the provider-level Verified', async () => {
    await openRevision()
    const queue = adminProviderQueue(repo().all('provider_profiles'), versions(), repo().all('villages'), SEED_ADMIN_IDS.batTrangVillageId)
    const row = queue.rows.find(r => r.provider_id === BAT_TRANG)!
    expect(row.state.label).toBe('Bản công khai v1: Verified · Bản đang xét v2: Pending Verification')
    expect(queue.counts).toEqual({ total: queue.rows.length, pending: 1, revision: 0 })
    expect(queue.rows[0].provider_id).toBe(BAT_TRANG) // Pending first: it needs the UBND
    expect(queue.rows.every(r => r.provider.village_id === SEED_ADMIN_IDS.batTrangVillageId)).toBe(true)
    // PRF BR-005: a UBND without an assigned village sees no provider; only HDT (null) sees every village.
    expect(adminProviderQueue(repo().all('provider_profiles'), versions(), repo().all('villages'), '').rows).toEqual([])
    const all = adminProviderQueue(repo().all('provider_profiles'), versions(), repo().all('villages'), null)
    expect(all.rows.length).toBe(repo().all('provider_profiles').length)
    // Work first: Pending Verification, then Revision Required, then Draft, then Verified (not alphabetical).
    const order = [...new Set(all.rows.map(r => r.state.review_status))]
    expect(order).toEqual(['Pending Verification', 'Revision Required', 'Draft', 'Verified'])
  })

  it('ADM FR-008 (normal): the ADM079 pending list includes a pending revision of a published provider, for its UBND', async () => {
    await openRevision()
    const items = await listPendingVerification(ubndBatTrang())
    expect(items).toContainEqual(expect.objectContaining({ kind: 'Provider', id: BAT_TRANG, name: 'Xưởng thủ công Bát Tràng (bản sửa)' }))
    await reviewProvider(BAT_TRANG, ubndBatTrang(), 'Request Revision', 'Bổ sung ảnh xưởng.')
    expect((await listPendingVerification(ubndBatTrang())).some(i => i.id === BAT_TRANG)).toBe(false)
  })

  it('History (normal): each review row names the version it judged, newest first', async () => {
    await openRevision()
    await reviewProvider(BAT_TRANG, ubndBatTrang(), 'Request Revision', 'Bổ sung ảnh xưởng.')
    const rows = reviewHistoryRows(repo().all('provider_verification_reviews').filter(r => r.provider_id === BAT_TRANG))
    expect(rows[0]).toMatchObject({ heading: 'Request Revision · v2', comments: 'Bổ sung ảnh xưởng.' })
    expect(rows.at(-1)!.heading).toMatch(/· v1$/)
  })

  it('US-6 AC3 (error): Request Revision with an empty or blank comment is refused with 400 and writes no review', async () => {
    const before = repo().all('provider_verification_reviews').length
    for (const revision_comments of ['', '   ', '\n\t ', undefined]) {
      const response = await verifyRoute(new NextRequest(`http://localhost:3000/api/prf/provider/${PENDING_HA_THAI}/verify`, {
        method: 'POST', headers: { cookie: 'hab_demo_account=ubnd', 'content-type': 'application/json' },
        body: JSON.stringify({ decision: 'Request Revision', revision_comments }),
      }), { params: { providerId: PENDING_HA_THAI } })
      expect(response.status, JSON.stringify(revision_comments)).toBe(400)
    }
    expect(repo().all('provider_verification_reviews').length).toBe(before)
    expect(profile(PENDING_HA_THAI).verification_status).toBe('Pending Verification')
  })
})
