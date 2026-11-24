import { vi } from 'vitest'
import * as extractor from '@/lib/ai/extractor'
import type { ExtractionOptions, ExtractionResult, MessageInput } from '@/lib/ai/extractor'
import { ConversationalAiService } from '@/lib/ai/llm-service'
import { CloudflareAiClient } from '@/lib/ai/cloudflare-client'
import { OpenRouterClient } from '@/lib/ai/openrouter-client'
import { systemClock } from '@/lib/booking/clock'

type MockAnalysisResponse = {
  intent: 'tour_matching' | 'platform_guidance' | 'mixed'
  conversational_reply: string
  extracted_context: Record<string, unknown>
  follow_up_questions: string[]
}

const MOCK_LLM_RESPONSE: MockAnalysisResponse = {
  intent: 'tour_matching',
  conversational_reply: 'Đã phân tích yêu cầu tour.',
  extracted_context: {},
  follow_up_questions: [],
}

export function installAitLlmMock(overrides: Partial<MockAnalysisResponse> = {}) {
  const text = JSON.stringify({ ...MOCK_LLM_RESPONSE, ...overrides })
  ConversationalAiService.setClients(
    {
      isConfigured: () => true,
      runChat: vi.fn().mockResolvedValue({
        success: true,
        text,
        modelUsed: 'test-mock',
      }),
    } as unknown as CloudflareAiClient,
    { isConfigured: () => false } as unknown as OpenRouterClient
  )
}

export function installAitExtractionMock(results: ExtractionResult[]) {
  const pendingResults = [...results]
  vi.spyOn(extractor, 'extractTourContext').mockImplementation(async () => {
    const result = pendingResults.shift()
    if (!result) throw new Error('No mocked AIT extraction result remains.')
    return result
  })
}

export function installAitRouteAnalysisMock() {
  vi.spyOn(extractor, 'extractTourContext').mockImplementation(async (
    input: MessageInput[] | { messages: MessageInput[] },
    options?: ExtractionOptions
  ) => {
    const messages = Array.isArray(input) ? input : input.messages
    const result = ConversationalAiService.fallbackAnalysis(
      messages,
      { inCooldown: false, provider: 'test', model: 'test' },
      options?.now ?? systemClock
    )
    return {
      is_complete: result.is_complete,
      processing_status: 'Success',
      retry_available: false,
      follow_up_questions: result.follow_up_questions,
      tour_context: result.tour_context,
      conversational_reply: result.conversational_reply,
      missing_primary: result.missing_primary,
      intent: result.intent,
      quota_status: result.quota_status,
      usedLlm: false,
      delta_validation: result.delta_validation,
    }
  })
}

export function restoreAitLlmMock() {
  vi.restoreAllMocks()
  ConversationalAiService.setClients(new CloudflareAiClient(), new OpenRouterClient())
}
