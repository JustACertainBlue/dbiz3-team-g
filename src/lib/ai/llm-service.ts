import { CloudflareAiClient, type CloudflareChatMessage } from './cloudflare-client'
import { QuotaManager, type QuotaStatus } from './quota-manager'
import { buildSystemPrompt, detectPromptInjection, detectUnauthorizedDataProbe } from './prompt-templates'
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
      const isVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(latestUserMsg) || true
      const tourContext = this.mapExtractedToTourContext(parsed.extracted_context, messages, now)
      // Intent handling: platform guidance vs tour matching
      const rawIntent = parsed.intent || 'tour_matching'
      const isGuidance = rawIntent === 'platform_guidance' || detectedGuidance
      const hasTourIntent = !isGuidance && (rawIntent === 'tour_matching' || rawIntent === 'mixed' || Object.keys(tourContext).length > 0)
      const followUps = Array.isArray(parsed.follow_up_questions) ? [...parsed.follow_up_questions] : []

      // Require all 4 core fields for a tour to be complete (BR-004, T035)
      const hasPreference = Boolean(tourContext.craft_preference || (tourContext.experience_types && tourContext.experience_types.length > 0))
      const hasOrigin = Boolean(tourContext.origin_or_route?.origin_address)
      const hasGroupSize = tourContext.group_size !== undefined && tourContext.group_size > 0
      const hasDate = Boolean(tourContext.target_date_or_range?.start_date)

      if (!isGuidance && (!hasPreference || !hasOrigin || !hasGroupSize || !hasDate)) {
        if (!hasGroupSize && !followUps.some(q => /số lượng khách|group size|pax|khách/i.test(q))) {
          followUps.push(isVi ? 'Quý khách vui lòng cho biết số lượng khách dự kiến tham gia đoàn?' : 'Could you please specify your expected group size?')
        }
        if (!hasDate && !followUps.some(q => /ngày|date|khi nào/i.test(q))) {
          followUps.push(isVi ? 'Đoàn dự kiến khởi hành vào ngày nào (ví dụ: 25/11 hoặc Thứ Năm tuần tới)?' : 'What is your desired date or date range for the tour?')
        }
        if (!hasOrigin && !followUps.some(q => /xuất phát|điểm đón|origin|from/i.test(q))) {
          followUps.push(isVi ? 'Đoàn sẽ xuất phát từ khu vực nào tại Hà Nội (ví dụ: từ Hoàn Kiếm, phố cổ)?' : 'Where will the group start from (for example "from Hoàn Kiếm")?')
        }
        if (!hasPreference && !followUps.some(q => /nghề|craft|trải nghiệm|thủ công/i.test(q))) {
          followUps.push(isVi ? 'Đoàn quan tâm đến loại trải nghiệm làng nghề nào (ví dụ: gốm Bát Tràng, lụa Vạn Phúc, mộc Chàng Sơn, mây tre Phú Vinh)?' : 'Which craft or type of experience are you looking for (for example pottery, silk weaving, woodcarving)?')
        }
      }

      // If user has all 4 core fields, mark complete and match right away, but STILL keep follow-up questions to refine!
      const isComplete = Boolean(!isGuidance && hasGroupSize && hasDate && hasOrigin && hasPreference)

      return {
        intent: isGuidance ? 'platform_guidance' : (hasTourIntent ? 'tour_matching' : 'platform_guidance'),
        conversational_reply: sanitizeConversationalReply(parsed.conversational_reply || (isVi ? 'Tôi đã tiếp nhận yêu cầu và đối soát các xưởng nghề phù hợp nhất cho đoàn:' : 'I have analyzed your request and found matching artisan workshops:')),
        tour_context: isGuidance ? (tourContext.craft_preference ? { craft_preference: tourContext.craft_preference } : {}) : tourContext,
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
      const tourContext = detectedGuidance ? {} : this.mapExtractedToTourContext({}, messages, now)
      const isComplete = Boolean(!detectedGuidance && tourContext.group_size && tourContext.target_date_or_range)
      return {
        intent: detectedGuidance ? 'platform_guidance' : 'tour_matching',
        conversational_reply: sanitizeConversationalReply(aiResponse.text.trim()),
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
    messages: Array<{ text: string; sender?: string }>,
    now: () => Date
  ): TourContext {
    const context: TourContext = {}
    const userMessages = messages.filter(m => m.sender?.toLowerCase() !== 'assistant')
    const relevantMsgs = userMessages.length > 0 ? userMessages : messages
    const fullText = relevantMsgs.map(m => m.text).join(' ')

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

    if (extracted?.craft_preference) {
      context.craft_preference = String(extracted.craft_preference)
    } else {
      // Scan messages from newest to oldest so latest craft intent takes precedence!
      const reversed = [...relevantMsgs].reverse()
      for (const m of reversed) {
        const detected = detectCraftPreference(m.text || '')
        if (detected) {
          context.craft_preference = detected
          break
        }
      }
    }

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

    if (extracted?.origin) {
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
   * Fallback rule-based analysis (used when quota is in cooldown, offline, or API error).
   */
  static fallbackAnalysis(
    messages: Array<{ sender?: string; text: string }>,
    quotaStatus: QuotaStatus,
    now: () => Date
  ): ConversationalAiResult {
    const latestUserMsg = [...messages].reverse().find(m => m.sender?.toLowerCase() !== 'assistant')?.text || ''
    const isVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(latestUserMsg)

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
    // scanning from newest to oldest so latest changes take precedence
    const tourContext: TourContext = {}
    let craftPref: string | undefined = undefined

    for (const m of [...messages].reverse()) {
      const text = m.text || ''

      if (!craftPref) {
        const craft = detectCraftPreference(text)
        if (craft) craftPref = craft
      }

      if (tourContext.group_size === undefined) {
        const groupMatch = text.match(
          /(?:group of|for)\s*(\d+)|\b(\d+)\s*(?:French|international|foreign|guests?|pax|people|tourists?|passengers?|kh\u00e1ch|ng\u01b0\u1eddi)/i
        )
        if (groupMatch) {
          tourContext.group_size = parseInt(groupMatch[1] || groupMatch[2], 10)
        }
      }

      if (!tourContext.target_date_or_range) {
        const startDate = extractTourDate(text, now())
        if (startDate) {
          tourContext.target_date_or_range = { start_date: startDate }
        }
      }

      if (!tourContext.budget) {
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
      }

      const types = detectExperienceTypes(text)
      if (types.length > 0 && !tourContext.experience_types?.length) {
        tourContext.experience_types = types
      }

      if (!tourContext.origin_or_route) {
        const originMatch = text.match(/(?:from|near|xuất phát từ)\s+(.+?)(?=\s+(?:under|on|with|for|budget|looking|and|to|in|at)\s|[,.;!?]|$)/iu)
        if (originMatch) {
          tourContext.origin_or_route = { origin_address: originMatch[1].trim() }
        } else if (/(?:hoàn kiếm|old quarter|ba đình|tây hồ|hà đông|hà nội)/i.test(text)) {
          const mLoc = text.match(/(hoàn kiếm|old quarter|ba đình|tây hồ|hà đông|hà nội)/i)
          if (mLoc) tourContext.origin_or_route = { origin_address: mLoc[1] }
        }
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
    if (craftPref === 'woodcarving' || /(?:làng mộc|chàng sơn|sơn đồng)/i.test(latestUserMsg)) {
      conversationalReply = isVi
        ? 'Làng mộc Chàng Sơn (Thạch Thất) và Sơn Đồng (Hoài Đức) nổi tiếng với nghệ thuật chạm khắc gỗ cổ truyền, làm quạt và tạc tượng dân gian. Các nghệ nhân có thể tổ chức workshop thực hành chạm khắc hoa văn nhỏ cho đoàn.'
        : 'Chang Son and Son Dong traditional woodcarving villages are renowned for timber architecture, folk statue carving, and traditional fans.'
    } else if (/(?:sóc sơn|ngoài trời|teambuilding|team building)/i.test(latestUserMsg)) {
      conversationalReply = isVi
        ? 'Hanoi Artisan Bridge chuyên về du lịch văn hóa làng nghề truyền thống Hà Nội. Gần khu vực Sóc Sơn, chúng tôi có Làng múa rối nước Đào Thục (Đông Anh, cách khoảng 20-25 phút) với không gian thủy đình ngoài trời biểu diễn và thi đấu tiểu phẩm rối nước rất thích hợp cho teambuilding tập thể, cùng với các workshop gốm Bát Tràng và mộc Chàng Sơn.'
        : 'Hanoi Artisan Bridge focuses on traditional Hanoi craft villages. Near Soc Son, Dao Thuc water puppetry village (~20 mins) features open-air puppet pavilion activities ideal for group cohesion.'
    } else if (isComplete) {
      conversationalReply = isVi
        ? 'Tôi đã tiếp nhận yêu cầu và đối soát các xưởng nghề phù hợp nhất cho đoàn:'
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
