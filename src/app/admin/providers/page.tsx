// Screen 41: the merged review list. UBND's "Duyệt hồ sơ" opens here (nav-model.ts); /admin/agencies shows the same list.
import ReviewList, { type ReviewSearch } from '../_v3/ReviewList'

export const dynamic = 'force-dynamic'

export default function AdminProvidersPage({ searchParams }: { searchParams: ReviewSearch }) {
  return <ReviewList basePath="/admin/providers" searchParams={searchParams} />
}
