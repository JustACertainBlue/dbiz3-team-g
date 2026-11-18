import { describe, expect, it } from 'vitest'
import { emptyConversationState } from '@/lib/ait/conversation-state'
import {
  applyConversationDelta,
  validateConversationDelta,
  type ConversationDelta,
} from '@/lib/ait/conversation-delta'

const now = new Date('2026-11-18T00:00:00.000Z')

describe('AIT conversation delta contract', () => {
  it('accepts only grounded, typed set operations and applies them with source turns', () => {
    const before = emptyConversationState()
    const delta: ConversationDelta = {
      craft: { action: 'set', value: 'pottery', raw_span: 'làng gốm' },
      group_size: { action: 'set', value: 30, raw_span: '30 bạn' },
      radius: { action: 'set', value: 10, raw_span: 'dưới 10 km' },
      budget_per_person: { action: 'set', value: 200000, raw_span: '200k/người' },
      budget_basis: { action: 'set', value: 'per_person', raw_span: '200k/người' },
    }

    const validation = validateConversationDelta(delta, 'Tìm làng gốm cho 30 bạn, dưới 10 km, 200k/người', [])
    expect(validation.rejected).toEqual([])
    expect(applyConversationDelta(before, validation, now)).toMatchObject({
      craft: 'pottery',
      group_size: 30,
      radius_km: 10,
      budget_per_person: 200000,
      budget_basis: 'per_person',
      slots: {
        craft: { source: 'explicit', source_turn: 1 },
        group_size: { source: 'explicit', source_turn: 1 },
        radius: { source: 'explicit', source_turn: 1 },
      },
    })
  })

  it('rejects invalid deltas independently and leaves those existing slots unchanged', () => {
    const before = {
      ...emptyConversationState(),
      craft: 'silk',
      group_size: 12,
      radius_km: 8,
      budget_per_person: 300000,
    }
    const delta: ConversationDelta = {
      craft: { action: 'set', value: 'invented-craft', raw_span: 'tò he' },
      group_size: { action: 'set', value: 0, raw_span: '0 khách' },
      radius: { action: 'set', value: -5, raw_span: 'dưới -5 km' },
      budget_per_person: { action: 'set', value: 500000, raw_span: 'dưới 5 km' },
      origin: { action: 'set', value: 'Đà Nẵng', raw_span: 'Đà Nẵng' },
    }

    const validation = validateConversationDelta(delta, 'tò he, 0 khách, dưới -5 km', [])
    expect(validation.accepted).toEqual({})
    expect(validation.rejected.map(item => item.slot)).toEqual([
      'craft',
      'group_size',
      'radius',
      'budget_per_person',
      'origin',
    ])
    expect(applyConversationDelta(before, validation, now)).toMatchObject({
      craft: 'silk',
      group_size: 12,
      radius_km: 8,
      budget_per_person: 300000,
    })
  })

  it('lets a valid newer set replace the previous value for that slot', () => {
    const before = {
      ...emptyConversationState(),
      craft: 'pottery',
      radius_km: 10,
    }
    const delta: ConversationDelta = {
      craft: { action: 'set', value: 'silk', raw_span: 'làng lụa' },
      radius: { action: 'set', value: 20, raw_span: '20 km' },
    }
    const validation = validateConversationDelta(delta, 'đổi sang làng lụa, 20 km', [], before)

    expect(validation.rejected).toEqual([])
    expect(applyConversationDelta(before, validation, now)).toMatchObject({
      craft: 'silk',
      craft_no_data: false,
      radius_km: 20,
    })
  })

  it('distinguishes an explicitly requested unsupported craft from an invalid delta', () => {
    const before = {
      ...emptyConversationState(),
      craft: 'pottery',
      radius_km: 10,
      group_size: 14,
    }
    const unsupportedCraft = {
      craft: { action: 'set', value: 'hương hay tò he', raw_span: 'làm hương hay tò he' },
      radius: { action: 'set', value: 20, raw_span: 'cách 20 km' },
      group_size: { action: 'set', value: 10, raw_span: '10 người' },
    } satisfies ConversationDelta
    const validation = validateConversationDelta(
      unsupportedCraft,
      'cho khách hoạt động cách 20 km, làm hương hay tò he cho 10 người',
      [],
      before,
    )

    expect(validation.accepted).toMatchObject({
      radius: { action: 'set', value: 20 },
      group_size: { action: 'set', value: 10 },
    })
    expect(validation.unsupported).toEqual({
      craft: unsupportedCraft.craft,
    })
    expect(validation.rejected).toEqual([])
    expect(applyConversationDelta(before, validation, now)).toMatchObject({
      craft: 'hương hay tò he',
      craft_no_data: true,
      radius_km: 20,
      group_size: 10,
    })
  })

  it('clears only a slot explicitly cleared by the latest user turn', () => {
    const before = {
      ...emptyConversationState(),
      radius_km: 10,
      slots: {
        radius: { value: 10, raw_span: 'dưới 10 km', created_turn: 1, source_turn: 1, source: 'explicit' as const },
      },
      turn_count: 1,
    }
    const delta: ConversationDelta = {
      radius: { action: 'clear', raw_span: 'bỏ giới hạn km' },
    }

    const validation = validateConversationDelta(delta, 'Bỏ giới hạn km', [])
    expect(validation.rejected).toEqual([])
    const after = applyConversationDelta(before, validation, now)
    expect(after.radius_km).toBeUndefined()
    expect(after.slots).toEqual({})
    expect(after.turn_count).toBe(2)
  })

  it('validates a group-total budget basis and stores the per-person ceiling', () => {
    const phrase = '1,4 triệu cho cả đoàn 14 người'
    const delta: ConversationDelta = {
      group_size: { action: 'set', value: 14, raw_span: '14 người' },
      budget_basis: { action: 'set', value: 'group_total', raw_span: phrase },
      budget_per_person: { action: 'set', value: 100000, raw_span: phrase },
    }

    const validation = validateConversationDelta(delta, phrase, [])
    expect(validation.rejected).toEqual([])
    expect(applyConversationDelta(emptyConversationState(), validation, now)).toMatchObject({
      group_size: 14,
      budget_basis: 'group_total',
      budget_per_person: 100000,
    })
  })

  it('uses a relax delta and prior user-turn context to waive the English-guide request', () => {
    const before = {
      ...emptyConversationState(),
      interests: ['khách nước ngoài'],
      turn_count: 1,
    }
    const delta: ConversationDelta = {
      guide_language: { action: 'relax', raw_span: 'Không có cũng được' },
    }

    const validation = validateConversationDelta(
      delta,
      'Không có cũng được',
      ['Có hướng dẫn tiếng Anh không?'],
    )
    expect(validation.rejected).toEqual([])
    expect(applyConversationDelta(before, validation, now)).toMatchObject({
      interests: ['khách nước ngoài'],
      relaxed_fields: ['guide_language'],
      turn_count: 1,
    })
  })

  it('rejects relax when there is no matching earlier user request', () => {
    const validation = validateConversationDelta(
      { guide_language: { action: 'relax', raw_span: 'Không có cũng được' } },
      'Không có cũng được',
      [],
    )

    expect(validation.accepted).toEqual({})
    expect(validation.rejected).toEqual([
      { slot: 'guide_language', reason: 'no_matching_prior_user_request' },
    ])
  })
})
