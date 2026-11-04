/**
 * T011 — Intent extraction, incomplete field detection, and clarification questions
 * Covers: FR-003, FR-004, BR-004, BR-017, AC-AIT-ORDER, AC-AIT-FAIL, AC-AIT-CLARIFY
 *
 * CONSTITUTION II: Must FAIL before T012 (extractor.ts) is implemented.
 */
import { describe, it, expect, vi } from 'vitest'
import { extractTourContext, buildTourPreferenceProfile } from '@/lib/ai/extractor'

describe('T011 | Intent Extraction & Clarification (FR-003, FR-004, BR-004, BR-017)', () => {
  it('FR-003 / AC-AIT-ORDER: extracts complete tour context from full input', async () => {
    const messages = [
      { sender: 'Agency', text: '15 French tourists, Nov 10, pottery workshop in Bat Trang, budget 400k VND each, from Hoàn Kiếm' },
    ]
    const result = await extractTourContext(messages)
    expect(result.is_complete).toBe(true)
    expect(result.processing_status).toBe('Success')
    expect(result.tour_context.group_size).toBe(15)
    expect(result.follow_up_questions).toHaveLength(0)
  })

  it('FR-003 / AC-AIT-CLARIFY: returns follow-up when group_size is missing', async () => {
    const messages = [
      { sender: 'Agency', text: 'We want a silk experience in Van Phuc on Dec 5th' },
    ]
    const result = await extractTourContext(messages)
    expect(result.is_complete).toBe(false)
    expect(result.follow_up_questions.length).toBeGreaterThan(0)
    expect(result.follow_up_questions.some((q: string) => /group|guests|pax/i.test(q))).toBe(true)
  })

  it('FR-003 / AC-AIT-CLARIFY: returns follow-up when target_date is missing', async () => {
    const messages = [
      { sender: 'Agency', text: '20 guests want a craft workshop in Hanoi' },
    ]
    const result = await extractTourContext(messages)
    expect(result.is_complete).toBe(false)
    const hasDateQuestion = result.follow_up_questions.some((q: string) => /date|when|time/i.test(q))
    expect(hasDateQuestion).toBe(true)
  })

  it('BR-004: does NOT produce recommendation output when is_complete is false', async () => {
    const messages = [{ sender: 'Agency', text: 'I want something interesting in Hanoi' }]
    const result = await extractTourContext(messages)
    expect(result.is_complete).toBe(false)
    // No candidates or recommendations should be returned at extraction stage
    expect((result as unknown as Record<string, unknown>).candidates).toBeUndefined()
    expect((result as unknown as Record<string, unknown>).recommendations).toBeUndefined()
  })

  it('BR-017 / AC-AIT-FAIL: returns Temporary AI Failure status when AI is unavailable', async () => {
    const messages = [{ sender: 'Agency', text: 'test prompt' }]
    // Simulate AI failure by passing a flag
    const result = await extractTourContext(messages, { simulateFailure: true })
    expect(result.processing_status).toBe('Temporary AI Failure')
    expect(result.retry_available).toBe(true)
    expect(result.is_complete).toBe(false)
  })

  it('FR-004: builds a tour preference profile from complete tour context', async () => {
    const tourContext = {
      group_size: 15,
      tour_purpose: 'Cultural Workshop',
      target_date_or_range: { start_date: '2026-11-10' },
      origin_or_route: { origin_address: 'Old Quarter, Hanoi' },
      experience_types: ['Workshop/Hands-on'],
      budget: { max_per_person: 400000, currency: 'VND' },
    }
    const profile = await buildTourPreferenceProfile(tourContext)
    expect(profile.hard_constraints).toBeDefined()
    expect(profile.matching_attributes).toBeDefined()
    expect(profile.preference_weights).toBeDefined()
    // Verify preference_weights sum to 1.0
    const weights = Object.values(profile.preference_weights) as number[]
    const total = weights.reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(1.0, 4)
  })

  it('FR-004: hard_constraints includes group_size and max_budget_per_person', async () => {
    const tourContext = {
      group_size: 12,
      budget: { max_per_person: 300000, currency: 'VND' },
      target_date_or_range: { start_date: '2026-11-15' },
      origin_or_route: { origin_address: 'Hoan Kiem, Hanoi' },
      experience_types: ['Culinary/Tasting'],
    }
    const profile = await buildTourPreferenceProfile(tourContext)
    expect(profile.hard_constraints.group_size).toBe(12)
    expect(profile.hard_constraints.max_budget_per_person).toBe(300000)
  })
})

// T035 (Round 3, D6): all OQ #4 critical fields before matching; nothing defaulted (#29, #34, #35).
describe('T035 | Completeness per OQ #4 (FR-003, BR-004, #29, #34, #35)', () => {
  const extract = (text: string) => extractTourContext([{ sender: 'Agency', text }])

  it('#29: no origin → incomplete with an origin follow-up and no default origin', async () => {
    const result = await extract('silk weaving, 10 pax on 2026-11-20')
    expect(result.is_complete).toBe(false)
    expect(result.follow_up_questions.some((q: string) => /start|origin|from/i.test(q))).toBe(true)
    expect(result.tour_context.origin_or_route).toBeUndefined()
  })

  it('#29: no Experience preference → incomplete with a preference follow-up and no default experience_types', async () => {
    const result = await extract('10 pax on 2026-11-20 from Hoàn Kiếm')
    expect(result.is_complete).toBe(false)
    expect(result.follow_up_questions.some((q: string) => /craft|experience/i.test(q))).toBe(true)
    expect(result.tour_context.experience_types).toBeUndefined()
  })

  it('#34: a craft or a stated Experience type ("workshop") counts as a preference', async () => {
    expect((await extract('pottery workshop, 10 pax on 2026-11-20 from Hoàn Kiếm')).is_complete).toBe(true)
    const workshop = await extract('workshop, 10 pax on 2026-11-20 from Hoàn Kiếm')
    expect(workshop.is_complete).toBe(true)
    expect(workshop.tour_context.experience_types).toEqual(['Workshop/Hands-on'])
  })

  it('#35: "near X" and "from <district>" are origins; a craft village as destination is not', async () => {
    expect((await extract('pottery workshop near Hanoi, 10 pax on 2026-11-20')).is_complete).toBe(true)
    const longBien = await extract('pottery workshop, 10 pax on 2026-11-20 from Long Biên')
    expect(longBien.is_complete).toBe(true)
    expect(longBien.tour_context.origin_or_route?.origin_address).toBe('Long Biên')
    const destination = await extract('pottery workshop in Bat Trang, 10 pax on 2026-11-20')
    expect(destination.is_complete).toBe(false)
    expect(destination.follow_up_questions.some((q: string) => /start|origin|from/i.test(q))).toBe(true)
  })

  it('#29: the profile has no Experience type attribute the Agency did not state', async () => {
    const profile = await buildTourPreferenceProfile({
      group_size: 10,
      target_date_or_range: { start_date: '2026-11-20' },
      origin_or_route: { origin_address: 'Hoàn Kiếm' },
      craft_preference: 'silk',
    } as never)
    expect(profile.matching_attributes.some((a: { type: string }) => a.type === 'experience_type')).toBe(false)
  })
})
