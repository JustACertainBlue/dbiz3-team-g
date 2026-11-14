import { CloudflareAiClient, type CloudflareChatMessage } from './cloudflare-client'
import { OpenRouterClient } from './openrouter-client'
import { QuotaManager, type QuotaStatus } from './quota-manager'
import { buildSystemPrompt, detectPromptInjection, detectUnauthorizedDataProbe } from './prompt-templates'
import { queryKnowledgeBase, type KnowledgeItem } from './knowledge-base'
import type { TourContext } from '@/lib/matching/types'
import { extractTourDate } from './tour-date'
import { detectCraftPreference, detectExperienceTypes } from '@/lib/matching/craft-taxonomy'
import { systemClock } from '@/lib/booking/clock'

export interface ConversationalAiResult {
  intent: 'tour_matching' | 'platform_guidance' | 'mixed'
  conversational_reply: string
  tour_context: TourContext
  is_complete: boolean
  follow_up_questions: string[]
  quota_status: QuotaStatus
  usedLlm: boolean
  modelUsed?: string
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

/**
 * Resolves the craft preference for one turn. The model may answer with a free phrase ("dệt lụa")
 * instead of a canonical taxonomy key, so map it through the taxonomy first; otherwise every candidate
 * is reported as a mismatch and the raw phrase leaks into the match reason (#25, #32). Falls back to the
 * newest user message that names a craft.
 */
export function resolveCraftPreference(
  extractedCraft: unknown,
  userMessages: Array<{ text?: string }>
): string | undefined {
  const raw = extractedCraft ? String(extractedCraft) : ''
  const canonical = raw ? detectCraftPreference(raw) : undefined
  if (canonical) return canonical
  for (const m of [...userMessages].reverse()) {
    const found = detectCraftPreference(m.text || '')
    if (found) return found
  }
  return raw || undefined
}

/**
 * True when an origin returned by the model is actually present in what the user wrote. Prevents the
 * assistant from treating a village it suggested itself as the group's starting point.
 */
export function isOriginGroundedInUserText(origin: string, userText: string): boolean {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  const needle = normalize(origin)
  if (!needle) return false
  return normalize(userText).includes(needle)
}

export class ConversationalAiService {
  private static client: CloudflareAiClient = new CloudflareAiClient()
  private static openRouterClient: OpenRouterClient = new OpenRouterClient()

  /**
   * Helper to set custom or mock clients (for testing or reconfiguration)
   */
  static setClients(cloudflare?: CloudflareAiClient, openRouter?: OpenRouterClient) {
    if (cloudflare) this.client = cloudflare
    if (openRouter) this.openRouterClient = openRouter
  }

  /**
   * Processes a multi-turn conversation using Cloudflare Workers AI with fallback to OpenRouter AI,
   * followed by intelligent rule-based heuristic extraction.
   */
  static async processConversation(
    messages: Array<{ sender?: string; text: string; sent_at?: string }>,
    options?: { now?: () => Date }
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
        quota_status: quotaStatus,
        usedLlm: false,
      }
    }

    // 3. Evaluate availability of LLM providers:
    // Primary: Cloudflare Workers AI (10,000 free daily Neurons)
    // Secondary fallback: OpenRouter AI (when Cloudflare is in cooldown, out of tokens, or fails)
    const canUseCloudflare = !quotaStatus.inCooldown && this.client.isConfigured()
    const canUseOpenRouter = this.openRouterClient.isConfigured()

    if (!canUseCloudflare && !canUseOpenRouter) {
      return this.fallbackAnalysis(messages, quotaStatus, now)
    }

    // 4. Retrieve matching knowledge items for context grounding
    const relevantKnowledge = queryKnowledgeBase(latestUserMsg)
    const knowledge = relevantKnowledge.length > 0 ? relevantKnowledge : undefined
    const systemPrompt = buildSystemPrompt(knowledge)

    // Format messages for the LLM. Earlier assistant turns are kept so references such
    // as "1 đi" still resolve, but the reply itself is checked against them for repetition (rule 13).
    const previousAssistantReplies = messages
      .filter(m => m.sender?.toLowerCase() === 'assistant')
      .map(m => m.text)
      .filter((text): text is string => Boolean(text && text.trim()))
    const cfMessages: CloudflareChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-6).map(m => ({
        role: (m.sender?.toLowerCase() === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.text,
      })),
    ]

    let aiResponse: {
      success: boolean
      text?: string
      isQuotaExhausted?: boolean
      modelUsed?: string
      error?: string
    } = { success: false }

    // 5. Try Cloudflare Workers AI first if available (with an anti-repetition retry)
    if (canUseCloudflare) {
      aiResponse = await this.generateReply(cfMessages, knowledge, previousAssistantReplies)

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
      const orResponse = await this.openRouterClient.runChat(cfMessages)
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

    // 7. If both LLM providers failed or are unavailable, fall back to intelligent rule-based analysis
    if (!aiResponse.success || !aiResponse.text) {
      return this.fallbackAnalysis(messages, quotaStatus, now)
    }

    // 8. Parse and validate LLM JSON response
    let parsed: any = null
    try {
      parsed = this.cleanAndParseJson(aiResponse.text)
    } catch (err) {
      console.warn('[AIT] LLM returned non-JSON text. Using text as conversational_reply directly. Raw:', aiResponse.text?.slice(0, 200), err)
    }

    const hasFaqIndicators = /(?:như thế nào|là gì|làm sao|cách nào|thế nào|giải thích|hướng dẫn|thang điểm|công thức|quy trình|cách ghép|how |what is|how to|explain|tell me about)/i.test(latestUserMsg)
    const isExplicitTourAction = /(?:tìm|muốn ghép|cần tìm|tổ chức tour|book|đặt tour|find tour|looking for tour)/i.test(latestUserMsg)
    const detectedGuidance = hasFaqIndicators && !isExplicitTourAction

    if (parsed && typeof parsed === 'object') {
      const isVi = isVietnameseText(latestUserMsg)
      const tourContext = this.mapExtractedToTourContext(parsed.extracted_context, messages, now)
      // Intent handling: platform guidance vs tour matching
      const rawIntent = parsed.intent || 'tour_matching'
      const isGuidance = rawIntent === 'platform_guidance' || detectedGuidance
      const hasTourIntent = !isGuidance && (rawIntent === 'tour_matching' || rawIntent === 'mixed' || Object.keys(tourContext).length > 0)
      const waivers = detectWaivers(latestUserMsg)
      const followUps = Array.isArray(parsed.follow_up_questions) ? [...parsed.follow_up_questions] : []

      // Require all 4 core fields for a tour to be complete (BR-004, T035). A field the Agency
      // explicitly waived counts as settled, so the assistant stops asking about it.
      const hasPreference = Boolean(tourContext.craft_preference || (tourContext.experience_types && tourContext.experience_types.length > 0))
      const hasOrigin = Boolean(tourContext.origin_or_route?.origin_address)
      const hasGroupSize = tourContext.group_size !== undefined && tourContext.group_size > 0
      const hasDate = Boolean(tourContext.target_date_or_range?.start_date)

      if (!isGuidance && (!hasPreference || !hasOrigin || !hasGroupSize || !hasDate)) {
        if (!hasGroupSize && !followUps.some(q => /số lượng khách|group size|pax|khách/i.test(q))) {
          followUps.push(isVi ? 'Quý khách vui lòng cho biết số lượng khách dự kiến tham gia đoàn?' : 'Could you please specify your expected group size?')
        }
        if (!hasDate && !waivers.date && !followUps.some(q => /ngày|date|khi nào/i.test(q))) {
          followUps.push(isVi ? 'Đoàn dự kiến khởi hành vào ngày nào (ví dụ: 25/11 hoặc Thứ Năm tuần tới)?' : 'What is your desired date or date range for the tour?')
        }
        if (!hasOrigin && !waivers.origin && !followUps.some(q => /xuất phát|điểm đón|origin|from/i.test(q))) {
          followUps.push(isVi ? 'Đoàn sẽ xuất phát từ khu vực nào tại Hà Nội (ví dụ: từ Hoàn Kiếm, phố cổ)?' : 'Where will the group start from (for example "from Hoàn Kiếm")?')
        }
        if (!hasPreference && !waivers.craft && !followUps.some(q => /nghề|craft|trải nghiệm|thủ công/i.test(q))) {
          followUps.push(isVi ? 'Đoàn quan tâm đến loại trải nghiệm làng nghề nào (ví dụ: gốm Bát Tràng, lụa Vạn Phúc, mộc Chàng Sơn, mây tre Phú Vinh)?' : 'Which craft or type of experience are you looking for (for example pottery, silk weaving, woodcarving)?')
        }
      }

      const finalContext = isGuidance ? (tourContext.craft_preference ? { craft_preference: tourContext.craft_preference } : {}) : tourContext
      // If user has all 4 core fields, mark complete and match right away, but STILL keep follow-up questions to refine!
      const isComplete = Boolean(!isGuidance && hasGroupSize && (hasDate || waivers.date) && (hasOrigin || waivers.origin) && (hasPreference || waivers.craft))

      return {
        intent: isGuidance ? 'platform_guidance' : (hasTourIntent ? 'tour_matching' : 'platform_guidance'),
        conversational_reply: this.resolveReply(parsed.conversational_reply, previousAssistantReplies, finalContext, waivers, isVi),
        tour_context: finalContext,
        is_complete: isComplete,
        follow_up_questions: followUps,
        quota_status: quotaStatus,
        usedLlm: true,
        modelUsed: aiResponse.modelUsed,
      }
    }

    // JSON parse failed but we have a plain-text reply from the LLM — use it directly
    // rather than falling back to AI failure.
    if (aiResponse.text && aiResponse.text.trim().length > 5) {
      console.warn('[AIT] Using plain-text LLM response as conversational_reply (non-JSON fallback).')
      const isVi = isVietnameseText(latestUserMsg)
      const waivers = detectWaivers(latestUserMsg)
      const tourContext = detectedGuidance ? {} : this.mapExtractedToTourContext({}, messages, now)
      const isComplete = Boolean(!detectedGuidance && tourContext.group_size && (tourContext.target_date_or_range || waivers.date))
      return {
        intent: detectedGuidance ? 'platform_guidance' : 'tour_matching',
        conversational_reply: this.resolveReply(aiResponse.text, previousAssistantReplies, tourContext, waivers, isVi),
        tour_context: tourContext,
        is_complete: isComplete,
        follow_up_questions: [],
        quota_status: quotaStatus,
        usedLlm: true,
        modelUsed: aiResponse.modelUsed,
      }
    }

    return this.fallbackAnalysis(messages, quotaStatus, now)
  }

  /**
   * Calls the primary model. When it recycles an earlier assistant answer instead of answering the
   * newest message, retries once with the free fallback model and an explicit anti-repetition
   * instruction (rule 12). Returns the best response available.
   */
  private static async generateReply(
    cfMessages: CloudflareChatMessage[],
    knowledge: KnowledgeItem[] | undefined,
    previousAssistantReplies: string[]
  ): Promise<Awaited<ReturnType<CloudflareAiClient['runChat']>>> {
    const first = await this.client.runChat(cfMessages)
    if (!first.success || !first.text) return first

    const firstReply = this.extractReplyText(first.text)
    if (!firstReply || !isRepeatedReply(firstReply, previousAssistantReplies)) return first

    console.warn('[AIT] The model repeated an earlier answer. Retrying once with the fallback model and an anti-repetition instruction.')
    const retry = await this.client.runChat(
      [{ role: 'system', content: buildSystemPrompt(knowledge, { antiRepetition: true }) }, ...cfMessages.slice(1)],
      { model: this.client.fallbackModel }
    )
    if (!retry.success || !retry.text) return first

    const retryReply = this.extractReplyText(retry.text)
    if (retryReply && !isRepeatedReply(retryReply, previousAssistantReplies)) return retry
    return retry
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
    const origin = tourContext.origin_or_route?.origin_address

    const acknowledged: string[] = []
    if (group) acknowledged.push(isVi ? `đoàn khoảng ${group} khách` : `a group of about ${group} guests`)
    if (craft) acknowledged.push(isVi ? `trải nghiệm ${craft}` : `a ${craft} experience`)
    if (date) acknowledged.push(isVi ? `ngày ${date}` : `the date ${date}`)
    if (origin) acknowledged.push(isVi ? `xuất phát từ ${origin}` : `starting from ${origin}`)

    const waived: string[] = []
    if (waivers.budget) waived.push(isVi ? 'ngân sách' : 'budget')
    if (waivers.date) waived.push(isVi ? 'thời gian' : 'timing')
    if (waivers.origin) waived.push(isVi ? 'điểm xuất phát' : 'the starting point')
    if (waivers.craft) waived.push(isVi ? 'loại nghề' : 'the craft type')

    const missing: string[] = []
    if (!group) missing.push(isVi ? 'số lượng khách dự kiến' : 'the expected group size')
    if (!craft && !waivers.craft) missing.push(isVi ? 'loại trải nghiệm làng nghề mong muốn' : 'the craft experience you want')
    if (!origin && !waivers.origin) missing.push(isVi ? 'khu vực xuất phát của đoàn' : 'where the group starts from')
    if (!date && !waivers.date) missing.push(isVi ? 'ngày dự kiến khởi hành' : 'the intended departure date')

    const sentences: string[] = []
    sentences.push(acknowledged.length > 0
      ? (isVi ? `Tôi đã ghi nhận ${acknowledged.join(', ')}.` : `I have noted ${acknowledged.join(', ')}.`)
      : (isVi ? 'Tôi đã ghi nhận yêu cầu mới nhất của đoàn.' : 'I have noted your latest request.'))
    // Name the whole craft family rather than one village, so a bare "silk"/"lụa" input is not narrowed
    // to Vạn Phúc alone (rule 15).
    const craftOptions = craft ? ConversationalAiService.craftFamilyOptions(craft, isVi) : null
    if (craftOptions) sentences.push(craftOptions)
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

    if (extracted?.budget_per_person && typeof extracted.budget_per_person === 'number' && extracted.budget_per_person > 0) {
      context.budget = { max_per_person: extracted.budget_per_person, currency: 'VND' }
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

    // The model may echo a village it suggested as the group's origin (e.g. "Vạn Phúc" right after
    // proposing it). Accept an origin only when the user actually wrote it; otherwise fall back to the
    // text scan so the assistant never treats its own suggestion as the starting point.
    if (extracted?.origin && isOriginGroundedInUserText(String(extracted.origin), fullText)) {
      context.origin_or_route = { origin_address: String(extracted.origin) }
    } else {
      for (const m of [...relevantMsgs].reverse()) {
        const text = m.text || ''
        const originMatch = text.match(/(?:from|near|xuất phát từ|tại khu vực|ở|khu vực)\s+(.+?)(?=\s+(?:under|on|with|for|budget|looking|and|to|in|at|vào ngày|ngày)\s|[,.;!?]|$)/iu)
        if (originMatch) {
          context.origin_or_route = { origin_address: originMatch[1].trim() }
          break
        }
        const mLoc = text.match(/(hoàn kiếm|old quarter|ba đình|tây hồ|hà đông|sóc sơn|đông anh|thạch thất|hoài đức|gia lâm|thanh oai|thường tín|chương mỹ|hà nội)/i)
        if (mLoc) {
          context.origin_or_route = { origin_address: mLoc[1] }
          break
        }
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
      /(?:nh[oó]m|group\s+of?|for)\s*(\d+)|(\d+)\s*(?:French|international|foreign|guests?|pax|people|tourists?|passengers?|kh[aá]ch|ng[uư][oờ]i)/i
    )
    if (!match) return undefined
    const value = parseInt(match[1] || match[2], 10)
    return Number.isFinite(value) && value > 0 ? value : undefined
  }

  /**
   * A short broadening suggestion naming the verified workshops of a craft family. Used when the Agency
   * names only a craft, so the assistant does not fixate on a single village (rule 15, BR-003).
   */
  private static craftFamilyOptions(craft: string, isVi: boolean): string | null {
    const options: Record<string, string> = {
      silk: isVi
        ? 'Về dệt lụa, đoàn có thể cân nhắc làng lụa Vạn Phúc (dệt lụa, ươm tơ) và xưởng thêu tay Quất Động — cùng nhóm nghề dệt – may.'
        : 'For silk weaving you can consider Vạn Phúc silk village and the Quất Động embroidery workshop — both in the Silk/Textile family.',
      embroidery: isVi
        ? 'Về thêu tay, đoàn có thể cân nhắc xưởng thêu Quất Động và làng lụa Vạn Phúc — cùng nhóm nghề dệt – may.'
        : 'For embroidery you can consider the Quất Động embroidery workshop and Vạn Phúc silk village — both in the Silk/Textile family.',
      pottery: isVi
        ? 'Về gốm, đoàn có thể cân nhắc xưởng gốm sứ Bát Tràng.'
        : 'For pottery you can consider the Bát Tràng ceramics workshop.',
      bamboo: isVi
        ? 'Về mây tre đan, đoàn có thể cân nhắc xưởng thủ công Phú Vinh.'
        : 'For bamboo and rattan weaving you can consider the Phú Vinh workshop.',
      'conical hat': isVi
        ? 'Về nón lá, đoàn có thể cân nhắc xưởng nón lá Chuông.'
        : 'For conical hats you can consider the Chuông workshop.',
    }
    return options[craft.toLowerCase()] ?? null
  }

  /**
   * Fallback rule-based analysis (used when quota is in cooldown, offline, or API error).
   */
  static fallbackAnalysis(
    messages: Array<{ sender?: string; text: string }>,
    quotaStatus: QuotaStatus,
    now: () => Date
  ): ConversationalAiResult {
    const latestUserMsg = [...messages].reverse().find(m => m.sender?.toLowerCase() !== 'assistant')?.text || ''
    const isVi = isVietnameseText(latestUserMsg)
    // A field the Agency explicitly left open is settled, not missing (rule 13). Reading the waiver
    // here keeps the rule-based fallback from re-asking the same fixed questions every turn.
    const waivers = detectWaivers(latestUserMsg)

    // Check if this is a greeting
    const isGreeting = /^(?:xin chào|chào bạn|chào|hello|hi|hey|alo|good morning|good afternoon)[\s!.]*$/i.test(latestUserMsg.trim())
    if (isGreeting) {
      return {
        intent: 'platform_guidance',
        conversational_reply: isVi
          ? 'Xin chào! Tôi là trợ lý AI của Hanoi Artisan Bridge. Tôi có thể giúp gì cho bạn hôm nay? Bạn có thể yêu cầu ghép tour cho đoàn khách hoặc hỏi về thông tin các làng nghề truyền thống Hà Nội.'
          : 'Hello! I am the Hanoi Artisan Bridge AI Assistant. How can I help you today? You can request a tour match for your group or ask about traditional Hanoi craft villages.',
        tour_context: {},
        is_complete: false,
        follow_up_questions: [],
        quota_status: quotaStatus,
        usedLlm: false,
      }
    }

    // Check if this is a platform guidance question (interrogative FAQ rather than tour search)
    const knowledgeMatches = queryKnowledgeBase(latestUserMsg)
    const isExplicitTourAction = /(?:tìm|muốn|cần|tổ chức|book|đặt|find|want|need|organize|looking for)\s+(?:tour|xưởng|chỗ|trải nghiệm)/i.test(latestUserMsg)
    const isFitScoreQuestion = /(?:thang điểm|công thức|tính điểm|fit score|scoring|weights)/i.test(latestUserMsg)
    const isContactQuestion = /(?:liên hệ|nhắn tin|báo giá|chat|contact|how to contact|request quote)/i.test(latestUserMsg)
    const isVillagesQuestion = /(?:những làng nghề nào|làng nghề nào được hỗ trợ|danh sách làng nghề|verified craft villages)/i.test(latestUserMsg)
    const isPlatformQuestion = (isFitScoreQuestion || isContactQuestion || isVillagesQuestion) && !isExplicitTourAction

    if (isPlatformQuestion && knowledgeMatches.length > 0) {
      const best = knowledgeMatches.find(k =>
        isFitScoreQuestion ? k.id === 'fit_score_calculation' :
        isContactQuestion ? k.id === 'contact_and_booking' :
        k.id === 'verified_craft_villages'
      ) || knowledgeMatches[0]
      const craft = detectCraftPreference(latestUserMsg)
      return {
        intent: 'platform_guidance',
        conversational_reply: isVi ? `${best.contentVi}` : `${best.contentEn}`,
        tour_context: craft ? { craft_preference: craft } : {},
        is_complete: false,
        follow_up_questions: [],
        quota_status: quotaStatus,
        usedLlm: false,
      }
    }

    // Otherwise, perform structured requirement extraction from conversation history
    // scanning from newest to oldest so latest changes take precedence.
    // Only user messages are read: the assistant's own prose must never be re-extracted as a
    // requirement (mapExtractedToTourContext filters the same way).
    const userMessages = messages.filter(m => m.sender?.toLowerCase() !== 'assistant')
    const extractionMessages = userMessages.length > 0 ? userMessages : messages

    const tourContext: TourContext = {}
    let craftPref: string | undefined = undefined

    for (const m of [...extractionMessages].reverse()) {
      const text = m.text || ''

      if (!craftPref) {
        const craft = detectCraftPreference(text)
        if (craft) craftPref = craft
      }

      if (tourContext.group_size === undefined) {
        const detected = ConversationalAiService.parseGroupSize(text)
        if (detected !== undefined) tourContext.group_size = detected
      }

      if (!tourContext.target_date_or_range) {
        const startDate = extractTourDate(text, now())
        if (startDate) {
          tourContext.target_date_or_range = { start_date: startDate }
        }
      }

      if (!tourContext.budget && !waivers.budget) {
        // Supports accented (ngân sách, dưới, tầm, khoảng) and unaccented (ngan sach, duoi, tam, khoang)
        // Vietnamese, and rejects a number that is really a group size ("tầm 15 khách") rather than a budget.
        const budgetMatch = text.match(
          /(?:budget|ng[aâ]n\s*s[aá]ch|ngan\s*sach|d[uư][oờ]i|dưới|under|around|tight\s*budget|t[aầ]m|kho[aả]ng)\s*(\d+(?:[.,]\d{3})*)(?![\d.,])(?!\s*(?:kh[aá]ch|ng[uư][oờ]i|pax|guests?|people|tourists?|passengers?))\s*(?:k|[.,]\d{3}|\.000|000)?\s*(?:vnd|đ|\/người|\/khách|\/nguoi|\/khach|\/pax)?|(\d+)[,.]000\s*(?:vnd|đ)/i
        )
        if (budgetMatch) {
          let rawStr = (budgetMatch[1] || budgetMatch[2] || '').trim()
          let cleanDigits = rawStr.replace(/[.,]/g, '')
          let amount = parseInt(cleanDigits, 10)
          if (amount < 1000) amount *= 1000
          tourContext.budget = { max_per_person: amount, currency: 'VND' }
        }
      }

      const types = detectExperienceTypes(text)
      if (types.length > 0 && !tourContext.experience_types?.length) {
        tourContext.experience_types = types
      }

      if (!tourContext.origin_or_route) {
        // Supports accented (xuất phát từ) and unaccented (xuat phat tu, tu trung tam).
        const originMatch = text.match(/(?:from|near|xu[aấ]t\s*ph[aá]t\s*t[uừ]|xuat\s*phat\s*tu)\s+(.+?)(?=\s+(?:under|on|with|for|budget|looking|and|to|in|at)\s|[,.;!?]|$)/iu)
        if (originMatch) {
          tourContext.origin_or_route = { origin_address: originMatch[1].trim() }
        } else if (/(?:hoàn kiếm|old quarter|ba đình|tây hồ|hà đông|hà nội|hoan kiem|ba dinh|tay ho|ha dong|ha noi)/i.test(text)) {
          const mLoc = text.match(/(hoàn kiếm|old quarter|ba đình|tây hồ|hà đông|hà nội|hoan kiem|ba dinh|tay ho|ha dong|ha noi)/i)
          if (mLoc) tourContext.origin_or_route = { origin_address: mLoc[1] }
        }
      }
    }

    if (craftPref) tourContext.craft_preference = craftPref

    const hasGroupSize = tourContext.group_size !== undefined && tourContext.group_size > 0
    const hasDate = Boolean(tourContext.target_date_or_range)
    const hasOrigin = Boolean(tourContext.origin_or_route)
    const hasCraft = Boolean(tourContext.craft_preference || tourContext.experience_types?.length)

    const followUps: string[] = []
    if (!hasGroupSize) {
      followUps.push(
        isVi
          ? 'Quý khách vui lòng cho biết số lượng khách dự kiến tham gia đoàn?'
          : 'Could you please specify your expected group size or number of guests/pax?'
      )
    }
    if (!hasDate && !waivers.date) {
      followUps.push(
        isVi
          ? 'Đoàn dự kiến khởi hành vào ngày nào (date, ví dụ: 25/11 hoặc Thứ Năm tuần tới)?'
          : 'What is your desired date or date range for the tour?'
      )
    }
    if (!hasOrigin && !waivers.origin) {
      followUps.push(
        isVi
          ? 'Đoàn sẽ xuất phát từ khu vực nào tại Hà Nội (ví dụ: từ Hoàn Kiếm)?'
          : 'Where will the group start from (for example "from Hoàn Kiếm")?'
      )
    }
    if (!hasCraft && !waivers.craft) {
      followUps.push(
        isVi
          ? 'Đoàn quan tâm đến loại craft / experience nào (ví dụ: làm gốm Bát Tràng, dệt lụa Vạn Phúc)?'
          : 'Which craft or type of experience are you looking for (for example silk weaving, pottery or a hands-on workshop)?'
      )
    }

    const isComplete = hasGroupSize && (hasDate || waivers.date) && (hasOrigin || waivers.origin) && (hasCraft || waivers.craft)
    let conversationalReply = ''
    if (craftPref === 'woodcarving' || /(?:làng mộc|chàng sơn|sơn đồng)/i.test(latestUserMsg)) {
      conversationalReply = isVi
        ? 'Làng mộc Chàng Sơn (Thạch Thất) và Sơn Đồng (Hoài Đức) nổi tiếng với nghệ thuật chạm khắc gỗ cổ truyền, làm quạt và tạc tượng dân gian. Các nghệ nhân có thể tổ chức workshop thực hành chạm khắc hoa văn nhỏ cho đoàn.'
        : 'Chang Son and Son Dong traditional woodcarving villages are renowned for timber architecture, folk statue carving, and traditional fans.'
    } else if (/(?:sóc sơn|ngoài trời|teambuilding|team building)/i.test(latestUserMsg)) {
      conversationalReply = isVi
        ? 'Hanoi Artisan Bridge chuyên về du lịch văn hóa làng nghề truyền thống Hà Nội. Gần khu vực Sóc Sơn, chúng tôi có Làng múa rối nước Đào Thục (Đông Anh, cách khoảng 20-25 phút) với không gian thủy đình ngoài trời biểu diễn và thi đấu tiểu phẩm rối nước rất thích hợp cho teambuilding tập thể, cùng với các workshop gốm Bát Tràng và mộc Chàng Sơn.'
        : 'Hanoi Artisan Bridge focuses on traditional Hanoi craft villages. Near Soc Son, Dao Thuc water puppetry village (~20 mins) features open-air puppet pavilion activities ideal for group cohesion.'
    } else {
      // Build the reply from what this turn actually contains, so two different inputs never get the
      // same canned sentence (rules 12 and 13).
      conversationalReply = ConversationalAiService.contextualReply(tourContext, waivers, isVi)
    }

    if (quotaStatus.inCooldown) {
      const cooldownNote = isVi
        ? '\n\n[Lưu ý: Hệ thống đang vận hành ở chế độ dự phòng bảo vệ hạn ngạch 24h].'
        : '\n\n[Note: Running in resilient rule-based matching mode under 24h quota cooldown].'
      conversationalReply += cooldownNote
    }

    return {
      intent: 'tour_matching',
      conversational_reply: conversationalReply,
      tour_context: tourContext,
      is_complete: isComplete,
      follow_up_questions: followUps,
      quota_status: quotaStatus,
      usedLlm: false,
    }
  }
}
