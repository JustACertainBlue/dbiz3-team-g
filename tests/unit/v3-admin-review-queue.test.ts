// Screen 41 (mockup v3): one merged list of Agency and Provider profiles waiting for a decision.
import { describe, expect, it } from 'vitest'
import { agencyStatus, buildReviewQueue, filterReviewQueue, waitingText, type AgencyReviewItem, type ProviderQueueRow } from '@/lib/adm/v3-review-queue'

const agency = (over: Partial<AgencyReviewItem>): AgencyReviewItem => ({ id: 'r1', kind: 'registration', name: 'Công ty Phố Cổ', status: 'Pending Approval', submitted: '2026-11-13T02:00:00Z', fields: { full_name: 'Người liên hệ (mẫu)' }, ...over })
const provider = (over: Partial<ProviderQueueRow> = {}): ProviderQueueRow => ({ provider_id: 'p1', name: 'Xưởng sơn mài Hạ Thái', villageName: 'Hạ Thái', reviewStatus: 'Pending Verification', submitted: '2026-09-10T02:00:00Z', ...over })
const NOW = '2026-11-15T03:00:00Z'

describe('buildReviewQueue', () => {
  it('HDT: agencies are decided by HDT, workshops are view only', () => {
    const q = buildReviewQueue('HDT', [agency({}), agency({ id: 'c1', kind: 'change', name: 'Công ty Sông Hồng', fields: { proposed_company_name: 'Công ty Sông Hồng 2' }, submitted: '2026-11-14T02:00:00Z' })], [provider()], NOW)
    expect(q.map(r => [r.kindLabel, r.canDecide, r.processed])).toEqual([
      ['Xác minh xưởng', false, false], ['Đăng ký mới', true, false], ['Đổi thông tin pháp lý', true, false],
    ])
    const w = q.find(r => r.kind === 'workshop')!
    expect(w.statusLabel).toBe('Chờ UBND xã duyệt')
    expect(w.note).toBe('Sở chỉ xem, UBND xã quyết định')
    expect(w.href).toBe('/admin/providers/p1')
    expect(q[1].href).toBe('/admin/agencies/r1')
  })

  it('UBND: workshops only, and it decides', () => {
    const q = buildReviewQueue('UBND', [agency({})], [provider()], NOW)
    expect(q).toHaveLength(1)
    expect(q[0]).toMatchObject({ kind: 'workshop', canDecide: true, statusLabel: 'Chờ duyệt' })
  })

  it('subtitle: registrant for a new Agency, what changes for a legal change, village for a workshop', () => {
    const q = buildReviewQueue('HDT', [
      agency({}),
      agency({ id: 'c1', kind: 'change', fields: { proposed_company_name: 'X' } }),
      agency({ id: 'c2', kind: 'change', fields: { proposed_tax_id: '123' } }),
    ], [provider()], NOW)
    const subs = Object.fromEntries(q.map(r => [r.key, r.subtitle]))
    expect(subs['registration:r1']).toBe('Người gửi: Người liên hệ (mẫu)')
    expect(subs['change:c1']).toBe('Đổi tên công ty')
    expect(subs['change:c2']).toBe('Đổi mã số thuế')
    expect(subs['workshop:p1']).toBe('Làng Hạ Thái')
  })

  it('closed items are processed; drafts never appear', () => {
    const q = buildReviewQueue('HDT', [agency({ status: 'Approved' }), agency({ id: 'r2', status: 'Rejected' })],
      [provider({ reviewStatus: 'Verified' }), provider({ provider_id: 'p2', reviewStatus: 'Revision Required' }), provider({ provider_id: 'p3', reviewStatus: 'Draft' })], NOW)
    expect(q.every(r => r.processed)).toBe(true)
    expect(q).toHaveLength(4)
    expect(q.map(r => r.statusLabel).sort()).toEqual(['Cần bổ sung', 'Từ chối', 'Đã duyệt', 'Đã duyệt'])
  })
})

describe('waitingText', () => {
  it('counts whole Hanoi days', () => {
    expect(waitingText('2026-11-13T02:00:00Z', NOW)).toBe('Đã chờ 2 ngày')
    expect(waitingText('2026-11-14T02:00:00Z', NOW)).toBe('Đã chờ 1 ngày')
    expect(waitingText('2026-11-15T01:00:00Z', NOW)).toBe('Gửi hôm nay')
  })
})

describe('filterReviewQueue', () => {
  const rows = buildReviewQueue('HDT', [agency({}), agency({ id: 'c1', kind: 'change', name: 'Công ty Sông Hồng', submitted: '2026-11-14T02:00:00Z' }), agency({ id: 'r3', name: 'Công ty Cũ', status: 'Approved' })], [provider()], NOW)
  it('tab, search (accent-insensitive), kind and sort; pages of 20', () => {
    expect(filterReviewQueue(rows, { tab: 'pending' }).total).toBe(3)
    expect(filterReviewQueue(rows, { tab: 'processed' }).total).toBe(1)
    expect(filterReviewQueue(rows, { tab: 'pending', q: 'song hong' }).rows.map(r => r.name)).toEqual(['Công ty Sông Hồng'])
    expect(filterReviewQueue(rows, { tab: 'pending', kind: 'workshop' }).total).toBe(1)
    expect(filterReviewQueue(rows, { tab: 'pending', sort: 'oldest' }).rows[0].kind).toBe('workshop')
    expect(filterReviewQueue(rows, { tab: 'pending', sort: 'newest' }).rows[0].name).toBe('Công ty Sông Hồng')
    const f = filterReviewQueue(rows, { tab: 'pending', page: 1 })
    expect(f).toMatchObject({ from: 1, to: 3, pages: 1 })
  })
  it('counts both tabs regardless of the active one', () => {
    expect(filterReviewQueue(rows, { tab: 'processed' }).counts).toEqual({ pending: 3, processed: 1 })
  })
})

// What the real "Yêu cầu bổ sung" does (reviewAgency in src/lib/auth/agency-review.ts): a registration stays "Pending Approval" and gets a
// review record "Request More Information"; HDT cannot approve or reject it until the Agency sends a new version. A legal change is
// closed (status Rejected) with the same record. The list must say "Cần bổ sung", not "Chờ duyệt".
describe('Agency waiting for more information', () => {
  const rmi = { decision: 'Request More Information', decided_at: '2026-11-18T03:00:00Z' }
  it('registration with a later RMI record: "Cần bổ sung", already handled, nothing for HDT to decide', () => {
    const row = buildReviewQueue('HDT', [agency({ submitted: '2026-11-16T03:00:00Z', history: [rmi] })], [], NOW)[0]
    expect(row).toMatchObject({ statusLabel: 'Cần bổ sung', tone: 'warn', processed: true, canDecide: false, note: 'Chờ công ty gửi lại hồ sơ' })
  })
  it('after the Agency resubmits (submitted later than the record) it is waiting for HDT again', () => {
    const row = buildReviewQueue('HDT', [agency({ submitted: '2026-11-19T03:00:00Z', history: [rmi] })], [], NOW)[0]
    expect(row).toMatchObject({ statusLabel: 'Chờ duyệt', processed: false, canDecide: true })
  })
  it('uses the latest record: a Reject after an RMI is "Từ chối"', () => {
    const row = buildReviewQueue('HDT', [agency({ status: 'Rejected', submitted: '2026-11-16T03:00:00Z', history: [rmi, { decision: 'Reject', decided_at: '2026-11-19T03:00:00Z' }] })], [], NOW)[0]
    expect(row).toMatchObject({ statusLabel: 'Từ chối', processed: true })
  })
  it('a legal change closed by an RMI is "Cần bổ sung", not "Từ chối"', () => {
    const row = buildReviewQueue('HDT', [agency({ id: 'c1', kind: 'change', status: 'Rejected', history: [rmi] })], [], NOW)[0]
    expect(row).toMatchObject({ statusLabel: 'Cần bổ sung', processed: true, canDecide: false })
  })
  it('the pending tab no longer counts it; the processed tab does', () => {
    const rows = buildReviewQueue('HDT', [agency({ submitted: '2026-11-16T03:00:00Z', history: [rmi] }), agency({ id: 'r2', name: 'Công ty khác' })], [], NOW)
    expect(filterReviewQueue(rows, { tab: 'pending' }).rows.map(r => r.name)).toEqual(['Công ty khác'])
    expect(filterReviewQueue(rows, { tab: 'processed' }).rows.map(r => r.statusLabel)).toEqual(['Cần bổ sung'])
  })
  it('agencyStatus is what the detail page uses', () => {
    expect(agencyStatus({ kind: 'registration', status: 'Pending Approval', submitted: '2026-11-16T03:00:00Z', history: [rmi] }, NOW)).toMatchObject({ label: 'Cần bổ sung', canDecide: false })
    expect(agencyStatus({ kind: 'registration', status: 'Pending Approval', submitted: '2026-11-16T03:00:00Z' }, NOW)).toMatchObject({ label: 'Chờ duyệt', canDecide: true })
  })
})
