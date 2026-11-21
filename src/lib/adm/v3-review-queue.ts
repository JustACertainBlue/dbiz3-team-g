// Screen 41 (mockup v3 png/41): Agency registrations, Agency legal-information changes and workshop (Provider) profiles in
// one list. HDT decides Agencies and only views workshops ("Sở chỉ xem, UBND xã quyết định"); UBND sees and decides the
// workshops of its own village. Pure: the page loads the rows (scope is applied there with the existing guards).
import { hanoiDate } from '@/lib/time/hanoi-time'

export type QueueKind = 'registration' | 'change' | 'workshop'
export type QueueTone = 'warn' | 'success' | 'danger' | 'neutral'

/** Row of `agencyReviews(session)` (src/lib/auth/agency-review.ts), the fields this list uses. */
export interface AgencyReviewItem { id: string; kind: string; name: string; status: string; submitted: string; fields: Record<string, unknown>; /** Review records of the item (agencyReviews().history); the latest decides "Cần bổ sung". */ history?: Array<{ decision?: unknown; decided_at?: unknown }> }
/** One provider of `adminProviderQueue(...)`, flattened by the page. */
export interface ProviderQueueRow { provider_id: string; name: string; villageName: string; reviewStatus: string; submitted: string }

export interface QueueRow {
  key: string
  kind: QueueKind
  kindLabel: string
  name: string
  subtitle: string
  submitted: string
  statusLabel: string
  tone: QueueTone
  note: string
  href: string
  processed: boolean
  canDecide: boolean
}

const KIND_LABEL: Record<QueueKind, string> = { registration: 'Đăng ký mới', change: 'Đổi thông tin pháp lý', workshop: 'Xác minh xưởng' }
const text = (v: unknown) => (v === null || v === undefined ? '' : String(v))

export function waitingText(submitted: string, now: string): string {
  const a = hanoiDate(submitted), b = hanoiDate(now)
  if (!a || !b) return ''
  const days = Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
  return days <= 0 ? 'Gửi hôm nay' : `Đã chờ ${days} ngày`
}

export interface AgencyStatus { label: string; tone: QueueTone; processed: boolean; canDecide: boolean; note: string }

/**
 * Status of an Agency item as HDT sees it. "Yêu cầu bổ sung" (reviewAgency) leaves a registration in "Pending Approval" with a
 * review record "Request More Information", and closes a legal change as "Rejected" with the same record. While the latest record is
 * that decision and the Agency has not sent a newer version, HDT has nothing to decide: the item is "Cần bổ sung".
 * Returns null for a status that is not shown.
 */
export function agencyStatus(item: Pick<AgencyReviewItem, 'kind' | 'status' | 'submitted' | 'history'>, now: string): AgencyStatus | null {
  const pending = item.status === 'Pending Approval' || item.status === 'Pending Review'
  const latest = [...(item.history ?? [])].sort((a, b) => text(b.decided_at).localeCompare(text(a.decided_at)))[0]
  const askedMore = latest !== undefined && text(latest.decision) === 'Request More Information'
  if (pending && askedMore && text(latest.decided_at) >= item.submitted) return { label: 'Cần bổ sung', tone: 'warn', processed: true, canDecide: false, note: 'Chờ công ty gửi lại hồ sơ' }
  if (pending) return { label: 'Chờ duyệt', tone: 'warn', processed: false, canDecide: true, note: waitingText(item.submitted, now) }
  if (item.status === 'Rejected' && askedMore && item.kind === 'change') return { label: 'Cần bổ sung', tone: 'warn', processed: true, canDecide: false, note: '' }
  if (item.status === 'Approved') return { label: 'Đã duyệt', tone: 'success', processed: true, canDecide: false, note: '' }
  if (item.status === 'Rejected') return { label: 'Từ chối', tone: 'danger', processed: true, canDecide: false, note: '' }
  return null
}

function agencyRow(item: AgencyReviewItem, now: string): QueueRow | null {
  const kind: QueueKind = item.kind === 'change' ? 'change' : 'registration'
  const status = agencyStatus(item, now)
  if (!status) return null
  const f = item.fields
  const subtitle = kind === 'registration'
    ? `Người gửi: ${text(f.full_name) || 'Chưa có'}`
    : text(f.proposed_company_name) && text(f.proposed_tax_id) ? 'Đổi tên công ty và mã số thuế'
      : text(f.proposed_company_name) ? 'Đổi tên công ty' : text(f.proposed_tax_id) ? 'Đổi mã số thuế' : 'Đổi thông tin pháp lý'
  return {
    key: `${kind}:${item.id}`, kind, kindLabel: KIND_LABEL[kind], name: item.name, subtitle, submitted: item.submitted,
    statusLabel: status.label, tone: status.tone, note: status.note, href: `/admin/agencies/${item.id}`,
    processed: status.processed, canDecide: status.canDecide,
  }
}

function workshopRow(p: ProviderQueueRow, adminType: 'HDT' | 'UBND', now: string): QueueRow | null {
  const pending = p.reviewStatus === 'Pending Verification'
  const closed: Record<string, [string, QueueTone]> = { Verified: ['Đã duyệt', 'success'], 'Revision Required': ['Cần bổ sung', 'warn'] }
  if (!pending && !closed[p.reviewStatus]) return null
  const hdt = adminType === 'HDT'
  const [statusLabel, tone] = pending ? [hdt ? 'Chờ UBND xã duyệt' : 'Chờ duyệt', 'warn' as QueueTone] : closed[p.reviewStatus]
  return {
    key: `workshop:${p.provider_id}`, kind: 'workshop', kindLabel: KIND_LABEL.workshop, name: p.name,
    subtitle: p.villageName ? `Làng ${p.villageName}` : '', submitted: p.submitted, statusLabel, tone,
    note: pending ? (hdt ? 'Sở chỉ xem, UBND xã quyết định' : waitingText(p.submitted, now)) : '',
    href: `/admin/providers/${p.provider_id}`, processed: !pending, canDecide: pending && !hdt,
  }
}

export function buildReviewQueue(adminType: 'HDT' | 'UBND', agencies: AgencyReviewItem[], workshops: ProviderQueueRow[], now: string): QueueRow[] {
  const rows = [
    ...(adminType === 'HDT' ? agencies.map(a => agencyRow(a, now)) : []),
    ...workshops.map(w => workshopRow(w, adminType, now)),
  ].filter((r): r is QueueRow => r !== null)
  return rows.sort((a, b) => a.submitted.localeCompare(b.submitted))
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
export const QUEUE_PAGE_SIZE = 20

export interface QueueFilter { tab?: 'pending' | 'processed'; q?: string; kind?: QueueKind | ''; sort?: 'oldest' | 'newest'; page?: number }

export function filterReviewQueue(rows: QueueRow[], f: QueueFilter) {
  const tab = f.tab ?? 'pending'
  const counts = { pending: rows.filter(r => !r.processed).length, processed: rows.filter(r => r.processed).length }
  const needle = fold((f.q ?? '').trim())
  const matched = rows
    .filter(r => (tab === 'processed') === r.processed)
    .filter(r => !f.kind || r.kind === f.kind)
    .filter(r => !needle || fold(`${r.name} ${r.subtitle}`).includes(needle))
    .sort((a, b) => f.sort === 'newest' ? b.submitted.localeCompare(a.submitted) : a.submitted.localeCompare(b.submitted))
  const pages = Math.max(1, Math.ceil(matched.length / QUEUE_PAGE_SIZE))
  const page = Math.min(Math.max(1, f.page ?? 1), pages)
  const start = (page - 1) * QUEUE_PAGE_SIZE
  const slice = matched.slice(start, start + QUEUE_PAGE_SIZE)
  return { rows: slice, total: matched.length, from: matched.length ? start + 1 : 0, to: start + slice.length, page, pages, counts }
}
