/** Screen 22: texts the AI module shows the Agency are Vietnamese (constants in src/lib/ai/extractor.ts and
 *  src/lib/matching/recommendation-service.ts, used only by the AI module). Wording only; logic is covered elsewhere. */
import { describe, expect, it } from 'vitest'
import { extractTourContext } from '@/lib/ai/extractor'
import { buildRelaxationSuggestions } from '@/lib/matching/recommendation-service'

describe('clarification questions (Vietnamese)', () => {
  it('asks for group size, date, origin and craft in Vietnamese', async () => {
    const result = await extractTourContext([{ sender: 'Agency', text: 'xin chào' } as never])
    expect(result.follow_up_questions).toHaveLength(4)
    for (const q of result.follow_up_questions) expect(q).toMatch(/[ạảãàáâấầẩẫăắằẳẵêếềểễôốồổỗơớờởỡưứừửữđ]/i)
    expect(result.follow_up_questions[0]).toContain('số khách')
  })
})

describe('conversation_prompt (Vietnamese)', () => {
  it('default, capacity and budget prompts', async () => {
    const base = await buildRelaxationSuggestions([], {})
    expect(base.conversation_prompt).toMatch(/Chưa có trải nghiệm nào/)
    const cap = await buildRelaxationSuggestions([], { group_size: 200 }, { largest_group_size: 16 })
    expect(cap.conversation_prompt).toMatch(/16 khách/)
    const budget = await buildRelaxationSuggestions([{ price_per_person: 150000, match_score: 80 }], { group_size: 10, max_budget_per_person: 20000 })
    expect(budget.conversation_prompt).toMatch(/20\.000 ₫\/khách/)
    expect(budget.conversation_prompt).toMatch(/150\.000 ₫\/khách/)
  })
})
