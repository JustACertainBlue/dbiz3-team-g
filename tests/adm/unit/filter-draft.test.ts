// ADM079 #17 Apply filters: "Refresh permitted metric cards, charts and lists". Filter edits stay a draft
// until Apply; Apply is enabled only when the draft differs from the applied filters.
import { describe, expect, it } from 'vitest'
import { filtersChanged } from '@/app/admin/filter-draft'

const applied = { preset: 'Last 30 days' as const, villageId: null, agencyId: null, providerId: null, sortBy: 'Frequency' as const }

describe('filtersChanged (ADM079 #17)', () => {
  it('is false when nothing changed', () => {
    expect(filtersChanged({ ...applied }, applied)).toBe(false)
  })
  it('is true for each filter field: period, custom dates, village, agency, provider', () => {
    expect(filtersChanged({ ...applied, preset: 'Last 7 days' }, applied)).toBe(true)
    expect(filtersChanged({ ...applied, preset: 'Custom', startDate: '2026-10-01', endDate: '2026-10-31' }, { ...applied, preset: 'Custom', startDate: '2026-10-01', endDate: '2026-10-30' })).toBe(true)
    expect(filtersChanged({ ...applied, villageId: 'V1' }, applied)).toBe(true)
    expect(filtersChanged({ ...applied, agencyId: 'A1' }, applied)).toBe(true)
    expect(filtersChanged({ ...applied, providerId: 'P1,P2' }, applied)).toBe(true)
  })
  it('ignores the Top 10 sort, which applies at once (FR-010 toggle, not a filter)', () => {
    expect(filtersChanged({ ...applied, sortBy: 'Recency' }, applied)).toBe(false)
  })
  it('treats a missing and an empty value as the same', () => {
    expect(filtersChanged({ ...applied, agencyId: undefined as unknown as null }, applied)).toBe(false)
  })
})
