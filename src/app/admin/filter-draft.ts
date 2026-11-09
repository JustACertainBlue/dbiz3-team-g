// ADM079 #17 Apply filters: edits to period, dates, village, Agency and Provider stay a draft until Apply.
// The Top 10 sort (FR-010) is a toggle, not a filter, and applies at once.
import type { DashboardFilterParams } from '@/lib/adm/types'

const FILTER_KEYS = ['preset', 'startDate', 'endDate', 'villageId', 'agencyId', 'providerId'] as const

export function filtersChanged(draft: DashboardFilterParams, applied: DashboardFilterParams): boolean {
  return FILTER_KEYS.some(key => (draft[key] ?? null) !== (applied[key] ?? null))
}
