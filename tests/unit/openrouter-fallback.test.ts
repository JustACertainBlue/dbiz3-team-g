import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenRouterClient } from '@/lib/ai/openrouter-client'
import { CloudflareAiClient } from '@/lib/ai/cloudflare-client'
import { ConversationalAiService } from '@/lib/ai/llm-service'
import { QuotaManager } from '@/lib/ai/quota-manager'

describe('OpenRouter Client & Fallback Integration', () => {
  beforeEach(async () => {
    await QuotaManager.resetCooldown()
  })

  describe('1. OpenRouterClient configuration & classification', () => {
    it('reports not configured when API key is missing', () => {
      const client = new OpenRouterClient({ apiKey: '' })
      expect(client.isConfigured()).toBe(false)
    })

    it('reports configured when API key is present', () => {
      const client = new OpenRouterClient({ apiKey: 'sk-or-v1-dummy-key' })
      expect(client.isConfigured()).toBe(true)
    })

    it('correctly classifies quota exhaustion errors (429, 402, rate limit, credits)', () => {
      expect(OpenRouterClient.isQuotaExhaustionError(429, 'Rate limit exceeded')).toBe(true)
      expect(OpenRouterClient.isQuotaExhaustionError(402, 'Payment required: insufficient credits')).toBe(true)
      expect(OpenRouterClient.isQuotaExhaustionError(400, 'User out of credits for model')).toBe(true)
      expect(OpenRouterClient.isQuotaExhaustionError(500, 'Internal Server Error')).toBe(false)
      expect(OpenRouterClient.isQuotaExhaustionError(404, 'Not Found')).toBe(false)
    })
  })

  describe('2. ConversationalAiService Fallback to OpenRouter', () => {
    it('falls back to OpenRouter when Cloudflare free quota is exhausted', async () => {
      // Mock Cloudflare client that returns quota exhaustion
      const mockCloudflare = {
        isConfigured: () => true,
        runChat: vi.fn().mockResolvedValue({
          success: false,
          isQuotaExhausted: true,
          error: 'Daily 10,000 Neurons quota exceeded (error 10016)',
          modelUsed: '@cf/zai-org/glm-4.7-flash',
        }),
      } as unknown as CloudflareAiClient

      // Mock OpenRouter client that succeeds
      const mockOpenRouter = {
        isConfigured: () => true,
        runChat: vi.fn().mockResolvedValue({
          success: true,
          text: JSON.stringify({
            intent: 'tour_matching',
            conversational_reply: 'OpenRouter đã ghép thành công đoàn đi Bát Tràng!',
            extracted_context: {
              group_size: 12,
              target_date: '2026-11-20',
              origin: 'Hoàn Kiếm',
              craft_preference: 'pottery',
              budget_per_person: 200000,
            },
            follow_up_questions: [],
          }),
          modelUsed: 'google/gemini-2.0-flash-lite:free',
        }),
      } as unknown as OpenRouterClient

      ConversationalAiService.setClients(mockCloudflare, mockOpenRouter)

      const messages = [{ sender: 'Agency', text: 'Đoàn 12 khách đi làm gốm Bát Tràng' }]
      const result = await ConversationalAiService.processConversation(messages)

      // Must have called Cloudflare first, then fell back to OpenRouter
      expect(mockCloudflare.runChat).toHaveBeenCalled()
      expect(mockOpenRouter.runChat).toHaveBeenCalled()

      // The result must reflect successful LLM usage via OpenRouter
      expect(result.usedLlm).toBe(true)
      expect(result.modelUsed).toContain('openrouter')
      expect(result.tour_context.group_size).toBe(12)
      expect(result.tour_context.craft_preference).toBe('pottery')
      expect(result.conversational_reply).toContain('OpenRouter')

      // Quota cooldown should be activated on Cloudflare for 24h
      expect(result.quota_status.inCooldown).toBe(true)

      // Restore default clients
      ConversationalAiService.setClients(new CloudflareAiClient(), new OpenRouterClient())
    })

    it('falls back to OpenRouter when Cloudflare is already in 24h cooldown', async () => {
      // Put Cloudflare in cooldown
      await QuotaManager.recordQuotaExhaustion('10016: free tier quota exhausted')

      const mockCloudflare = {
        isConfigured: () => true,
        runChat: vi.fn(),
      } as unknown as CloudflareAiClient

      const mockOpenRouter = {
        isConfigured: () => true,
        runChat: vi.fn().mockResolvedValue({
          success: true,
          text: JSON.stringify({
            intent: 'tour_matching',
            conversational_reply: 'OpenRouter phục vụ trong thời gian Cloudflare cooldown.',
            extracted_context: {
              group_size: 15,
              target_date: '2026-12-01',
              origin: 'Ba Đình',
              craft_preference: 'silk',
              budget_per_person: 250000,
            },
            follow_up_questions: [],
          }),
          modelUsed: 'meta-llama/llama-3.3-70b-instruct:free',
        }),
      } as unknown as OpenRouterClient

      ConversationalAiService.setClients(mockCloudflare, mockOpenRouter)

      const messages = [{ sender: 'Agency', text: 'Đoàn 15 khách đi Vạn Phúc' }]
      const result = await ConversationalAiService.processConversation(messages)

      // Cloudflare should NOT be called because it is in cooldown
      expect(mockCloudflare.runChat).not.toHaveBeenCalled()
      // OpenRouter should be called directly
      expect(mockOpenRouter.runChat).toHaveBeenCalled()

      expect(result.usedLlm).toBe(true)
      expect(result.modelUsed).toContain('openrouter')
      expect(result.tour_context.group_size).toBe(15)

      // Restore
      ConversationalAiService.setClients(new CloudflareAiClient(), new OpenRouterClient())
    })

    it('falls back to rule-based heuristic when both Cloudflare and OpenRouter fail', async () => {
      const mockCloudflare = {
        isConfigured: () => true,
        runChat: vi.fn().mockResolvedValue({ success: false, error: 'Cloudflare 500' }),
      } as unknown as CloudflareAiClient

      const mockOpenRouter = {
        isConfigured: () => true,
        runChat: vi.fn().mockResolvedValue({ success: false, error: 'OpenRouter 429' }),
      } as unknown as OpenRouterClient

      ConversationalAiService.setClients(mockCloudflare, mockOpenRouter)

      const messages = [{ sender: 'Agency', text: 'Đoàn 10 khách gốm Bát Tràng ngày 20/11/2026 xuất phát từ Hoàn Kiếm' }]
      const result = await ConversationalAiService.processConversation(messages)

      // Falls back to rule-based heuristic
      expect(result.usedLlm).toBe(false)
      expect(result.tour_context.group_size).toBe(10)
      expect(result.tour_context.craft_preference).toBe('pottery')

      // Restore
      ConversationalAiService.setClients(new CloudflareAiClient(), new OpenRouterClient())
    })
  })
})

