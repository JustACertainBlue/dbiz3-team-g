import { CloudflareAiClient, type CloudflareChatMessage } from './cloudflare-client'
import { QuotaManager, type QuotaStatus } from './quota-manager'
import { buildSystemPrompt, detectPromptInjection } from './prompt-templates'
import { queryKnowledgeBase } from './knowledge-base'
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

export class ConversationalAiService {
  private static client: CloudflareAiClient = new CloudflareAiClient()

  /**
   * Processes a multi-turn conversation using Cloudflare Workers AI with persistent quota protection.
   */
  static async processConversation(
    messages: Array<{ sender?: string; text: string; sent_at?: string }>,
    options?: { now?: () => Date }
  ): Promise<ConversationalAiResult> {
    const latestUserMsg = [...messages].reverse().find(m => m.sender?.toLowerCase() !== 'assistant')?.text || ''
    const now = options?.now ?? systemClock

    // 1. Check persistent 24-hour quota cooldown
    const quotaStatus = await QuotaManager.checkCooldown()

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

    // 3. If in 24-hour cooldown or Cloudflare is not configured: use intelligent rule-based fallback
    if (quotaStatus.inCooldown || !this.client.isConfigured()) {
      return this.fallbackAnalysis(messages, quotaStatus, now)
    }

    // 4. Retrieve matching knowledge items for context grounding
    const relevantKnowledge = queryKnowledgeBase(latestUserMsg)
    const systemPrompt = buildSystemPrompt(relevantKnowledge.length > 0 ? relevantKnowledge : undefined)

    // Format messages for Cloudflare Workers AI
    const cfMessages: CloudflareChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-6).map(m => ({
        role: (m.sender?.toLowerCase() === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.text,
      })),
    ]

    // 5. Call Cloudflare Workers AI (@cf/zai-org/glm-4.7-flash)
    const aiResponse = await this.client.runChat(cfMessages)

    // 6. Handle confirmed Quota Exhaustion
    if (!aiResponse.success && aiResponse.isQuotaExhausted) {
      console.warn('Daily 10,000 Neurons free quota exhausted. Activating 24-hour protective cooldown.')
      const updatedCooldown = await QuotaManager.recordQuotaExhaustion(
        aiResponse.error || 'Daily free 10,000 Neurons quota exhausted',
        aiResponse.modelUsed
      )
      return this.fallbackAnalysis(messages, updatedCooldown, now)
    }

    // 7. Handle network or server errors by gracefully falling back
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
      const tourContext = this.mapExtractedToTourContext(parsed.extracted_context, messages, now)
      // Intent handling: platform guidance vs tour matching
      const rawIntent = parsed.intent || 'tour_matching'
      const isGuidance = rawIntent === 'platform_guidance' || detectedGuidance
      const hasTourIntent = !isGuidance && (rawIntent === 'tour_matching' || rawIntent === 'mixed' || Object.keys(tourContext).length > 0)
      const isComplete = Boolean(
        !isGuidance &&
        (parsed.is_tour_complete || (tourContext.group_size && tourContext.target_date_or_range)) &&
        tourContext.group_size && tourContext.target_date_or_range
      )
      const followUps = Array.isArray(parsed.follow_up_questions) ? [...parsed.follow_up_questions] : []

      // If incomplete tour matching has no follow-up questions from LLM, generate friendly questions
      if (!isGuidance && !isComplete && followUps.length === 0) {
        const isVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(latestUserMsg) || true
        if (tourContext.group_size === undefined) {
          followUps.push(isVi ? 'Quý khách vui lòng cho biết số lượng khách dự kiến tham gia đoàn?' : 'Could you please specify your expected group size?')
        }
        if (!tourContext.target_date_or_range) {
          followUps.push(isVi ? 'Đoàn dự kiến khởi hành vào ngày nào (ví dụ: 25/11 hoặc Thứ Năm tuần tới)?' : 'What is your desired date or date range for the tour?')
        }
        if (!tourContext.craft_preference && !tourContext.experience_types?.length) {
          followUps.push(isVi ? 'Đoàn quan tâm đến loại trải nghiệm thủ công nào (ví dụ: gốm Bát Tràng, lụa Vạn Phúc)?' : 'Which craft or type of experience are you looking for?')
        }
      }

      return {
        intent: isGuidance ? 'platform_guidance' : (hasTourIntent ? 'tour_matching' : 'platform_guidance'),
        conversational_reply: parsed.conversational_reply || (isGuidance && relevantKnowledge.length > 0 ? relevantKnowledge[0].contentVi : ''),
        tour_context: isGuidance ? {} : tourContext,
        is_complete: isComplete,
        follow_up_questions: isGuidance ? [] : followUps,
        quota_status: quotaStatus,
        usedLlm: true,
        modelUsed: aiResponse.modelUsed,
      }
    }

    // JSON parse failed but we have a plain-text reply from the LLM — use it directly
    // rather than falling back to AI failure.
    if (aiResponse.text && aiResponse.text.trim().length > 5) {
      console.warn('[AIT] Using plain-text LLM response as conversational_reply (non-JSON fallback).')
      const tourContext = detectedGuidance ? {} : this.mapExtractedToTourContext({}, messages, now)
      const isComplete = Boolean(!detectedGuidance && tourContext.group_size && tourContext.target_date_or_range)
      return {
        intent: detectedGuidance ? 'platform_guidance' : 'tour_matching',
        conversational_reply: aiResponse.text.trim(),
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
    messages: Array<{ text: string }>,
    now: () => Date
  ): TourContext {
    const context: TourContext = {}
    const fullText = messages.map(m => m.text).join(' ')

    if (extracted?.group_size && typeof extracted.group_size === 'number' && extracted.group_size > 0) {
      context.group_size = extracted.group_size
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

    const detectedCraft = detectCraftPreference(fullText)
    if (detectedCraft) {
      context.craft_preference = detectedCraft
    } else if (extracted?.craft_preference) {
      context.craft_preference = String(extracted.craft_preference)
    }

    const detectedTypes = detectExperienceTypes(fullText)
    if (detectedTypes.length > 0) {
      context.experience_types = detectedTypes
    } else if (Array.isArray(extracted?.experience_types) && extracted.experience_types.length > 0) {
      context.experience_types = extracted.experience_types
    }

    if (extracted?.origin) {
      context.origin_or_route = { origin_address: String(extracted.origin) }
    }

    return context
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
    const isVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(latestUserMsg)

    // Check if this is a platform guidance question (interrogative FAQ rather than tour search)
    const knowledgeMatches = queryKnowledgeBase(latestUserMsg)
    const hasFaqIndicators = /(?:như thế nào|là gì|làm sao|cách nào|thế nào|giải thích|hướng dẫn|thang điểm|công thức|how |what is|how to|explain|tell me about)/i.test(latestUserMsg)
    const isExplicitTourAction = /(?:tìm|muốn|cần|đoàn|khách|pax|ngày|tổ chức|book|đặt|find|want|need|organize|looking for)/i.test(latestUserMsg)
    const isPlatformQuestion = knowledgeMatches.length > 0 && hasFaqIndicators && !isExplicitTourAction

    if (isPlatformQuestion) {
      const best = knowledgeMatches[0]
      return {
        intent: 'platform_guidance',
        conversational_reply: isVi ? `${best.contentVi}` : `${best.contentEn}`,
        tour_context: {},
        is_complete: false,
        follow_up_questions: [],
        quota_status: quotaStatus,
        usedLlm: false,
      }
    }

    // Otherwise, perform structured requirement extraction from conversation history
    const tourContext: TourContext = {}
    let craftPref: string | undefined = undefined

    for (const m of messages) {
      const text = m.text || ''

      const groupMatch = text.match(
        /(?:group of|for)\s*(\d+)|\b(\d+)\s*(?:French|international|foreign|guests?|pax|people|tourists?|passengers?|kh\u00e1ch|ng\u01b0\u1eddi)/i
      )
      if (groupMatch) {
        tourContext.group_size = parseInt(groupMatch[1] || groupMatch[2], 10)
      }

      const startDate = extractTourDate(text, now())
      if (startDate) {
        tourContext.target_date_or_range = { start_date: startDate }
      }

      const budgetMatch = text.match(
        /(?:budget|ngân sách|dưới|under|around|tight budget|tầm|khoảng)\s*(\d+(?:[.,]\d{3})*|\d+)\s*(?:k|,\d{3}|\.000|000)?\s*(?:vnd|đ|\/người|\/khách|\/pax)?|(\d+)[,.]000\s*(?:vnd|đ)/i
      )
      if (budgetMatch) {
        let rawStr = (budgetMatch[1] || budgetMatch[2] || '').trim()
        let cleanDigits = rawStr.replace(/[.,]/g, '')
        let amount = parseInt(cleanDigits, 10)
        if (amount < 1000) amount *= 1000
        tourContext.budget = { max_per_person: amount, currency: 'VND' }
      }

      const craft = detectCraftPreference(text)
      if (craft) craftPref = craft
      const types = detectExperienceTypes(text)
      if (types.length > 0) tourContext.experience_types = types

      const originMatch = text.match(/(?:from|near|xuất phát từ)\s+(.+?)(?=\s+(?:under|on|with|for|budget|looking|and|to|in|at)\s|[,.;!?]|$)/iu)
      if (originMatch) {
        tourContext.origin_or_route = { origin_address: originMatch[1].trim() }
      } else if (/(?:hoàn kiếm|old quarter|ba đình|tây hồ|hà đông|hà nội)/i.test(text)) {
        const mLoc = text.match(/(hoàn kiếm|old quarter|ba đình|tây hồ|hà đông|hà nội)/i)
        if (mLoc) tourContext.origin_or_route = { origin_address: mLoc[1] }
      }
    }

    if (craftPref) tourContext.craft_preference = craftPref

    const followUps: string[] = []
    if (tourContext.group_size === undefined) {
      followUps.push(
        isVi
          ? 'Quý khách vui lòng cho biết số lượng khách dự kiến tham gia đoàn?'
          : 'Could you please specify your expected group size or number of guests/pax?'
      )
    }
    if (!tourContext.target_date_or_range) {
      followUps.push(
        isVi
          ? 'Đoàn dự kiến khởi hành vào ngày nào (date, ví dụ: 25/11 hoặc Thứ Năm tuần tới)?'
          : 'What is your desired date or date range for the tour?'
      )
    }
    if (!tourContext.origin_or_route) {
      followUps.push(
        isVi
          ? 'Đoàn sẽ xuất phát từ khu vực nào tại Hà Nội (ví dụ: từ Hoàn Kiếm)?'
          : 'Where will the group start from (for example "from Hoàn Kiếm")?'
      )
    }
    if (!tourContext.craft_preference && !tourContext.experience_types?.length) {
      followUps.push(
        isVi
          ? 'Đoàn quan tâm đến loại craft / experience nào (ví dụ: làm gốm Bát Tràng, dệt lụa Vạn Phúc)?'
          : 'Which craft or type of experience are you looking for (for example silk weaving, pottery or a hands-on workshop)?'
      )
    }

    const isComplete = followUps.length === 0
    let conversationalReply = ''
    if (isComplete) {
      conversationalReply = isVi
        ? 'Tôi đã ghi nhận đầy đủ các yêu cầu cốt lõi của đoàn. Đang tiến hành đối soát và xếp hạng các xưởng nghề phù hợp nhất...'
        : 'I have gathered all the key requirements for your tour. Analyzing and ranking the best matching craft workshops now...'
    } else {
      conversationalReply = isVi
        ? 'Tôi cần thêm một vài thông tin để tìm xưởng nghề phù hợp nhất cho đoàn:'
        : 'I need a few more details to find the best craft match for your tour:'
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
