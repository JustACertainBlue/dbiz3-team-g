// Server-side loaders of the admin screens in mockup v3 (38 overview, 41 review list). They read the shared
// repository and apply the existing scope rules; the pure logic is in v3-overview.ts and v3-review-queue.ts.
import { demoRepository } from '@/lib/db/application-store'
import { agencyReviews } from '@/lib/auth/agency-review'
import { adminProviderQueue } from '@/lib/prf/provider-review-view'
import { hanoiDate } from '@/lib/time/hanoi-time'
import { loadAgencies, loadBookings, loadChatSessions, loadProviders } from '@/lib/db/seed-loader'
import { providerReviewState } from '@/lib/prf/provider-review-view'
import type { SessionContext } from '@/lib/auth/session'
import { buildOverview } from './v3-overview'
import { buildReviewQueue, type ProviderQueueRow } from './v3-review-queue'

export type AdminKind = 'HDT' | 'UBND'

/** HDT = whole city; UBND = its assigned village. Anyone else gets null. */
export function adminScope(session: SessionContext): { adminType: AdminKind; villageId: string | null } | null {
  if (!session.authenticated || session.role !== 'ADMIN') return null
  if (session.adminType === 'HDT') return { adminType: 'HDT', villageId: null }
  if (session.adminType === 'UBND' && session.assignedVillageId) return { adminType: 'UBND', villageId: session.assignedVillageId }
  return null
}

export const hanoiToday = () => hanoiDate(new Date())

export function defaultRange(today: string) {
  let year = Number(today.slice(0, 4)), month = Number(today.slice(5, 7)) - 5
  if (month < 1) { month += 12; year-- }
  return { from: `${year}-${String(month).padStart(2, '0')}-01`, to: today }
}

const validDate = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined)

export function resolveRange(today: string, from?: string, to?: string) {
  const d = defaultRange(today)
  let f = validDate(from) ?? d.from, t = validDate(to) ?? d.to
  if (f > t) [f, t] = [t, f]
  return { from: f, to: t }
}

export async function loadOverview(session: SessionContext, from: string, to: string) {
  const scope = adminScope(session)
  if (!scope) throw new Error('FORBIDDEN')
  const [bookings, chats, agencies, providers, versions] = await Promise.all([
    loadBookings(), loadChatSessions(), loadAgencies(), loadProviders(), demoRepository().all('provider_profile_versions'),
  ])
  const providerRows = await demoRepository().all('provider_profiles')
  return buildOverview({
    villageId: scope.villageId, from, to, today: hanoiToday(),
    providers: providers.map(p => ({
      provider_id: p.provider_id, business_name: p.business_name, village_id: p.village_id, account_status: p.account_status,
      review_status: providerReviewState(providerRows.find(r => r.provider_id === p.provider_id) ?? {}, versions).review_status,
    })),
    agencies: agencies.map(a => ({ agency_id: a.agency_id, company_name: a.company_name, account_status: a.account_status })),
    bookings, chats,
  })
}

export async function loadReviewQueue(session: SessionContext) {
  const scope = adminScope(session)
  if (!scope) throw new Error('FORBIDDEN')
  const repo = demoRepository()
  const [providers, versions, villages] = await Promise.all([repo.all('provider_profiles'), repo.all('provider_profile_versions'), repo.all('villages')])
  const { rows } = adminProviderQueue(providers, versions, villages, scope.villageId ?? null)
  const workshops: ProviderQueueRow[] = rows.map(r => ({
    provider_id: r.provider_id,
    name: String(r.version?.business_name || r.provider_id),
    villageName: String(r.village?.name || ''),
    reviewStatus: r.state.review_status,
    submitted: String(r.version?.submitted_at || ''),
  }))
  const agencies = scope.adminType === 'HDT' ? await agencyReviews(session) : []
  return { adminType: scope.adminType, rows: buildReviewQueue(scope.adminType, agencies, workshops, new Date().toISOString()) }
}
