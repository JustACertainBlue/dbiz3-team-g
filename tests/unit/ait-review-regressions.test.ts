import { afterEach, describe, expect, it } from 'vitest'
import { AiServiceUnavailableError, ConversationalAiService } from '@/lib/ai/llm-service'
import { CloudflareAiClient } from '@/lib/ai/cloudflare-client'
import { OpenRouterClient } from '@/lib/ai/openrouter-client'
import { emptyConversationState, mergeConversationState } from '@/lib/ait/conversation-state'
import { hanoiDate } from '@/lib/booking/clock'

const response = (text: string) => ({ success: true, text, isQuotaExhausted: false, isNetworkError: false })
const valid = JSON.stringify({
  intent: 'tour_matching',
  conversational_reply: 'Cho tôi biết ngày dự kiến nhé.',
  extracted_context: { craft_preference: 'pottery' },
  follow_up_questions: [],
})

afterEach(() => ConversationalAiService.setClients(new CloudflareAiClient(), new OpenRouterClient()))

describe('AIT review regressions', () => {
  it('retries invalid model JSON once and accepts a valid structured response', async () => {
    let call = 0
    const cloudflare = {
      isConfigured: () => true,
      runChat: async () => (++call === 1 ? response('plain text') : response(valid)),
    } as unknown as CloudflareAiClient
    ConversationalAiService.setClients(cloudflare, new OpenRouterClient({ apiKey: '' }))
    await expect(ConversationalAiService.processConversation([{ sender: 'Agency', text: 'Tìm tour làm gốm' }]))
      .resolves.toMatchObject({ intent: 'tour_matching', tour_context: { craft_preference: 'pottery' } })
    expect(call).toBe(2)
  })

  it('fails closed when both structured response attempts are invalid', async () => {
    let call = 0
    const cloudflare = {
      isConfigured: () => true,
      runChat: async () => (++call === 1 ? response('plain text') : response('{"intent":"bad"}')),
    } as unknown as CloudflareAiClient
    ConversationalAiService.setClients(cloudflare, new OpenRouterClient({ apiKey: '' }))
    await expect(ConversationalAiService.processConversation([{ sender: 'Agency', text: 'Tìm tour làm gốm' }]))
      .rejects.toBeInstanceOf(AiServiceUnavailableError)
    expect(call).toBe(2)
  })

  it('falls back to OpenRouter when Cloudflare JSON retry fails at provider level', async () => {
    let cloudflareCalls = 0
    const cloudflare = {
      isConfigured: () => true,
      runChat: async () => ++cloudflareCalls === 1
        ? response('not json')
        : { success: false, error: 'network unavailable', isQuotaExhausted: false, isNetworkError: true },
    } as unknown as CloudflareAiClient
    const runChat = async (_messages: unknown, options?: { response_format?: { type: 'json_object' } }) => {
      expect(options?.response_format).toEqual({ type: 'json_object' })
      return { ...response(valid), modelUsed: 'fallback-test' }
    }
    const openRouter = { isConfigured: () => true, runChat } as unknown as OpenRouterClient
    ConversationalAiService.setClients(cloudflare, openRouter)
    await expect(ConversationalAiService.processConversation([{ sender: 'Agency', text: 'Tìm tour làm gốm' }]))
      .resolves.toMatchObject({ intent: 'tour_matching', tour_context: { craft_preference: 'pottery' }, modelUsed: 'openrouter:fallback-test' })
    expect(cloudflareCalls).toBe(2)
  })

  it('keeps included crafts and excludes only the craft named after the exclusion phrase', () => {
    const state = mergeConversationState(emptyConversationState(), 'Tôi muốn làm gốm và dệt lụa, không muốn thêu', {}, new Date('2026-11-01T00:00:00Z'))
    expect(state.crafts).toEqual(['pottery', 'silk'])
    expect(state.exclusions.crafts).toEqual(['embroidery'])
  })

  it('uses Hanoi calendar dates across month, year and leap-day boundaries', () => {
    expect(hanoiDate(Date.parse('2026-01-31T17:30:00Z'))).toBe('2026-02-01')
    expect(hanoiDate(Date.parse('2026-12-31T17:30:00Z'))).toBe('2027-01-01')
    expect(hanoiDate(Date.parse('2024-02-29T16:30:00Z'))).toBe('2024-02-29')
  })
})
