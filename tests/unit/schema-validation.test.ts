/**
 * T006 — Domain types and validation schemas
 * Tests that Zod schemas correctly validate AIT domain objects
 * and reject invalid input.
 *
 * CONSTITUTION II: Must FAIL before T007 (types.ts) is implemented.
 */
import { describe, it, expect } from 'vitest'
import {
  MessageTextSchema,
  TourContextSchema,
  HardConstraintsSchema,
  PreferenceWeightsSchema,
} from '@/lib/matching/types'

describe('T006 | Domain Validation Schemas', () => {
  it('MessageTextSchema accepts text up to 2000 chars', () => {
    const result = MessageTextSchema.safeParse('We need a pottery workshop for 15 guests')
    expect(result.success).toBe(true)
  })

  it('MessageTextSchema rejects empty string', () => {
    const result = MessageTextSchema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('MessageTextSchema rejects text over 2000 chars', () => {
    const result = MessageTextSchema.safeParse('a'.repeat(2001))
    expect(result.success).toBe(false)
  })

  it('TourContextSchema validates complete tour context', () => {
    const result = TourContextSchema.safeParse({
      group_size: 15,
      tour_purpose: 'Cultural Workshop',
      target_date_or_range: { start_date: '2026-11-10' },
      origin_or_route: { origin_address: 'Old Quarter, Hanoi' },
      experience_types: ['Workshop/Hands-on'],
    })
    expect(result.success).toBe(true)
  })

  it('TourContextSchema accepts partial context (clarification in progress)', () => {
    const result = TourContextSchema.safeParse({ tour_purpose: 'Sightseeing' })
    expect(result.success).toBe(true)
  })

  it('HardConstraintsSchema rejects negative budget', () => {
    const result = HardConstraintsSchema.safeParse({
      group_size: 10,
      max_budget_per_person: -1000,
    })
    expect(result.success).toBe(false)
  })

  it('PreferenceWeightsSchema rejects weights that do not sum to 1.0', () => {
    const result = PreferenceWeightsSchema.safeParse({
      experience_fit: 0.5,
      route_convenience: 0.6, // total > 1
      agency_preferences: 0.2,
      provider_quality: 0.15,
    })
    expect(result.success).toBe(false)
  })

  it('PreferenceWeightsSchema accepts weights summing to exactly 1.0', () => {
    const result = PreferenceWeightsSchema.safeParse({
      experience_fit: 0.4,
      route_convenience: 0.25,
      agency_preferences: 0.2,
      provider_quality: 0.15,
    })
    expect(result.success).toBe(true)
  })
})
