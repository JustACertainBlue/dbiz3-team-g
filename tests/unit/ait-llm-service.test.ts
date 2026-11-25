import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { AiServiceUnavailableError, ConversationalAiService } from '@/lib/ai/llm-service'
import { installFailingModel, installFakeModel, installUnavailableModel, restoreRealClients } from '../helpers/ait-fake-clients'

const NOW = () => new Date('2026-11-25T03:00:00Z')
const turn = (text: string) => [{ sender: 'Agency', text }]

describe('ConversationalAiService with fake providers', () => {
  afterEach(() => restoreRealClients())

  it('"từ Ý" is a nationality: it never becomes the origin, even when the model returns it', async () => {
    installFakeModel({ extracted_context: { origin: 'Ý', group_size: 12, craft_preference: 'pottery', target_date: '2026-12-10' } })
    const result = await ConversationalAiService.processConversation(turn('Đoàn 12 khách từ Ý muốn làm gốm ngày 10/12/2026'), { now: NOW })
    expect(result.tour_context.origin_or_route).toBeUndefined()
    expect(result.tour_context.craft_preference).toBe('pottery')
  })

  it('a village the model suggested is not the origin unless the user wrote it', async () => {
    installFakeModel({ extracted_context: { origin: 'Vạn Phúc', group_size: 8 } })
    const result = await ConversationalAiService.processConversation(turn('Đoàn 8 khách muốn làm lụa'), { now: NOW })
    expect(result.tour_context.origin_or_route).toBeUndefined()
  })

  it('a missing budget is asked again, and is not asked once the Agency gave one', async () => {
    installFakeModel({ extracted_context: { group_size: 10, craft_preference: 'pottery', target_date: '2026-12-10' } })
    const without = await ConversationalAiService.processConversation(turn('10 khách làm gốm ngày 10/12/2026'), { now: NOW })
    expect(without.is_complete).toBe(false)
    expect(without.follow_up_questions.some(q => /ngân sách/i.test(q))).toBe(true)

    const withBudget = await ConversationalAiService.processConversation(turn('10 khách làm gốm ngày 10/12/2026 ngân sách 500k'), { now: NOW })
    expect(withBudget.is_complete).toBe(true)
    expect(withBudget.follow_up_questions.some(q => /ngân sách/i.test(q))).toBe(false)
  })

  it('a fallback reply names the craft in Vietnamese, not as an English key', async () => {
    installFakeModel({ conversational_reply: '', extracted_context: { group_size: 10, craft_preference: 'silk' } })
    const result = await ConversationalAiService.processConversation(turn('10 khách muốn dệt lụa'), { now: NOW })
    expect(result.conversational_reply).toContain('dệt lụa')
    expect(result.conversational_reply).not.toMatch(/\bsilk\b/i)
  })

  it('keeps missing_primary only when the user wrote it', async () => {
    installFakeModel({ missing_primary: ['ăn trưa', 'spa'], extracted_context: { group_size: 5 } })
    const result = await ConversationalAiService.processConversation(turn('5 khách cần ăn trưa'), { now: NOW })
    expect(result.missing_primary).toEqual(['ăn trưa'])
  })

  it('no provider configured → AiServiceUnavailableError, never an invented analysis', async () => {
    installUnavailableModel()
    expect(ConversationalAiService.isConfigured()).toBe(false)
    await expect(ConversationalAiService.processConversation(turn('10 khách làm gốm'), { now: NOW }))
      .rejects.toBeInstanceOf(AiServiceUnavailableError)
  })

  it('both providers failing → AiServiceUnavailableError', async () => {
    installFailingModel()
    await expect(ConversationalAiService.processConversation(turn('10 khách làm gốm'), { now: NOW }))
      .rejects.toBeInstanceOf(AiServiceUnavailableError)
  })

  it('a model answering with prose twice → AiServiceUnavailableError', async () => {
    ConversationalAiService.setClients(
      { isConfigured: () => true, runChat: async () => ({ success: true, text: 'Xin chào!', modelUsed: 'fake' }), fallbackModel: 'f' } as never,
      { isConfigured: () => false } as never,
    )
    await expect(ConversationalAiService.processConversation(turn('10 khách làm gốm'), { now: NOW }))
      .rejects.toBeInstanceOf(AiServiceUnavailableError)
  })

  it('has no rule-based analysis path and no rule-based mode text', () => {
    expect((ConversationalAiService as unknown as Record<string, unknown>).fallbackAnalysis).toBeUndefined()
    const source = readFileSync('src/lib/ai/llm-service.ts', 'utf8')
    expect(source).not.toMatch(/rule-based matching mode/i)
    expect(source).not.toMatch(/fallbackMissingPrimary/)
    expect(source).not.toMatch(/missing-primary/)
  })

  it('the prompt tells the model never to invent km or minutes', async () => {
    const { buildSystemPrompt } = await import('@/lib/ai/prompt-templates')
    const prompt = buildSystemPrompt()
    expect(prompt).toMatch(/NEVER state a distance in km or a travel time in minutes/)
    expect(prompt).not.toMatch(/village-coordinate/i)
  })
})
