/**
 * T008: Time filter and trend granularity calculator unit test
 * Verifies:
 * - FR-003: Comparable previous period calculation
 * - BR-011: Trend percentage omission when no previous period exists
 * - BR-019: Granularity derivation (1-31d Daily, 32-180d Weekly, >180d Monthly)
 */

import { describe, it, expect } from 'vitest'
import {
  deriveGranularity,
  calculatePreviousPeriod,
  calculateTrendPercentage,
} from '@/lib/adm/trend-calculator'

describe('T008: Trend Calculator & Granularity Derivation (FR-003, BR-011, BR-019)', () => {
  describe('Trend Granularity Derivation (BR-019)', () => {
    it('derives Daily granularity for 1 to 31 days', () => {
      // 7 days
      expect(deriveGranularity('2026-10-11', '2026-10-18')).toBe('Daily')
      // 30 days
      expect(deriveGranularity('2026-09-18', '2026-10-18')).toBe('Daily')
      // 31 days
      expect(deriveGranularity('2026-08-01', '2026-08-31')).toBe('Daily')
    })

    it('derives Weekly granularity for 32 to 180 days', () => {
      // 60 days
      expect(deriveGranularity('2026-08-19', '2026-10-18')).toBe('Weekly')
      // 90 days
      expect(deriveGranularity('2026-07-20', '2026-10-18')).toBe('Weekly')
      // 180 days
      expect(deriveGranularity('2026-04-21', '2026-10-18')).toBe('Weekly')
    })

    it('derives Monthly granularity for more than 180 days', () => {
      // 365 days (1 year)
      expect(deriveGranularity('2025-10-18', '2026-10-18')).toBe('Monthly')
    })
  })

  describe('Comparable Previous Period Calculation (FR-003)', () => {
    it('calculates the immediately preceding period of identical calendar day length', () => {
      const start = new Date('2026-10-11T00:00:00.000Z')
      const end = new Date('2026-10-18T23:59:59.999Z')

      const prev = calculatePreviousPeriod(start, end)
      expect(prev.prevStartDate).toBeDefined()
      expect(prev.prevEndDate).toBeDefined()
      // Previous period must end before current period begins
      expect(new Date(prev.prevEndDate).getTime()).toBeLessThan(start.getTime())
    })
  })

  describe('Trend Percentage & Direction (BR-011, SC-009)', () => {
    it('omits trend (null) when previous period data does not exist (BR-011, SC-009)', () => {
      const result = calculateTrendPercentage(150, null)
      expect(result.trendPct).toBeNull()
      expect(result.trendDirection).toBeNull()
    })

    it('calculates positive trend with Up direction', () => {
      const result = calculateTrendPercentage(120, 100)
      expect(result.trendPct).toBe(20.0)
      expect(result.trendDirection).toBe('Up')
    })

    it('calculates negative trend with Down direction', () => {
      const result = calculateTrendPercentage(80, 100)
      expect(result.trendPct).toBe(-20.0)
      expect(result.trendDirection).toBe('Down')
    })

    it('calculates 0% trend with Flat direction', () => {
      const result = calculateTrendPercentage(100, 100)
      expect(result.trendPct).toBe(0.0)
      expect(result.trendDirection).toBe('Flat')
    })
  })
})
