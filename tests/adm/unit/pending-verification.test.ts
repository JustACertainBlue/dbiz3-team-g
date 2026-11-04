/**
 * T053 (A6): Pending Verification panel lists seed data only, read-only (Constitution I, BR-012,
 * ADM079 screen spec :97, :102). Providers: verification_status = Pending Verification; Agencies:
 * agency_registration_requests.current_status = Pending Approval (data/04-data-model.md:153).
 */
import { beforeEach, describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { demoRepository } from '@/lib/demo/json-repository'
import { listPendingVerification } from '@/lib/adm/pending-service'
import { PendingVerificationPanel } from '@/app/components/admin/PendingVerificationPanel'
import { createHdtSession, createUbndSession, SEED_ADMIN_IDS } from '../helpers/mock-session'

describe('T053 | A6 listPendingVerification', () => {
  beforeEach(() => demoRepository().reset())

  it('HDT: the seed Provider in Pending Verification (Xưởng thủ công Hạ Thái, 2026-09-12); no Agency is Pending Approval', async () => {
    const items = await listPendingVerification(createHdtSession())
    expect(items).toEqual([
      { kind: 'Provider', id: '3a5d2ffc-79fa-5b75-a1e6-82beea3bed59', name: 'Xưởng thủ công Hạ Thái', villageId: SEED_ADMIN_IDS.haThaiVillageId, submittedAt: '2026-09-12T08:00:00+07:00' },
    ])
  })

  it('UBND sees only its village Providers and no Agencies', async () => {
    demoRepository().insert('agency_registration_requests', {
      registration_request_id: 'adm-test-reg-0001', email: 'pending@example.invalid', pending_password_hash: '',
      current_status: 'Pending Approval', agency_user_id: '', current_version_no: '1',
      created_at: '2026-09-20T08:00:00+07:00', updated_at: '2026-09-20T08:00:00+07:00',
    })
    demoRepository().insert('registration_submission_versions', {
      registration_request_id: 'adm-test-reg-0001', version_no: '1', submitted_at: '2026-09-20T08:00:00+07:00',
      submitted_by: '', full_name: 'Test Person', company_name: 'Công ty Thử nghiệm', company_type: 'TMC',
      tax_id: '0100000000', location: '{}', contact_information: '{}', team_size: '5', tour_types: '[]',
    })
    const hdt = await listPendingVerification(createHdtSession())
    expect(hdt.map(i => `${i.kind}:${i.name}`)).toEqual(['Provider:Xưởng thủ công Hạ Thái', 'Agency:Công ty Thử nghiệm'])
    const haThai = await listPendingVerification(createUbndSession(SEED_ADMIN_IDS.haThaiVillageId))
    expect(haThai.map(i => i.kind)).toEqual(['Provider'])
    expect(await listPendingVerification(createUbndSession(SEED_ADMIN_IDS.batTrangVillageId))).toEqual([])
  })
})

describe('T053 | A6 PendingVerificationPanel is read-only', () => {
  it('shows "No accounts awaiting review" when empty and no View/Verify buttons with items', () => {
    const empty = renderToStaticMarkup(React.createElement(PendingVerificationPanel, { items: [] }))
    expect(empty).toContain('No accounts awaiting review')
    const filled = renderToStaticMarkup(React.createElement(PendingVerificationPanel, {
      items: [{ kind: 'Provider', id: 'p1', name: 'Xưởng thủ công Hạ Thái', villageId: SEED_ADMIN_IDS.haThaiVillageId, submittedAt: '2026-09-12T08:00:00+07:00' }],
    }))
    expect(filled).toContain('Xưởng thủ công Hạ Thái')
    expect(filled).not.toMatch(/>\s*Verify\s*</)
    expect(filled).not.toMatch(/>\s*View\s*</)
    expect(filled).not.toContain('Nguyen Thi Lan')
  })
})
