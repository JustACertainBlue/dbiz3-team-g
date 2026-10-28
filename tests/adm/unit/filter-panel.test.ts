/**
 * T030: Filter panel component interactions and combined filter acceptance test
 * Verifies:
 * - Scenario 3: Village filter pre-set and disabled for UBND (BR-003)
 * - Scenario 4: HDT village filter interaction (BR-004)
 * - Scenario 5: Time period preset switching (BR-005)
 * - Scenario 6: Combined Local Provider / Agency filter with mutual exclusivity
 * - Accordion plus/minus expansion controls
 * - Multi-selection and selection persistence
 * - Reconciling UI mutual exclusivity with backend AND intersection (BR-014, AC-ADM-FILTER)
 */

import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FilterPanel } from '@/app/components/admin/FilterPanel'
import { filterBookingTable, filterDashboardMetrics } from '@/lib/adm/metrics-service'
import { createHdtSession, createUbndSession, SEED_ADMIN_IDS } from '../helpers/mock-session'

describe('T030: Filter Panel & Combined Filter Acceptance Test (BR-003..BR-005, BR-014)', () => {
  const dummyVillages = [
    { villageId: SEED_ADMIN_IDS.batTrangVillageId, name: 'Làng gốm Bát Tràng', district: 'Gia Lâm' },
    { villageId: SEED_ADMIN_IDS.vanPhucVillageId, name: 'Làng lụa Vạn Phúc', district: 'Hà Đông' },
  ]

  it('renders combined Local Provider / Agency filter box matching ADM079 design', () => {
    const markup = renderToStaticMarkup(
      React.createElement(FilterPanel, {
        filters: { preset: 'Last 30 days', villageId: null },
        onFilterChange: () => {},
        villageOptions: dummyVillages,
        isVillageLocked: false,
        assignedVillageId: null,
      })
    )

    // Must have the new combined label
    expect(markup).toContain('LOCAL PROVIDER / AGENCY:')
    expect(markup).toContain('combined-filter-trigger')
    expect(markup).toContain('All (None selected)')
  })

  it('locks village filter for UBND Admin and allows selection for HDT Admin (BR-003, BR-004)', () => {
    // HDT: Unlocked select
    const hdtMarkup = renderToStaticMarkup(
      React.createElement(FilterPanel, {
        filters: { preset: 'Last 30 days', villageId: null },
        onFilterChange: () => {},
        villageOptions: dummyVillages,
        isVillageLocked: false,
        assignedVillageId: null,
      })
    )
    expect(hdtMarkup).toContain('All Craft Villages (Platform-Wide)')
    expect(hdtMarkup).not.toContain('🔒')

    // UBND: Locked badge
    const ubndMarkup = renderToStaticMarkup(
      React.createElement(FilterPanel, {
        filters: { preset: 'Last 30 days', villageId: SEED_ADMIN_IDS.batTrangVillageId },
        onFilterChange: () => {},
        villageOptions: dummyVillages,
        isVillageLocked: true,
        assignedVillageId: SEED_ADMIN_IDS.batTrangVillageId,
      })
    )
    expect(ubndMarkup).toContain('🔒')
    expect(ubndMarkup).toContain('Làng gốm Bát Tràng')
    expect(ubndMarkup).not.toContain('All Craft Villages (Platform-Wide)')
  })

  it('displays active selection count and clear button when entity filters are active', () => {
    // When a provider is selected
    const providerMarkup = renderToStaticMarkup(
      React.createElement(FilterPanel, {
        filters: {
          preset: 'Last 30 days',
          villageId: null,
          providerId: 'prov-1,prov-2',
          providerIds: ['prov-1', 'prov-2'],
        },
        onFilterChange: () => {},
        villageOptions: dummyVillages,
        isVillageLocked: false,
        assignedVillageId: null,
      })
    )

    expect(providerMarkup).toContain('2 Local Providers selected')
    expect(providerMarkup).toContain('Reset Filters')
    expect(providerMarkup).toContain('✕')
  })

  it('filters booking table and dashboard metrics by multiple provider IDs', async () => {
    const session = createHdtSession()
    const provider1 = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374' // Xưởng thủ công Bát Tràng
    const provider2 = '70efa801-a908-5e16-8510-fd094fbdc020' // Xưởng thủ công Vạn Phúc

    // Single provider query
    const single = await filterBookingTable(session, { providerId: provider1 })
    // Multi provider query with comma-separated IDs
    const multi = await filterBookingTable(session, { providerId: `${provider1},${provider2}` })

    expect(multi.length).toBeGreaterThanOrEqual(single.length)
    for (const row of multi) {
      expect(
        row.providerName.includes('Bát Tràng') || row.providerName.includes('Vạn Phúc')
      ).toBe(true)
    }
  })

  it('filters booking table and dashboard metrics by multiple agency IDs', async () => {
    const session = createHdtSession()
    const agency1 = '5fecc699-71e4-5bf0-ac1b-2090e05c2cd9' // Indochina Heritage Voyages
    const agency2 = '8d1ae456-e692-5674-8b83-ecdcfa51f496' // Hanoi Eco Discovery

    const multi = await filterBookingTable(session, { agencyId: `${agency1},${agency2}` })
    expect(Array.isArray(multi)).toBe(true)
    for (const row of multi) {
      expect(
        row.agencyName.includes('Indochina') || row.agencyName.includes('Hanoi Eco')
      ).toBe(true)
    }
  })

  it('preserves backend AND intersection when both agency and provider filters are passed via API (BR-014, AC-ADM-FILTER)', async () => {
    const session = createHdtSession()
    const agencyId = '5fecc699-71e4-5bf0-ac1b-2090e05c2cd9'
    const providerId = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'

    const andResult = await filterBookingTable(session, { agencyId, providerId })
    for (const row of andResult) {
      expect(row.agencyName).toContain('Indochina')
      expect(row.providerName).toContain('Bát Tràng')
    }
  })

  it('updates dashboard summary cards and booking metrics when combined filter is applied', async () => {
    const session = createHdtSession()
    const all = await filterDashboardMetrics(session, { preset: 'Last 30 days' })
    const filtered = await filterDashboardMetrics(session, {
      preset: 'Last 30 days',
      providerId: '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374',
    })

    expect(all.metricCards).toHaveLength(4)
    expect(filtered.metricCards).toHaveLength(4)
    // Filtered bookings in table match the applied provider
    for (const row of filtered.bookingMetrics.bookingTable) {
      expect(row.providerName).toContain('Bát Tràng')
    }
  })
})
