import { describe, expect, it } from 'vitest'
import { pastDateNotice, craftLabelVi, craftSuggestionTargets } from '@/lib/ai/turn-guards'
import { emptyConversationState, isCompleteConversationState, missingQuestions } from '@/lib/ait/conversation-state'

const NOW = new Date('2026-11-25T03:00:00Z')

describe('turn guards', () => {
  it('a past date is named as past, not reported as "no data"', () => {
    const notice = pastDateNotice('đoàn 10 khách ngày 10/10/2026', NOW)
    expect(notice).toBe('Ngày 10/10/2026 đã qua. Bạn vui lòng chọn một ngày từ hôm nay trở đi.')
    expect(notice).not.toMatch(/chưa có dữ liệu/i)
  })

  it('a date that does not exist is reported as such, not as a past date (31/02)', () => {
    const notice = pastDateNotice('đoàn 10 khách ngày 31/02/2030', NOW)
    expect(notice).toBe('Ngày 31/02/2030 không tồn tại. Bạn vui lòng nhập lại một ngày hợp lệ.')
    expect(pastDateNotice('ngày 31/02/2020', NOW)).toMatch(/không tồn tại/)
  })

  it('a future or absent date gives no notice', () => {
    expect(pastDateNotice('đoàn 10 khách ngày 10/12/2026', NOW)).toBeUndefined()
    expect(pastDateNotice('đoàn 10 khách', NOW)).toBeUndefined()
  })

  it('craft keys are shown in Vietnamese at the source, never as English keys', () => {
    expect(craftLabelVi('silk')).toBe('dệt lụa')
    expect(craftLabelVi('pottery')).toBe('làm gốm')
    expect(craftLabelVi('conical hat')).toBe('làm nón lá')
  })

  it('several crafts become one target per craft, never a merged itinerary', () => {
    expect(craftSuggestionTargets({ crafts: ['pottery', 'silk'] })).toEqual(['pottery', 'silk'])
    expect(craftSuggestionTargets({ craft: 'silk' })).toEqual(['silk'])
    expect(craftSuggestionTargets({})).toEqual([])
  })

  it('a missing budget is asked again, and a waived or dismissed one is not', () => {
    const base = { ...emptyConversationState(), group_size: 10, date: '2026-12-10', craft: 'pottery' }
    expect(missingQuestions(base).map(q => q.field)).toContain('budget_per_person')
    expect(isCompleteConversationState(base)).toBe(false)
    const dismissed = { ...base, dismissed_questions: ['budget_per_person' as const] }
    expect(isCompleteConversationState(dismissed)).toBe(true)
    const withBudget = { ...base, budget_per_person: 500000 }
    expect(isCompleteConversationState(withBudget)).toBe(true)
  })
})
