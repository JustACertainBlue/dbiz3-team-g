import { CloudflareAiClient, type CloudflareChatMessage } from './cloudflare-client'
import { OpenRouterClient } from './openrouter-client'
import { QuotaManager, type QuotaStatus } from './quota-manager'
import { buildSystemPrompt, detectPromptInjection, detectUnauthorizedDataProbe } from './prompt-templates'
import { queryKnowledgeBase, type KnowledgeItem } from './knowledge-base'
import type { TourContext } from '@/lib/matching/types'
import { extractTourDate } from './tour-date'
import { detectExperienceTypes } from '@/lib/matching/craft-taxonomy'
import { systemClock } from '@/lib/booking/clock'
import { isNationalityOrigin, isUsableOrigin, resolveCraftPreference } from './grounding'
import { craftLabelVi } from './turn-guards'
import { parseExplicitBudgetAmount } from '@/lib/ait/budget'
import type { AitConversationState } from '@/lib/ait/conversation-state'
import { validateConversationDelta } from '@/lib/ait/conversation-delta'
import type { ValidatedConversationDelta } from '@/lib/ait/conversation-delta-schema'

export interface ConversationalAiResult {
  intent: 'tour_matching' | 'platform_guidance' | 'mixed'
  conversational_reply: string
  tour_context: TourContext
  is_complete: boolean
  follow_up_questions: string[]
  missing_primary: string[]
  quota_status: QuotaStatus
  usedLlm: boolean
  modelUsed?: string
  delta_validation?: ValidatedConversationDelta
}

export function sanitizeConversationalReply(text: string): string {
  if (!text) return ''
  const cleaned = text
    .replace(/(?:(?:\*{1,2})?(?:extracted\s+context|thông tin trích xuất)(?:\*{1,2})?:?[\s\S]*?(?=(?:\n\s*\n\s*[A-ZÀ-Ỹ0-9])|$))/gi, '')
    .replace(/^[\s•\-\*]*`?(?:craft_preference|origin|experience_types|group_size|target_date|budget_per_person)`?\s*:.*$/gim, '')
    .replace(/^[\s•\-\*]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return cleaned || text.trim()
}

const VIETNAMESE_CHARACTERS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i
// Diacritic-free Vietnamese is common in chat ("doan 15 khach"). A small keyword list keeps the
// server-side follow-up questions in the language the Agency actually writes.
const VIETNAMESE_WORDS = /(?:^|\s)(?:khach|nguoi|ngay|khong|muon|doan|lang|trai|nghiem|tim|nhu)(?:\s|$)/i

/** True when the text is written in Vietnamese (diacritics, or common diacritic-free keywords). */
export function isVietnameseText(text: string): boolean {
  if (!text) return false
  return VIETNAMESE_CHARACTERS.test(text) || VIETNAMESE_WORDS.test(text)
}

/** Fields the Agency explicitly declined to specify ("không có yêu cầu cụ thể về ..."). */
export interface WaiverFlags {
  budget: boolean
  date: boolean
  origin: boolean
  craft: boolean
}

export const NO_WAIVERS: WaiverFlags = { budget: false, date: false, origin: false, craft: false }

// BR-004 requires clarifying questions for missing core fields, but a field the Agency deliberately
// left open is not missing: re-asking it every turn is what made the assistant look canned.
const WAIVER_MARKER = /(?:không\s+(?:có\s+)?(?:yêu\s*cầu|quan\s*trọng|cần(?:\s+chốt)?|giới\s*hạn|đòi\s*hỏi)|chưa\s+(?:cần|có)|tùy\s*(?:ý)?|tuỳ\s*(?:ý)?|linh\s*hoạt|sao\s*cũng\s*được|thế\s*nào\s*cũng\s*được|no\s+specific\s+requirement|not\s+important|flexible)/i

const WAIVER_FIELDS: Array<{ field: keyof WaiverFlags; keywords: RegExp }> = [
  { field: 'budget', keywords: /(?:ngân\s*sách|kinh\s*phí|chi\s*phí|giá\s*(?:cả|thành)?|budget|price)/i },
  { field: 'date', keywords: /(?:ngày|thời\s*gian|thời\s*điểm|khởi\s*hành|date|time)/i },
  { field: 'origin', keywords: /(?:xuất\s*phát|điểm\s*đón|điểm\s*khởi\s*hành|địa\s*điểm|origin|pickup)/i },
  { field: 'craft', keywords: /(?:nghề|trải\s*nghiệm|loại\s*hình|craft|experience)/i },
]

/**
 * Reads the fields the Agency said they have no particular requirement for, so the assistant stops
 * asking about them and the tour can still be matched (see WAIVER_MARKER).
 */
export function detectWaivers(text: string): WaiverFlags {
  const waivers: WaiverFlags = { ...NO_WAIVERS }
  if (!text) return waivers
  for (const clause of text.split(/[,.;\n!?]+/)) {
    if (!WAIVER_MARKER.test(clause)) continue
    for (const { field, keywords } of WAIVER_FIELDS) {
      if (keywords.test(clause)) waivers[field] = true
    }
  }
  return waivers
}

function replyTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2)
  )
}

/** 1 = the same wording, 0 = nothing in common. Catches a model that recycles its previous answer. */
export function replySimilarity(left: string, right: string): number {
  const a = replyTokens(left)
  const b = replyTokens(right)
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const token of a) if (b.has(token)) shared += 1
  return shared / Math.min(a.size, b.size)
}

/** True when the new reply is a verbatim or near-verbatim copy of an earlier assistant message. */
export function isRepeatedReply(reply: string, previousAssistantReplies: string[], threshold = 0.7): boolean {
  const normalized = reply.trim().toLowerCase()
  if (normalized.length < 20) return false
  return previousAssistantReplies.some(previous => {
    if (!previous) return false
    if (previous.trim().toLowerCase() === normalized) return true
    return replySimilarity(reply, previous) >= threshold
  })
}

export class AiServiceUnavailableError extends Error {
  readonly code = 'AI_SERVICE_UNAVAILABLE'

  constructor() {
    super('AI_SERVICE_UNAVAILABLE')
    this.name = 'AiServiceUnavailableError'
  }
}

/**
 * Keeps only what the model reports as unavailable if the user actually wrote it, so the reply never
 * claims a gap for something nobody asked about.
 */
function groundedMissingPrimary(values: unknown, userText: string): string[] {
  if (!Array.isArray(values)) return []
  const haystack = userText.toLowerCase()
  const kept: string[] = []
  for (const raw of values) {
    if (typeof raw !== 'string') continue
    const value = raw.replace(/\s+/g, ' ').trim().slice(0, 80)
    if (value && haystack.includes(value.toLowerCase()) && !kept.includes(value)) kept.push(value)
  }
  return kept
}

export class ConversationalAiService {
  private static client: CloudflareAiClient = new CloudflareAiClient()
  private static openRouterClient: OpenRouterClient = new OpenRouterClient()

  /** True when at least one AI provider has credentials. Without any, requests cannot be analysed. */
  static isConfigured(): boolean {
    return this.client.isConfigured() || this.openRouterClient.isConfigured()
  }

  /**
   * Helper to set custom or mock clients (for testing or reconfiguration)
   */
  static setClients(cloudflare?: CloudflareAiClient, openRouter?: OpenRouterClient) {
    if (cloudflare) this.client = cloudflare
    if (openRouter) this.openRouterClient = openRouter
  }

  /**
   * Processes a multi-turn conversation using Cloudflare Workers AI, with OpenRouter as a secondary provider.
   */
  static async processConversation(
    messages: Array<{ sender?: string; text: string; sent_at?: string }>,
    options?: {
      now?: () => Date
      state?: AitConversationState
      recentTurns?: Array<{ sender?: string; text: string; sent_at?: string }>
    }
  ): Promise<ConversationalAiResult> {
    const latestUserMsg = [...messages].reverse().find(m => m.sender?.toLowerCase() !== 'assistant')?.text || ''
    const now = options?.now ?? systemClock

    // 1. Check persistent 24-hour quota cooldown
    let quotaStatus = await QuotaManager.checkCooldown()

    // 2. Check for prompt injection attempts
    if (detectPromptInjection(latestUserMsg)) {
      const isVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(latestUserMsg)
      return {
        intent: 'platform_guidance',
        conversational_reply: isVi
          ? 'Yêu cầu không hợp lệ. Vui lòng hỏi về các dịch vụ ghép tour hoặc thông tin làng nghề thủ công Hà Nội.'
          : 'Invalid request. Please ask about tour matching or verified Hanoi craft villages.',
        tour_context: {},
        is_complete: false,
        follow_up_questions: [],
        missing_primary: [],
        quota_status: quotaStatus,
        usedLlm: false,
      }
    }

    // 2.1 Railguards: Multi-tenant Agency Isolation & Admin Privacy Protection
    const probe = detectUnauthorizedDataProbe(latestUserMsg)
    if (probe.isBlocked) {
      const isVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(latestUserMsg)
      return {
        intent: 'platform_guidance',
        conversational_reply: isVi ? probe.messageVi! : probe.messageEn!,
        tour_context: {},
        is_complete: false,
        follow_up_questions: [],
        missing_primary: [],
        quota_status: quotaStatus,
        usedLlm: false,
      }
    }

    // 3. Evaluate availability of LLM providers:
    // Primary: Cloudflare Workers AI (10,000 free daily Neurons)
    // Secondary provider: OpenRouter AI (when Cloudflare is in cooldown, out of tokens, or fails)
    const canUseCloudflare = !quotaStatus.inCooldown && this.client.isConfigured()
    const canUseOpenRouter = this.openRouterClient.isConfigured()

    if (!canUseCloudflare && !canUseOpenRouter) {
      throw new AiServiceUnavailableError()
    }

    // 4. Retrieve matching knowledge items for context grounding
    const relevantKnowledge = queryKnowledgeBase(latestUserMsg)
    const knowledge = relevantKnowledge.length > 0 ? relevantKnowledge : undefined
    const systemPrompt = buildSystemPrompt(knowledge)

    const previousAssistantReplies: string[] = []
    const currentState = options?.state ?? {}
    const recentUserTurns = (options?.recentTurns ?? messages)
      .filter(message => message.sender?.toLowerCase() !== 'assistant')
      .slice(-2)
      .map(message => message.text)
    const cfMessages: CloudflareChatMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'system',
        content: `Current structured conversation state (JSON): ${JSON.stringify(currentState)}`,
      },
      {
        role: 'system',
        content: `Recent user turns (oldest first; use only to resolve references, never as new constraints): ${JSON.stringify(recentUserTurns)}`,
      },
      ...(latestUserMsg ? [{ role: 'user' as const, content: latestUserMsg }] : []),
    ]

    const jsonMode = { response_format: { type: 'json_object' as const } }
    let aiResponse: {
      success: boolean
      text?: string
      isQuotaExhausted?: boolean
      modelUsed?: string
      error?: string
    } = { success: false }

    // 5. Try Cloudflare Workers AI first if available (with an anti-repetition retry)
    if (canUseCloudflare) {
      aiResponse = await this.generateReply(cfMessages, knowledge, previousAssistantReplies, jsonMode)

      // Handle confirmed Cloudflare Quota Exhaustion
      if (!aiResponse.success && aiResponse.isQuotaExhausted) {
        console.warn('Daily 10,000 Neurons free quota exhausted on Cloudflare. Activating 24-hour protective cooldown.')
        quotaStatus = await QuotaManager.recordQuotaExhaustion(
          aiResponse.error || 'Daily free 10,000 Neurons quota exhausted',
          aiResponse.modelUsed
        )
      }
    }

    // 6. Secondary LLM Fallback: If Cloudflare failed, ran out of tokens, or is in cooldown, fallback to OpenRouter
    if ((!aiResponse.success || !aiResponse.text) && canUseOpenRouter) {
      console.info('[AIT] Cloudflare AI unavailable or quota exhausted. Falling back to OpenRouter API...')
      const orResponse = await this.openRouterClient.runChat(cfMessages, jsonMode)
      if (orResponse.success && orResponse.text) {
        aiResponse = {
          success: true,
          text: orResponse.text,
          modelUsed: `openrouter:${orResponse.modelUsed || 'default'}`,
        }
      } else {
        console.warn('[AIT] OpenRouter fallback also failed:', orResponse.error)
      }
    }

    // 7. Do not invent an analysis when both LLM providers are unavailable.
    if (!aiResponse.success || !aiResponse.text) {
      throw new AiServiceUnavailableError()
    }

    // 8. Parse and validate LLM JSON response
    let parsed: any
    try {
      parsed = this.cleanAndParseJson(aiResponse.text)
      this.validateStructuredResponse(parsed)
    } catch {
      const retryMessages = [
        ...cfMessages,
        { role: 'system' as const, content: 'Your previous response was invalid. Return only valid JSON matching the required response schema. Do not return prose or markdown.' },
      ]
      let retried: { success: boolean; text?: string; modelUsed?: string } = { success: false }
      if (aiResponse.modelUsed?.startsWith('openrouter:')) {
        const response = await this.openRouterClient.runChat(retryMessages, jsonMode)
        retried = response
      } else if (canUseCloudflare) {
        retried = await this.client.runChat(retryMessages, jsonMode)
      }
      let cloudflareRetryValid = false
      if (retried.success && retried.text) {
        try {
          parsed = this.cleanAndParseJson(retried.text)
          this.validateStructuredResponse(parsed)
          cloudflareRetryValid = true
        } catch {
          // Fall through to the configured secondary provider below.
        }
      }
      if (cloudflareRetryValid) {
        aiResponse = { ...aiResponse, text: retried.text, modelUsed: retried.modelUsed || aiResponse.modelUsed }
      } else {
        if (aiResponse.modelUsed?.startsWith('openrouter:') || !canUseOpenRouter) {
          throw new AiServiceUnavailableError()
        }
        const fallback = await this.openRouterClient.runChat(retryMessages, jsonMode)
        if (!fallback.success || !fallback.text) throw new AiServiceUnavailableError()
        try {
          parsed = this.cleanAndParseJson(fallback.text)
          this.validateStructuredResponse(parsed)
        } catch {
          throw new AiServiceUnavailableError()
        }
        aiResponse = { ...aiResponse, text: fallback.text, modelUsed: `openrouter:${fallback.modelUsed || 'default'}` }
      }
    }

    const hasFaqIndicators = /(?:như thế nào|là gì|làm sao|cách nào|thế nào|giải thích|hướng dẫn|thang điểm|công thức|quy trình|cách ghép|how |what is|how to|explain|tell me about)/i.test(latestUserMsg)
    const isExplicitTourAction = /(?:tìm|muốn ghép|cần tìm|tổ chức tour|book|đặt tour|find tour|looking for tour)/i.test(latestUserMsg)
    const detectedGuidance = hasFaqIndicators && !isExplicitTourAction

    if (parsed && typeof parsed === 'object') {
      const isVi = isVietnameseText(latestUserMsg)
      const deltaValidation = validateConversationDelta(
        parsed.conversation_delta,
        latestUserMsg,
        recentUserTurns,
        options?.state,
        now(),
      )
      const tourContext = parsed.conversation_delta === undefined
        ? this.mapExtractedToTourContext(parsed.extracted_context, messages, now)
        : {}
      // Intent handling: platform guidance vs tour matching
      const rawIntent = parsed.intent || 'tour_matching'
      const isGuidance = rawIntent === 'platform_guidance' || detectedGuidance
      const hasTourDetails = Object.keys(tourContext).length > 0
      const isPlatformOnlyGuidance = isGuidance && !hasTourDetails
      const hasTourIntent = !isPlatformOnlyGuidance && (rawIntent === 'tour_matching' || rawIntent === 'mixed' || hasTourDetails)
      const waivers = detectWaivers(latestUserMsg)
      const followUps: string[] = Array.isArray(parsed.follow_up_questions)
        ? parsed.follow_up_questions.filter((question: unknown): question is string =>
          typeof question === 'string'
          && !/(?:xuất phát|điểm đón|origin|from)/i.test(question)
        )
        : []

      // Require the craft, group size, and date fields for a tour to be complete (BR-004, T035). A field the Agency
      // explicitly waived counts as settled, so the assistant stops asking about it.
      const hasPreference = Boolean(tourContext.craft_preference || (tourContext.experience_types && tourContext.experience_types.length > 0))
      const hasGroupSize = tourContext.group_size !== undefined && tourContext.group_size > 0
      const hasDate = Boolean(tourContext.target_date_or_range?.start_date)
      const hasBudget = tourContext.budget?.max_per_person !== undefined

      if (!isPlatformOnlyGuidance && (!hasPreference || !hasGroupSize || !hasDate)) {
        if (!hasGroupSize && !followUps.some(q => /số lượng khách|group size|pax|khách/i.test(q))) {
          followUps.push(isVi ? 'Quý khách vui lòng cho biết số lượng khách dự kiến tham gia đoàn?' : 'Could you please specify your expected group size?')
        }
        if (!hasDate && !waivers.date && !followUps.some(q => /ngày|date|khi nào/i.test(q))) {
          followUps.push(isVi ? 'Đoàn dự kiến khởi hành vào ngày nào (ví dụ: 25/11 hoặc Thứ Năm tuần tới)?' : 'What is your desired date or date range for the tour?')
        }
        if (!hasPreference && !waivers.craft && !followUps.some(q => /nghề|craft|trải nghiệm|thủ công/i.test(q))) {
          followUps.push(isVi ? 'Đoàn quan tâm đến loại trải nghiệm làng nghề nào (ví dụ: gốm Bát Tràng, lụa Vạn Phúc, mộc Chàng Sơn, mây tre Phú Vinh)?' : 'Which craft or type of experience are you looking for (for example pottery, silk weaving, woodcarving)?')
        }
      }

      // A missing budget is asked again, unless the Agency said the budget does not matter.
      if (!isPlatformOnlyGuidance && !hasBudget && !waivers.budget && !followUps.some(q => /ngân sách|budget/i.test(q))) {
        followUps.push(isVi ? 'Ngân sách dự kiến cho mỗi khách khoảng bao nhiêu?' : 'What is your expected budget per guest?')
      }

      const finalContext = tourContext
      // If user has all 4 core fields, mark complete and match right away, but STILL keep follow-up questions to refine!
      const isComplete = Boolean(!isPlatformOnlyGuidance && hasGroupSize && (hasDate || waivers.date) && (hasPreference || waivers.craft) && (hasBudget || waivers.budget))

      return {
        intent: isPlatformOnlyGuidance ? 'platform_guidance' : (hasTourIntent ? 'tour_matching' : 'platform_guidance'),
        conversational_reply: this.resolveReply(parsed.conversational_reply, previousAssistantReplies, finalContext, waivers, isVi),
        tour_context: finalContext,
        is_complete: isComplete,
        follow_up_questions: followUps,
        missing_primary: groundedMissingPrimary(parsed.missing_primary, latestUserMsg),
        quota_status: quotaStatus,
        usedLlm: true,
        modelUsed: aiResponse.modelUsed,
        delta_validation: deltaValidation,
      }
    }

    throw new AiServiceUnavailableError()
  }

  /**
   * Calls the primary model. When it recycles an earlier assistant answer instead of answering the
   * newest message, retries once with the free fallback model and an explicit anti-repetition
   * instruction (rule 12). Returns the best response available.
   */
  private static async generateReply(
    cfMessages: CloudflareChatMessage[],
    knowledge: KnowledgeItem[] | undefined,
    previousAssistantReplies: string[],
    options?: { response_format: { type: 'json_object' } }
  ): Promise<Awaited<ReturnType<CloudflareAiClient['runChat']>>> {
    const first = await this.client.runChat(cfMessages, options)
    if (!first.success || !first.text) return first

    const firstReply = this.extractReplyText(first.text)
    if (!firstReply || !isRepeatedReply(firstReply, previousAssistantReplies)) return first

    console.warn('[AIT] The model repeated an earlier answer. Retrying once with the fallback model and an anti-repetition instruction.')
    const retry = await this.client.runChat(
      [{ role: 'system', content: buildSystemPrompt(knowledge, { antiRepetition: true }) }, ...cfMessages.slice(1)],
      { model: this.client.fallbackModel, ...options }
    )
    if (!retry.success || !retry.text) return first

    const retryReply = this.extractReplyText(retry.text)
    if (retryReply && !isRepeatedReply(retryReply, previousAssistantReplies)) return retry
    return retry
  }

  private static validateStructuredResponse(value: any): void {
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || !['tour_matching', 'platform_guidance', 'mixed'].includes(value.intent)
      || typeof value.conversational_reply !== 'string'
      || (value.conversation_delta === undefined
        && (!value.extracted_context || typeof value.extracted_context !== 'object' || Array.isArray(value.extracted_context)))
      || (value.conversation_delta !== undefined
        && (!value.conversation_delta || typeof value.conversation_delta !== 'object' || Array.isArray(value.conversation_delta)))
      || (value.follow_up_questions !== undefined && (!Array.isArray(value.follow_up_questions)
        || value.follow_up_questions.some((question: unknown) => typeof question !== 'string')))
      || (value.missing_primary !== undefined && (!Array.isArray(value.missing_primary)
        || value.missing_primary.some((field: unknown) => typeof field !== 'string')))) {
      throw new Error('Invalid structured AIT response')
    }
  }

  /** Reads the conversational reply from a model answer, whether it is JSON or plain prose. */
  private static extractReplyText(raw: string): string | null {
    if (!raw) return null
    try {
      const parsed = this.cleanAndParseJson(raw)
      if (parsed && typeof parsed === 'object' && typeof parsed.conversational_reply === 'string' && parsed.conversational_reply.trim()) {
        return parsed.conversational_reply.trim()
      }
    } catch {
      // Not JSON: fall through and treat the whole answer as prose.
    }
    const trimmed = raw.trim()
    return trimmed.length > 5 ? trimmed : null
  }

  /**
   * Final reply for one turn: the model answer, or a targeted sentence built from the extracted
   * context when the model produced nothing usable or simply repeated itself.
   */
  private static resolveReply(
    modelReply: unknown,
    previousAssistantReplies: string[],
    tourContext: TourContext,
    waivers: WaiverFlags,
    isVi: boolean
  ): string {
    const candidate = typeof modelReply === 'string' ? sanitizeConversationalReply(modelReply) : ''
    if (candidate && !isRepeatedReply(candidate, previousAssistantReplies)) return candidate
    return this.contextualReply(tourContext, waivers, isVi)
  }

  /**
   * Deterministic, input-aware reply used when the model answer is unusable. It acknowledges the
   * details the Agency just gave, respects waived fields, and asks only for what is still unknown.
   */
  private static contextualReply(
    tourContext: TourContext,
    waivers: WaiverFlags,
    isVi: boolean
  ): string {
    const group = tourContext.group_size
    const craft = tourContext.craft_preference || tourContext.experience_types?.[0]
    const date = tourContext.target_date_or_range?.start_date
    const acknowledged: string[] = []
    if (group) acknowledged.push(isVi ? `đoàn khoảng ${group} khách` : `a group of about ${group} guests`)
    if (craft) acknowledged.push(isVi ? `trải nghiệm ${craftLabelVi(craft)}` : `a ${craft} experience`)
    if (date) acknowledged.push(isVi ? `ngày ${date}` : `the date ${date}`)

    const waived: string[] = []
    if (waivers.budget) waived.push(isVi ? 'ngân sách' : 'budget')
    if (waivers.date) waived.push(isVi ? 'thời gian' : 'timing')
    if (waivers.origin) waived.push(isVi ? 'điểm xuất phát' : 'the starting point')
    if (waivers.craft) waived.push(isVi ? 'loại nghề' : 'the craft type')

    const missing: string[] = []
    if (!group) missing.push(isVi ? 'số lượng khách dự kiến' : 'the expected group size')
    if (!craft && !waivers.craft) missing.push(isVi ? 'loại trải nghiệm làng nghề mong muốn' : 'the craft experience you want')
    if (!date && !waivers.date) missing.push(isVi ? 'ngày dự kiến khởi hành' : 'the intended departure date')

    const sentences: string[] = []
    sentences.push(acknowledged.length > 0
      ? (isVi ? `Tôi đã ghi nhận ${acknowledged.join(', ')}.` : `I have noted ${acknowledged.join(', ')}.`)
      : (isVi ? 'Tôi đã ghi nhận yêu cầu mới nhất của đoàn.' : 'I have noted your latest request.'))
    if (waived.length > 0) {
      sentences.push(isVi
        ? `Đoàn linh hoạt về ${waived.join(' và ')}, nên tôi sẽ không hỏi lại các mục này.`
        : `You are flexible about ${waived.join(' and ')}, so I will not ask about them again.`)
    }
    sentences.push(missing.length > 0
      ? (isVi
        ? `Để chốt danh sách xưởng phù hợp, tôi cần thêm ${missing.slice(0, 2).join(' và ')}.`
        : `To finalise the matching workshops I still need ${missing.slice(0, 2).join(' and ')}.`)
      : (isVi
        ? 'Tôi đang đối soát các xưởng nghề đã xác minh phù hợp nhất cho đoàn.'
        : 'I am matching the verified workshops that fit your group best.'))

    return sentences.join(' ')
  }

  /**
   * Cleans potential markdown code blocks (```json ... ```) and parses JSON.
   */
  private static cleanAndParseJson(raw: string): any {
    let clean = raw.trim()
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return JSON.parse(clean)
  }

  /**
   * Merges and validates extracted LLM fields with date and craft taxonomy parsers.
   */
  private static mapExtractedToTourContext(
    extracted: any,
    messages: Array<{ text: string; sender?: string }>,
    now: () => Date
  ): TourContext {
    const context: TourContext = {}
    const userMessages = messages.filter(m => m.sender?.toLowerCase() !== 'assistant')
    const relevantMsgs = userMessages.length > 0 ? userMessages : messages
    const fullText = relevantMsgs.map(m => m.text).join(' ')
    const relativeCenterPreference = /(?:gần|near)\s+(?:trung tâm|center)(?:\s+ấy)?/iu.test(fullText)
      && !/(?:xuất phát từ|điểm đón|pickup|from)\b/iu.test(fullText)

    if (extracted?.group_size && typeof extracted.group_size === 'number' && extracted.group_size > 0) {
      context.group_size = extracted.group_size
    } else {
      // The model does not always return valid JSON. Reading the group size from the messages keeps
      // the context (and the matching pipeline) moving forward on every turn.
      for (const m of [...relevantMsgs].reverse()) {
        const detected = ConversationalAiService.parseGroupSize(m.text || '')
        if (detected !== undefined) {
          context.group_size = detected
          break
        }
      }
    }

    const explicitBudget = parseExplicitBudgetAmount(fullText)
    if (explicitBudget !== undefined) {
      context.budget = { max_per_person: explicitBudget, currency: 'VND' }
    }

    if (extracted?.target_date) {
      const parsedDate = extractTourDate(String(extracted.target_date), now())
      if (parsedDate) {
        context.target_date_or_range = { start_date: parsedDate }
      }
    }
    if (!context.target_date_or_range) {
      const fallbackDate = extractTourDate(fullText, now())
      if (fallbackDate) context.target_date_or_range = { start_date: fallbackDate }
    }

    // The model sometimes answers with a free phrase ("dệt lụa") instead of a canonical taxonomy key.
    // Canonicalise it so scoring and the match reason use a known craft; otherwise every candidate is
    // reported as a mismatch and the raw phrase leaks into the reason (#25, #32).
    const craftPreference = resolveCraftPreference(extracted?.craft_preference, relevantMsgs)
    if (craftPreference) context.craft_preference = craftPreference

    if (Array.isArray(extracted?.experience_types) && extracted.experience_types.length > 0) {
      context.experience_types = extracted.experience_types
    } else {
      const reversed = [...relevantMsgs].reverse()
      for (const m of reversed) {
        const detected = detectExperienceTypes(m.text || '')
        if (detected.length > 0) {
          context.experience_types = detected
          break
        }
      }
    }

    // The model may echo a village it suggested, or a nationality ("từ Ý"), as the group's origin.
    // Accept an origin only when the user wrote it and it is a place, never a country.
    if (!relativeCenterPreference && typeof extracted?.origin === 'string') {
      const origin = extracted.origin.trim()
      if (origin && !isNationalityOrigin(origin) && isUsableOrigin(origin, fullText)) {
        context.origin_or_route = { origin_address: origin }
      }
    }

    return context
  }

  /**
   * Reads "15 khách", "nhóm 15", "group of 15", "12 pax" … from one message. Supports both accented
   * (khách, người, nhóm) and unaccented Vietnamese (khach, nguoi, nhom) for no-diacritic input (BR-004).
   */
  private static parseGroupSize(text: string): number | undefined {
    const match = text.match(
      /(?:nh[oó]m|group\s+of?|for)\s*(\d+)|(\d+)\s*(?:French|international|foreign|guests?|pax|people|tourists?|passengers?|kh[aá]ch|ng[uư][oờ]i|b[aạ]n)/i
    )
    if (!match) return undefined
    const value = parseInt(match[1] || match[2], 10)
    return Number.isFinite(value) && value > 0 ? value : undefined
  }
}
