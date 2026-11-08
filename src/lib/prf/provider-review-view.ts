// Provider review state as Admins see it (PRF Q32 / BR-007; defect from the 08/11 test session).
// provider_profiles.verification_status stays Verified while a published version exists; the review state of a
// later revision is provider_profile_versions.version_status of current_version_no. Every Admin view (the
// /admin/providers queue, its counts and order, the ADM079 pending list, the detail page) reads it from here.

type Row = Record<string, unknown>
const text = (value: unknown) => (value === null || value === undefined ? '' : String(value))
const versionNo = (value: unknown) => (text(value) === '' ? null : Number(value))

export interface ProviderReviewState {
  /** Status of the version an Admin acts on: the open revision if any, otherwise the provider status. */
  review_status: string
  review_version_no: number | null
  /** Status of the public version; null when the provider was never published. */
  published_status: string | null
  published_version_no: number | null
  /** True when a published provider has a newer version under review or returned for revision. */
  revision_open: boolean
  label: string
}

export function providerReviewState(provider: Row, versions: Row[]): ProviderReviewState {
  const current = versionNo(provider.current_version_no)
  const published = versionNo(provider.published_version_no)
  const providerStatus = text(provider.verification_status)
  const currentVersion = versions.find(v => text(v.provider_id) === text(provider.provider_id) && versionNo(v.version_no) === current)
  const revisionOpen = published !== null && current !== null && current !== published && currentVersion !== undefined
  const reviewStatus = revisionOpen ? text(currentVersion!.version_status) : providerStatus
  return {
    review_status: reviewStatus,
    review_version_no: current,
    published_status: published === null ? null : providerStatus,
    published_version_no: published,
    revision_open: revisionOpen,
    label: revisionOpen ? `Bản công khai v${published}: ${providerStatus} · Bản đang xét v${current}: ${reviewStatus}` : reviewStatus,
  }
}

const ORDER = ['Pending Verification', 'Revision Required', 'Draft', 'Verified']
const rank = (status: string) => (ORDER.includes(status) ? ORDER.indexOf(status) : ORDER.length)

export interface AdminProviderRow<P extends Row = Row, V extends Row = Row, Vi extends Row = Row> { provider_id: string; provider: P; version: V | undefined; village: Vi | undefined; state: ProviderReviewState }

/** Rows, counts and order of /admin/providers. `villageId` limits the queue to one village (UBND); null = all (HDT). */
export function adminProviderQueue<P extends Row, V extends Row, Vi extends Row>(providers: P[], versions: V[], villages: Vi[], villageId: string | null = null) {
  const rows: AdminProviderRow<P, V, Vi>[] = providers
    .filter(p => villageId === null || (villageId !== '' && text(p.village_id) === villageId))
    .map(provider => ({
      provider_id: text(provider.provider_id),
      provider,
      version: versions.find(v => text(v.provider_id) === text(provider.provider_id) && versionNo(v.version_no) === versionNo(provider.current_version_no)),
      village: villages.find(v => text(v.village_id) === text(provider.village_id)),
      state: providerReviewState(provider, versions),
    }))
    .sort((a, b) => rank(a.state.review_status) - rank(b.state.review_status) || a.state.review_status.localeCompare(b.state.review_status))
  return {
    rows,
    counts: {
      total: rows.length,
      pending: rows.filter(r => r.state.review_status === 'Pending Verification').length,
      revision: rows.filter(r => r.state.review_status === 'Revision Required').length,
    },
  }
}

/** Review history, newest first, each row naming the version it judged. */
export function reviewHistoryRows(reviews: Row[]) {
  return [...reviews]
    .sort((a, b) => text(b.reviewed_at).localeCompare(text(a.reviewed_at)))
    .map(review => ({
      review_id: text(review.review_id),
      heading: `${text(review.decision)} · v${text(review.version_no)}`,
      comments: text(review.revision_comments),
      reviewed_at: text(review.reviewed_at),
    }))
}
