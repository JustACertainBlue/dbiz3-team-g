// Screen 41: the merged review list. HDT's "Duyệt hồ sơ" opens here (nav-model.ts); /admin/providers shows the same list.
import ReviewList, { type ReviewSearch } from '../_v3/ReviewList'

export const dynamic = 'force-dynamic'

export default function AdminAgenciesPage({ searchParams }: { searchParams: ReviewSearch }) {
  return <ReviewList basePath="/admin/agencies" searchParams={searchParams} />
}
