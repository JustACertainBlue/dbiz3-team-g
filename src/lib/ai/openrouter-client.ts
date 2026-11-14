/**
 * OpenRouter AI Client
 * Uses the official OpenRouter API endpoint:
 * https://openrouter.ai/api/v1/chat/completions
 *
 * Provides secondary LLM fallback when Cloudflare Workers AI daily free quota
 * (10,000 Neurons) is exhausted or unavailable.
 */

export interface OpenRouterChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenRouterResponse {
  success: boolean
  text?: string
  rawResponse?: any
  error?: string
  status?: number
  isQuotaExhausted: boolean
  isNetworkError: boolean
  modelUsed?: string
}

export interface OpenRouterClientOptions {
  apiKey?: string
  primaryModel?: string
  fallbackModels?: string[]
  timeoutMs?: number
}

export class OpenRouterClient {
  private readonly options?: OpenRouterClientOptions

  constructor(options?: OpenRouterClientOptions) {
    this.options = options
  }

  get apiKey(): string | undefined {
    return this.options?.apiKey || process.env.OPENROUTER_API_KEY
  }

  get primaryModel(): string {
    return (
      this.options?.primaryModel ||
      process.env.OPENROUTER_MODEL ||
      'google/gemini-2.0-flash-lite:free'
    )
  }

  get fallbackModels(): string[] {
    if (this.options?.fallbackModels) return this.options.fallbackModels
    if (process.env.OPENROUTER_FALLBACK_MODELS) {
      return process.env.OPENROUTER_FALLBACK_MODELS.split(',').map(m => m.trim())
    }
    return [
      'meta-llama/llama-3.3-70b-instruct:free',
      'qwen/qwen-2.5-7b-instruct:free',
      'mistralai/mistral-7b-instruct:free',
    ]
  }

  get timeoutMs(): number {
    return this.options?.timeoutMs || 30000
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0)
  }

  /**
   * Evaluates whether an HTTP error status or body indicates quota/credits exhaustion or rate limit.
   */
  static isQuotaExhaustionError(status: number, errorBodyText: string): boolean {
    if (status === 429 || status === 402) return true
    const lower = errorBodyText.toLowerCase()
    return (
      lower.includes('quota') ||
      lower.includes('credit') ||
      lower.includes('rate limit') ||
      lower.includes('insufficient') ||
      lower.includes('balance') ||
      lower.includes('free tier limit')
    )
  }

  async runChat(
    messages: OpenRouterChatMessage[],
    options?: { model?: string; temperature?: number; max_tokens?: number }
  ): Promise<OpenRouterResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isQuotaExhausted: false,
        isNetworkError: false,
        error: 'OpenRouter API key not configured (OPENROUTER_API_KEY missing)',
      }
    }

    const url = 'https://openrouter.ai/api/v1/chat/completions'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

    const modelToUse = options?.model || this.primaryModel
    const modelsList = options?.model ? [options.model] : [this.primaryModel, ...this.fallbackModels]

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Hanoi Artisan Bridge',
        },
        body: JSON.stringify({
          models: modelsList,
          model: modelToUse,
          messages,
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.max_tokens ?? 2048,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const status = response.status
      const bodyText = await response.text()

      if (!response.ok) {
        const isQuota = OpenRouterClient.isQuotaExhaustionError(status, bodyText)
        return {
          success: false,
          status,
          isQuotaExhausted: isQuota,
          isNetworkError: false,
          error: `OpenRouter API error (${status}): ${bodyText}`,
          modelUsed: modelToUse,
        }
      }

      let parsed: any
      try {
        parsed = JSON.parse(bodyText)
      } catch {
        return {
          success: true,
          text: bodyText,
          isQuotaExhausted: false,
          isNetworkError: false,
          modelUsed: modelToUse,
        }
      }

      const msg = parsed.choices?.[0]?.message
      let text = msg?.content || ''

      // If content is empty but reasoning exists, try to extract JSON
      if (!text && (msg?.reasoning || msg?.reasoning_content)) {
        const reasoning = msg.reasoning || msg.reasoning_content
        const jsonMatch = reasoning.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          text = jsonMatch[0]
        }
      }

      const actualModel = parsed.model || modelToUse

      return {
        success: true,
        text,
        rawResponse: parsed,
        isQuotaExhausted: false,
        isNetworkError: false,
        modelUsed: actualModel,
      }
    } catch (err: any) {
      clearTimeout(timeoutId)
      const isTimeout = err.name === 'AbortError'
      return {
        success: false,
        isQuotaExhausted: false,
        isNetworkError: true,
        error: isTimeout ? `OpenRouter request timed out after ${this.timeoutMs}ms` : err.message || 'Network error',
        modelUsed: modelToUse,
      }
    }
  }
}

