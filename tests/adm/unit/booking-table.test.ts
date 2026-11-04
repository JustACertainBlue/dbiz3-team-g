/**
 * T019: Booking monitoring table filtering test
 * Verifies:
 * - FR-006: Filter booking table by Agency, Provider, or both
 * - FR-009: Table schema (date, agency_name, provider_name, experience_name, status, price)
 * - BR-006, BR-013: Monitoring / read-only records without lifecycle actions
 * - BR-014, AC-ADM-FILTER: Agency and Provider filters combined with AND
 * - Scenario 6, Scenario 11
 */

import { describe, it, expect } from 'vitest'
import { filterBookingTable } from '@/lib/adm/metrics-service'
import { createHdtSession } from '../helpers/mock-session'

describe('T019: Booking Table Entity Filters & AND Intersection (FR-006, BR-014, AC-ADM-FILTER)', () => {
  const session = createHdtSession()
  const agencyId = '5fecc699-71e4-5bf0-ac1b-2090e05c2cd9' // Indochina Heritage Voyages
  const providerId = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374' // Xưởng Gốm Hưng Thịnh

  it('filters booking table by Agency independently (FR-006, Scenario 6)', async () => {
    const table = await filterBookingTable(session, { agencyId })

    expect(Array.isArray(table)).toBe(true)
    for (const row of table) {
      expect(row.date).toBeDefined()
      expect(row.agencyName).toBeDefined()
      expect(row.providerName).toBeDefined()
      expect(row.experienceName).toBeDefined()
      expect(row.status).toBeDefined()
      expect(typeof row.price).toBe('number')
    }
  })

  it('filters booking table by Provider independently (FR-006, Scenario 6)', async () => {
    const table = await filterBookingTable(session, { providerId })

    expect(Array.isArray(table)).toBe(true)
    for (const row of table) {
      expect(row.providerName).toBeDefined()
    }
  })

  it('combines Agency and Provider filters using AND intersection (BR-014, AC-ADM-FILTER)', async () => {
    const table = await filterBookingTable(session, { agencyId, providerId })

    expect(Array.isArray(table)).toBe(true)
    // Every record returned MUST belong to both the specified agency AND provider
    for (const row of table) {
      expect(row.agencyName).toContain('Indochina')
      expect(row.providerName).toContain('Hưng Thịnh')
    }
  })

  it('strictly provides read-only monitoring records without mutation handlers (BR-006, BR-013, Scenario 11)', async () => {
    const table = await filterBookingTable(session, {})

    expect(Array.isArray(table)).toBe(true)
    for (const row of table) {
      // Table rows contain data fields only; no lifecycle mutation operations
      expect(row).not.toHaveProperty('onConfirm')
      expect(row).not.toHaveProperty('onCancel')
      expect(row).not.toHaveProperty('onComplete')
    }
  })
})

// T047 (A3): the Booking table follows the period by Booking created_at (contract:110).
describe('T047 | A3 booking table follows the period', () => {
  const session = createHdtSession()
  const P1 = { preset: 'Custom' as const, startDate: '2026-09-20T00:00:00+07:00', endDate: '2026-09-25T23:59:59+07:00' }
  const P2 = { preset: 'Custom' as const, startDate: '2026-09-26T00:00:00+07:00', endDate: '2026-10-01T23:59:59+07:00' }
  const EMPTY = { preset: 'Custom' as const, startDate: '2026-08-01T00:00:00+07:00', endDate: '2026-08-10T23:59:59+07:00' }

  it('2026-09-20..25 → the 7 seed Bookings created on 2026-09-23 only', async () => {
    const rows = await filterBookingTable(session, P1)
    expect(rows).toHaveLength(7)
    expect(rows.some(r => r.bookingId.startsWith('54d7a276'))).toBe(false)
  })

  it('2026-09-26..10-01 → only 54d7a276 (created 2026-09-28)', async () => {
    const rows = await filterBookingTable(session, P2)
    expect(rows.map(r => r.bookingId.slice(0, 8))).toEqual(['54d7a276'])
  })

  it('an empty period → []', async () => {
    expect(await filterBookingTable(session, EMPTY)).toEqual([])
  })
})
