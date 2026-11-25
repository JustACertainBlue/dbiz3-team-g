import { describe, expect, it } from 'vitest'
import {
  isNationalityOrigin,
  isOriginGroundedInUserText,
  isUsableOrigin,
  resolveCraftPreference,
} from '@/lib/ai/grounding'
import { validateConversationDelta } from '@/lib/ait/conversation-delta'
import { mergeConversationState, emptyConversationState } from '@/lib/ait/conversation-state'

describe('AI grounding helpers (shared by llm-service and conversation-state)', () => {
  it('a nationality or country is never a starting point, even when the user wrote it', () => {
    for (const origin of ['Ý', 'Italy', 'Pháp', 'France', 'Nhật Bản', 'Hàn Quốc', 'Úc']) {
      expect(isNationalityOrigin(origin), origin).toBe(true)
      expect(isUsableOrigin(origin, `đoàn khách từ ${origin} muốn làm gốm`), origin).toBe(false)
    }
  })

  it('a Hanoi place the user wrote stays usable', () => {
    expect(isUsableOrigin('Hoàn Kiếm', 'xuất phát từ Hoàn Kiếm')).toBe(true)
    expect(isOriginGroundedInUserText('Vạn Phúc', 'gợi ý làng lụa')).toBe(false)
  })

  it('resolveCraftPreference maps a free phrase to the taxonomy key', () => {
    expect(resolveCraftPreference('dệt lụa', [])).toBe('silk')
    expect(resolveCraftPreference(undefined, [{ text: 'muốn làm gốm' }])).toBe('pottery')
  })

  it('"từ Ý" never becomes the origin of the conversation state, even if the model returns it', () => {
    const text = 'Đoàn 12 khách từ Ý muốn làm gốm'
    const state = mergeConversationState(
      emptyConversationState(), text, { origin_or_route: { origin_address: 'Ý' } }, new Date('2026-11-25T03:00:00Z'),
    )
    expect(state.origin).toBeUndefined()
  })

  it('a delta that sets the origin to a nationality is rejected', () => {
    const validation = validateConversationDelta(
      { origin: { action: 'set', value: 'Ý', raw_span: 'từ Ý' } },
      'Đoàn 12 khách từ Ý muốn làm gốm', [],
    )
    expect(validation.accepted.origin).toBeUndefined()
    expect(validation.rejected.some(item => item.slot === 'origin')).toBe(true)
  })
})
