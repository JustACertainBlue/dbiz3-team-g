/**
 * T024 — Exponential 30-day half-life time-decay calculation
 * Covers: FR-015, BR-013, BR-021
 *
 * CONSTITUTION II: Must FAIL before T028 (src/lib/decay/time-decay.ts) is implemented.
 */
import { describe, it, expect } from 'vitest'
import {
  calculateDecayWeight,
  applyTimeDecayToSignals,
  type PreferenceSignal,
  type ReweightedSignal,
} from '@/lib/decay/time-decay'

describe('T024 | Time-Decay Calculation (FR-015, BR-013, BR-021)', () => {
  describe('calculateDecayWeight', () => {
    it('BR-021: returns 1.0 weight for day 0 (immediate signal)', () => {
      const weight = calculateDecayWeight(0)
      expect(weight).toBeCloseTo(1.0, 5)
    })

    it('BR-021: returns exactly 0.5 weight at 30 days (half-life)', () => {
      const weight = calculateDecayWeight(30)
      expect(weight).toBeCloseTo(0.5, 5)
    })

    it('BR-021: returns 0.25 weight at 60 days (two half-lives)', () => {
      const weight = calculateDecayWeight(60)
      expect(weight).toBeCloseTo(0.25, 5)
    })

    it('BR-021: returns 0.125 weight at 90 days (three half-lives)', () => {
      const weight = calculateDecayWeight(90)
      expect(weight).toBeCloseTo(0.125, 5)
    })

    it('BR-013: newer signals strictly have greater weight than older signals', () => {
      const weight10Days = calculateDecayWeight(10)
      const weight40Days = calculateDecayWeight(40)
      expect(weight10Days).toBeGreaterThan(weight40Days)
    })

    it('allows custom half_life_days parameter if specified', () => {
      const weight = calculateDecayWeight(15, 15)
      expect(weight).toBeCloseTo(0.5, 5)
    })
  })

  describe('applyTimeDecayToSignals', () => {
    const referenceDate = new Date('2026-10-01T00:00:00Z')

    it('FR-015: reweights an array of preference signals according to their age', () => {
      const signals: PreferenceSignal[] = [
        {
          signal_type: 'Positive Experience Interest',
          value: 'Bat Trang Pottery',
          confidence_score: 1.0,
          captured_at: new Date('2026-10-01T00:00:00Z').toISOString(), // 0 days old
        },
        {
          signal_type: 'Positive Experience Interest',
          value: 'Van Phuc Silk',
          confidence_score: 1.0,
          captured_at: new Date('2026-09-01T00:00:00Z').toISOString(), // 30 days old
        },
      ]

      const reweighted: ReweightedSignal[] = applyTimeDecayToSignals(signals, referenceDate)

      expect(reweighted).toHaveLength(2)
      expect(reweighted[0].weight).toBeCloseTo(1.0, 2)
      expect(reweighted[1].weight).toBeCloseTo(0.5, 2)
      expect(reweighted[0].weight).toBeGreaterThan(reweighted[1].weight)
    })

    it('handles empty signal list gracefully', () => {
      const reweighted = applyTimeDecayToSignals([], referenceDate)
      expect(reweighted).toEqual([])
    })

    it('multiplies base confidence score with decay factor for effective weight', () => {
      const signals: PreferenceSignal[] = [
        {
          signal_type: 'Price Concern',
          value: 'high',
          confidence_score: 0.8,
          captured_at: new Date('2026-09-01T00:00:00Z').toISOString(), // 30 days old -> factor 0.5
        },
      ]

      const reweighted = applyTimeDecayToSignals(signals, referenceDate)
      // 0.8 * 0.5 = 0.4
      expect(reweighted[0].weight).toBeCloseTo(0.4, 2)
    })
  })
})
