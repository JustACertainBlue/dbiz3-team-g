import { vi } from 'vitest'
import { ConversationalAiService } from '@/lib/ai/llm-service'
import { CloudflareAiClient } from '@/lib/ai/cloudflare-client'
import { OpenRouterClient } from '@/lib/ai/openrouter-client'

// Fake AI providers for tests. No test ever calls a real model API.

export interface FakeModelAnswer {
  intent?: 'tour_matching' | 'platform_guidance' | 'mixed'
  conversational_reply?: string
  extracted_context?: Record<string, unknown>
  conversation_delta?: Record<string, unknown>
  follow_up_questions?: string[]
  missing_primary?: string[]
}

export function installFakeModel(answer: FakeModelAnswer | (() => FakeModelAnswer)) {
  const runChat = vi.fn(async () => {
    const value = typeof answer === 'function' ? answer() : answer
    return {
      success: true,
      text: JSON.stringify({
        intent: 'tour_matching',
        conversational_reply: 'Mình đã ghi nhận yêu cầu của đoàn.',
        follow_up_questions: [],
        ...(value.conversation_delta ? {} : { extracted_context: {} }),
        ...value,
      }),
      modelUsed: 'fake-model',
    }
  })
  ConversationalAiService.setClients(
    { isConfigured: () => true, runChat, fallbackModel: 'fake-fallback' } as unknown as CloudflareAiClient,
    { isConfigured: () => false } as unknown as OpenRouterClient,
  )
  return runChat
}

export function installUnavailableModel() {
  ConversationalAiService.setClients(
    { isConfigured: () => false } as unknown as CloudflareAiClient,
    { isConfigured: () => false } as unknown as OpenRouterClient,
  )
}

export function installFailingModel() {
  const runChat = vi.fn(async () => ({ success: false, error: 'boom' }))
  ConversationalAiService.setClients(
    { isConfigured: () => true, runChat, fallbackModel: 'fake-fallback' } as unknown as CloudflareAiClient,
    { isConfigured: () => true, runChat } as unknown as OpenRouterClient,
  )
  return runChat
}

export function restoreRealClients() {
  ConversationalAiService.setClients(new CloudflareAiClient(), new OpenRouterClient())
}
