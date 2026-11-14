/**
 * Cloudflare Workers AI Client
 * Uses the official Cloudflare Workers AI REST API endpoint:
 * https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{MODEL}
 *
 * Enforces:
 * - Free allocation only (10,000 Neurons/day).
 * - Primary model: @cf/meta/llama-3.1-8b-instruct (docs/AIT-COMPREHENSIVE-RULES.md §III.1).
 * - Free fallback model: @cf/zai-org/glm-4.7-flash, used when the primary fails or returns no text.
 * - Quota exhaustion classification.
 * - Zero paid fallback.
 */

export interface CloudflareChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface CloudflareAiResponse {
  success: boolean
  text?: string
  rawResponse?: any
  error?: string
  status?: number
  isQuotaExhausted: boolean
  isNetworkError: boolean
  modelUsed?: string
}

export interface CloudflareClientOptions {
  accountId?: string
  apiToken?: string
  primaryModel?: string
  fallbackModel?: string
  timeoutMs?: number
}

export class CloudflareAiClient {
  private readonly options?: CloudflareClientOptions

  constructor(options?: CloudflareClientOptions) {
    this.options = options
  }

  get accountId(): string | undefined {
    return this.options?.accountId || process.env.CLOUDFLARE_ACCOUNT_ID
  }

  get apiToken(): string | undefined {
    return this.options?.apiToken || process.env.CLOUDFLARE_API_TOKEN
  }

  get primaryModel(): string {
    return this.options?.primaryModel || process.env.CLOUDFLARE_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct'
  }

  get fallbackModel(): string {
    return this.options?.fallbackModel || process.env.CLOUDFLARE_AI_FALLBACK_MODEL || '@cf/zai-org/glm-4.7-flash'
  }

  get timeoutMs(): number {
    return this.options?.timeoutMs || 30000
  }

  isConfigured(): boolean {
    return Boolean(this.accountId && this.apiToken)
  }

  /**
   * Evaluates whether an HTTP error status and body indicate confirmed quota exhaustion.
   */
  static isQuotaExhaustionError(status: number, errorBodyText: string): boolean {
    if (status !== 429) return false
    const lower = errorBodyText.toLowerCase()
    return (
      lower.includes('10016') || // Cloudflare error code for Workers AI rate/quota limit
      lower.includes('quota') ||
      lower.includes('exceeded') ||
      lower.includes('neurons') ||
      lower.includes('out of credits') ||
      lower.includes('usage limit') ||
      lower.includes('free tier limit')
    )
  }

  async runChat(
    messages: CloudflareChatMessage[],
    options?: { model?: string; temperature?: number; max_tokens?: number }
  ): Promise<CloudflareAiResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isQuotaExhausted: false,
        isNetworkError: false,
        error: 'Cloudflare credentials not configured (CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN missing)',
      }
    }

    const modelToUse = options?.model || this.primaryModel
    const primary = await this.executeRequest(modelToUse, messages, options)

    // The documented free fallback model is used only when the primary model itself failed.
    // A confirmed quota exhaustion is account-wide, so a second model cannot help and is skipped.
    // A timeout is skipped as well so one request never waits for two full timeouts.
    const primaryFailed = !primary.success || !primary.text?.trim()
    const timedOut = Boolean(primary.isNetworkError && /timed out/i.test(primary.error || ''))
    if (!primaryFailed || primary.isQuotaExhausted || timedOut) return primary

    const fallbackModel = this.fallbackModel
    if (!fallbackModel || fallbackModel === modelToUse) return primary

    const fallback = await this.executeRequest(fallbackModel, messages, options)
    if (fallback.success && fallback.text?.trim()) return fallback

    // Neither model produced text: report the primary failure so callers keep a single error path.
    return primary
  }

  private async executeRequest(
    model: string,
    messages: CloudflareChatMessage[],
    options?: { temperature?: number; max_tokens?: number }
  ): Promise<CloudflareAiResponse> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${model}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        const isQuota = CloudflareAiClient.isQuotaExhaustionError(status, bodyText)
        return {
          success: false,
          status,
          isQuotaExhausted: isQuota,
          isNetworkError: false,
          error: `Cloudflare API error (${status}): ${bodyText}`,
          modelUsed: model,
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
          modelUsed: model,
        }
      }

      // Handle Cloudflare Workers AI response:
      // Format 1: OpenAI chat completion format (e.g. @cf/zai-org/glm-4.7-flash): { result: { choices: [{ message: { content: "...", reasoning: "..." } }] } }
      // Format 2: Standard Workers AI format: { result: { response: "..." }, success: true }
      const msg = parsed.result?.choices?.[0]?.message || parsed.choices?.[0]?.message
      let text = msg?.content || parsed.result?.response || parsed.result?.text || ''

      // If content was truncated or left in reasoning, extract JSON block from reasoning
      if (!text && (msg?.reasoning || msg?.reasoning_content)) {
        const reasoning = msg.reasoning || msg.reasoning_content
        const jsonMatch = reasoning.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          text = jsonMatch[0]
        }
      }

      if (!text && typeof parsed.result === 'string') {
        text = parsed.result
      }

      return {
        success: true,
        text,
        rawResponse: parsed,
        isQuotaExhausted: false,
        isNetworkError: false,
        modelUsed: model,
      }
    } catch (err: any) {
      clearTimeout(timeoutId)
      const isTimeout = err.name === 'AbortError'
      return {
        success: false,
        isQuotaExhausted: false,
        isNetworkError: true,
        error: isTimeout ? `Request timed out after ${this.timeoutMs}ms` : err.message || 'Network error',
        modelUsed: model,
      }
    }
  }
}
