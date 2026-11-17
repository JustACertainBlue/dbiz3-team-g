import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import {
  addMessage,
  getMatchingSession,
  getMatchingSessionContext,
  getMessages,
  updateMatchingSessionContext,
} from '@/lib/matching/session-service'
import { extractTourContext, buildTourPreferenceProfile } from '@/lib/ai/extractor'
import {
  resolveVillageCards,
  resolveProviderCards,
  resolveActivityCards,
  detectCardScope,
  detectPriceSortPreference,
} from '@/lib/matching/card-resolver'
import { saveAgencyPreferenceProfile } from '@/lib/preferences/preference-service'
import {
  isTestConversation,
  resolveTestVillageCards,
  resolveTestProviderCards,
  resolveTestActivityCards,
} from '@/lib/matching/test-dataset'
import { detectExperienceTypes } from '@/lib/matching/craft-taxonomy'
import { withVillageStartingPrices } from '@/lib/village-starting-price'
import { eligibleVillageStartingPrices } from '@/lib/explore/catalog'
import { loadExploreRuntime } from '@/lib/explore/seed-repository'
import { loadBookings, loadExperiences, loadVillages } from '@/lib/db/seed-loader'
import { loadOperatingHours } from '@/lib/prf/seed-reader'
import { priceSortDirection, runAitMatchingPipeline } from '@/lib/ait/matching-pipeline'
import { sanitizeInput, createRateLimiter } from '@/lib/ait/guard'
import { routeByRules } from '@/lib/ait/router'
import { classifyIntent } from '@/lib/ait/llm-router'
import {
  buildResultsMessage,
  craftLabelVi,
  refusalTemplate,
  resultEndingCandidate,
} from '@/lib/ait/messages'
import { postCheckMessage } from '@/lib/ait/postcheck'
import { turnSchema } from '@/lib/ait/schemas'
import {
  applyConversationState,
  emptyConversationState,
  isAffirmativeReply,
  isBookingHelpRequest,
  isCompleteConversationState,
  isExplicitConversationReset,
  isFalsePositiveMealPhrase,
  isShortPendingReply,
  isSystemHelpRequest,
  mergeConversationState,
  missingQuestions,
  nextPendingQuestion,
  normalizeConversationState,
  normalizePendingQuestion,
  sanitizeUnsupportedFollowUpQuestions,
  splitMixedMealRequest,
} from '@/lib/ait/conversation-state'
import fs from 'fs'
import path from 'path'

const rateLimiter = createRateLimiter({ limit: 20, windowMs: 60000 })

async function outOfScopeResponse(
  sessionId: string,
  storedContext: Record<string, unknown>,
  state: ReturnType<typeof normalizeConversationState>
) {
  const refusalCount = Number(storedContext.out_of_scope_refusal_count) || 0
  const messages = [
    refusalTemplate('out_of_scope').message,
    'Xin lỗi, nội dung này nằm ngoài phạm vi nền tảng nên mình không thể hỗ trợ. Mình vẫn có thể giúp bạn tìm làng nghề hoặc trải nghiệm văn hóa trong dữ liệu. Bạn muốn tiếp tục theo hướng đó không?',
    'Mình xin lỗi, mình không thể tư vấn yêu cầu này vì ngoài phạm vi hỗ trợ. Nếu bạn muốn, mình có thể gợi ý làng nghề, hoạt động văn hóa hoặc ghép tour phù hợp.',
  ]
  const message = messages[refusalCount % messages.length]
  await updateMatchingSessionContext(sessionId, {
    state,
    pending_question: {
      field: 'in_scope_offer',
      text: 'Bạn có muốn xem gợi ý làng nghề hoặc trải nghiệm văn hóa trong dữ liệu không?',
    },
    out_of_scope_refusal_count: refusalCount + 1,
  })
  const turn = {
    turn_type: 'refusal' as const,
    message,
    top_matches: [],
    additional_suggestions: [],
    comparison: null,
    quick_replies: ['Bắt đầu ghép tour', 'Xem các làng nghề'].map((label) => ({ label, patch: {} })),
    follow_up_questions: [],
    relaxation_suggestions: [],
    sources: [],
    used_llm: false,
  }
  return NextResponse.json(
    {
      turn,
      message: { id: 'refused', sender: 'Assistant', text: message, created_at: new Date().toISOString() },
      conversational_reply: message,
    },
    { status: 200 }
  )
}

async function authorize(request: Request, sessionId: string) {
  const actor = await sessionContextFromRequest(request)
  const matchingSession = await getMatchingSession(sessionId)
  if (!actor.authenticated) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const agencyId = actor.agencyId
  if (actor.role !== 'Tour_Agency' || !agencyId || matchingSession?.agency_id !== agencyId) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { agencyId }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const access = await authorize(request, params.id)
    if (access.error) return access.error
    const messages = await getMessages(params.id)
    return NextResponse.json(messages)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const access = await authorize(request, params.id)
    if (access.error) return access.error

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

    const isRetry = body.retry === true
    const rawText = String(body.content ?? body.text ?? '')
    const isE2E = body.content !== undefined

    // 1. Sanitize input
    let cleanText = rawText
    if (!isRetry) {
      const sanitized = sanitizeInput(rawText, 1000)
      if (!sanitized.ok) {
        if (sanitized.reason === 'too_long') {
          return NextResponse.json(
            {
              error: 'Tin nhắn quá dài (tối đa 1.000 ký tự)',
              turn: {
                turn_type: 'refusal',
                message: 'Tin nhắn quá dài (tối đa 1.000 ký tự).',
                top_matches: [],
                additional_suggestions: [],
                comparison: null,
                quick_replies: [],
                follow_up_questions: [],
                relaxation_suggestions: [],
                sources: [],
                used_llm: false,
              },
            },
            { status: 400 }
          )
        }
        return NextResponse.json({ error: 'Nội dung tin nhắn không được để trống' }, { status: 400 })
      }
      cleanText = sanitized.text
    }
    const originalText = cleanText

    // 2. Rate limit (20 req / min / agency)
    const rateCheck = rateLimiter.check(access.agencyId, Date.now())
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfterMs: rateCheck.retryAfterMs,
          turn: {
            turn_type: 'refusal',
            message: 'Bạn đã gửi quá nhiều tin nhắn. Vui lòng đợi trong giây lát.',
            top_matches: [],
            additional_suggestions: [],
            comparison: null,
            quick_replies: [],
            follow_up_questions: [],
            relaxation_suggestions: [],
            sources: [],
            used_llm: false,
          },
        },
        { status: 429 }
      )
    }

    const storedContext = await getMatchingSessionContext(params.id)
    let conversationState = normalizeConversationState(storedContext.state)
    const pendingQuestion = normalizePendingQuestion(storedContext.pending_question)
    const isReset = !isRetry && isExplicitConversationReset(originalText)
    const activePendingQuestion = isReset ? null : pendingQuestion
    const mixedMeal = !isRetry && !isReset
      ? splitMixedMealRequest(originalText)
      : { inScopeText: originalText, hasMealRequest: false }
    const routeText = mixedMeal.hasMealRequest ? mixedMeal.inScopeText : originalText
    const acceptsInScopeOffer = activePendingQuestion?.field === 'in_scope_offer'
      && isAffirmativeReply(originalText)
    const answersPendingQuestion = Boolean(activePendingQuestion && isShortPendingReply(originalText))
    const isHelpQuestion = isSystemHelpRequest(routeText) || isBookingHelpRequest(routeText)
    const bypassClassifier = isRetry || isReset || acceptsInScopeOffer || answersPendingQuestion
      || isHelpQuestion || isFalsePositiveMealPhrase(routeText) || mixedMeal.hasMealRequest

    // 3. Rule-based router and LLM router (A.2, B.3 Layer 1 & 2)
    if (!isRetry) {
      const routeResult = bypassClassifier ? null : routeByRules(routeText)
      if (routeResult?.intent === 'restricted_request') {
        console.info('[AIT Router]', {
          intent: 'restricted_request',
          confidence: 1.0,
          source: 'rules',
          action_path: 'refusal_restricted',
        })
        const tpl = refusalTemplate('restricted')
        const turn = {
          turn_type: 'refusal' as const,
          message: tpl.message,
          top_matches: [],
          additional_suggestions: [],
          comparison: null,
          quick_replies: tpl.quick_replies.map((label) => ({ label, patch: {} })),
          follow_up_questions: [],
          relaxation_suggestions: [],
          sources: [],
          used_llm: false,
        }
        return NextResponse.json(
          {
            turn,
            message: { id: 'refused', sender: 'Assistant', text: tpl.message, created_at: new Date().toISOString() },
            conversational_reply: tpl.message,
          },
          { status: 200 }
        )
      }

      if (routeResult?.intent === 'out_of_scope') {
        console.info('[AIT Router]', {
          intent: 'out_of_scope',
          confidence: 1.0,
          source: 'rules',
          action_path: 'refusal_out_of_scope',
        })
        return outOfScopeResponse(params.id, storedContext, conversationState)
      }

      // LLM router fallback when rule-based router returns null
      const llmClassification = bypassClassifier
        ? null
        : await classifyIntent(routeText, { hasProfile: false, hasResults: false })

      if (llmClassification) {
        if (llmClassification.intent === 'restricted_request') {
          console.info('[AIT Router]', {
            intent: 'restricted_request',
            confidence: llmClassification.confidence,
            source: llmClassification.source,
            action_path: 'refusal_restricted',
          })
          const tpl = refusalTemplate('restricted')
          const turn = {
            turn_type: 'refusal' as const,
            message: tpl.message,
            top_matches: [],
            additional_suggestions: [],
            comparison: null,
            quick_replies: tpl.quick_replies.map((label) => ({ label, patch: {} })),
            follow_up_questions: [],
            relaxation_suggestions: [],
            sources: [],
            used_llm: false,
          }
          return NextResponse.json(
            {
              turn,
              message: { id: 'refused', sender: 'Assistant', text: tpl.message, created_at: new Date().toISOString() },
              conversational_reply: tpl.message,
            },
            { status: 200 }
          )
        }

        if (llmClassification.intent === 'out_of_scope') {
          console.info('[AIT Router]', {
            intent: 'out_of_scope',
            confidence: llmClassification.confidence,
            source: llmClassification.source,
            action_path: 'refusal_out_of_scope',
          })
          return outOfScopeResponse(params.id, storedContext, conversationState)
        }

        if (llmClassification.intent === 'unclear') {
          console.info('[AIT Router]', {
            intent: 'unclear',
            confidence: llmClassification.confidence,
            source: llmClassification.source,
            action_path: 'clarify',
          })
          const clarifyMsg = 'Bạn có thể nói rõ hơn yêu cầu cho chuyến đi không?'
          const turn = {
            turn_type: 'clarify' as const,
            message: clarifyMsg,
            top_matches: [],
            additional_suggestions: [],
            comparison: null,
            quick_replies: [
              { label: 'Đi trong ngày', patch: {} },
              { label: 'Workshop làm gốm', patch: {} },
            ],
            follow_up_questions: [],
            relaxation_suggestions: [],
            sources: [],
            used_llm: false,
          }
          return NextResponse.json(
            {
              turn,
              message: { id: 'clarify', sender: 'Assistant', text: clarifyMsg, created_at: new Date().toISOString() },
              conversational_reply: clarifyMsg,
            },
            { status: 200 }
          )
        }

        if (llmClassification.intent === 'explain_method') {
          console.info('[AIT Router]', {
            intent: 'explain_method',
            confidence: llmClassification.confidence,
            source: llmClassification.source,
            action_path: 'explain_method',
          })
          const docPath = path.resolve(process.cwd(), 'docs/ait/method.md')
          let message = 'Tài liệu phương pháp tính điểm và ghép nối đang được cập nhật.'
          if (fs.existsSync(docPath)) {
            try {
              message = fs.readFileSync(docPath, 'utf8').slice(0, 500)
            } catch {
              // fallback
            }
          }
          const turn = {
            turn_type: 'answer' as const,
            message,
            top_matches: [],
            additional_suggestions: [],
            comparison: null,
            quick_replies: [],
            follow_up_questions: [],
            relaxation_suggestions: [],
            sources: [{ type: 'method_doc', ref: 'docs/ait/method.md' }],
            used_llm: false,
          }
          return NextResponse.json(
            {
              turn,
              message: { id: 'answer_method', sender: 'Assistant', text: message, created_at: new Date().toISOString() },
              conversational_reply: message,
            },
            { status: 200 }
          )
        }

        if (llmClassification.intent === 'system_info') {
          console.info('[AIT Router]', {
            intent: 'system_info',
            confidence: llmClassification.confidence,
            source: llmClassification.source,
            action_path: 'system_info',
          })
          const docPath = path.resolve(process.cwd(), 'docs/ait/about.md')
          let message = 'Thông tin giới thiệu nền tảng đang được cập nhật.'
          if (fs.existsSync(docPath)) {
            try {
              message = fs.readFileSync(docPath, 'utf8').slice(0, 500)
            } catch {
              // fallback
            }
          }
          const turn = {
            turn_type: 'answer' as const,
            message,
            top_matches: [],
            additional_suggestions: [],
            comparison: null,
            quick_replies: [],
            follow_up_questions: [],
            relaxation_suggestions: [],
            sources: [{ type: 'system_doc', ref: 'docs/ait/about.md' }],
            used_llm: false,
          }
          return NextResponse.json(
            {
              turn,
              message: { id: 'answer_system', sender: 'Assistant', text: message, created_at: new Date().toISOString() },
              conversational_reply: message,
            },
            { status: 200 }
          )
        }

        console.info('[AIT Router]', {
          intent: llmClassification.intent,
          confidence: llmClassification.confidence,
          source: llmClassification.source,
          action_path: 'extraction_pipeline',
        })
      } else {
        console.info('[AIT Router]', {
          intent: 'fallback',
          confidence: 0,
          source: 'fallback',
          action_path: 'extraction_pipeline',
        })
      }
    }

    // 4. Record the original input, then extract only the current turn against persisted state.
    const message = isRetry ? null : await addMessage(params.id, body.sender || 'Agency', originalText)
    const allMessages = await getMessages(params.id)
    const latestUserMessage = [...allMessages]
      .reverse()
      .find(item => item.sender.toLowerCase() !== 'assistant')
    const analysisText = isRetry
      ? latestUserMessage?.text ?? ''
      : acceptsInScopeOffer
        ? 'Những làng nghề nào được hỗ trợ?'
        : routeText
    const analysisMessages = [
      ...(activePendingQuestion ? [{ sender: 'Assistant', text: activePendingQuestion.text }] : []),
      ...(analysisText ? [{ sender: 'Agency', text: analysisText }] : []),
    ]

    const extraction = await extractTourContext({
      sessionId: params.id,
      messages: analysisMessages,
    })

    if (extraction.processing_status === 'Temporary AI Failure') {
      return NextResponse.json(
        {
          error_code: 'AI_SERVICE_UNAVAILABLE',
          message:
            "Temporary AI Failure — we couldn't process your request right now. Your conversation is saved.",
          retry_available: true,
        },
        { status: 503 }
      )
    }

    if (isReset) {
      conversationState = emptyConversationState()
    } else if (extraction.intent !== 'platform_guidance') {
      conversationState = mergeConversationState(
        conversationState,
        analysisText,
        extraction.tour_context,
        new Date(),
        activePendingQuestion?.field
      )
    }

    extraction.tour_context = applyConversationState(extraction.tour_context, conversationState)
    if (extraction.intent !== 'platform_guidance') {
      extraction.is_complete = extraction.is_complete || isCompleteConversationState(conversationState)
      const nextQuestion = extraction.is_complete ? null : nextPendingQuestion(conversationState)
      extraction.follow_up_questions = extraction.is_complete
        ? []
        : missingQuestions(conversationState).map(question => question.text).slice(0, 3)

      const reply = sanitizeUnsupportedFollowUpQuestions(extraction.conversational_reply || '')
      if (nextQuestion) {
        const prefix = reply.split(/[?？]/, 1)[0].trim()
        extraction.conversational_reply = `${prefix ? `${prefix} ` : ''}${nextQuestion.text}`
      } else {
        extraction.conversational_reply = reply.split(/[?？]/, 1)[0].trim()
      }

      await updateMatchingSessionContext(params.id, {
        state: conversationState,
        pending_question: nextQuestion,
        out_of_scope_refusal_count: 0,
      })
    } else {
      await updateMatchingSessionContext(params.id, {
        state: conversationState,
        pending_question: isReset || acceptsInScopeOffer ? null : activePendingQuestion,
        out_of_scope_refusal_count: 0,
      })
    }

    const userText = analysisText
    const isTest = isTestConversation(allMessages, body.is_test === true)

    if (isTest) {
      if (!extraction.tour_context.experience_types || extraction.tour_context.experience_types.length === 0) {
        const detected = detectExperienceTypes(userText)
        if (detected.length > 0) {
          extraction.tour_context.experience_types = detected
        }
      }
    }

    const isBareTest = userText.trim().toLowerCase() === 'test'

    let tourPreferenceProfile: any = null
    if (isTest && (extraction.is_complete || isBareTest)) {
      extraction.is_complete = true
      tourPreferenceProfile = {
        hard_constraints: {
          group_size: extraction.tour_context.group_size || 10,
          max_budget_per_person: extraction.tour_context.budget?.max_per_person || 200000,
          target_date_or_range: extraction.tour_context.target_date_or_range || { start_date: '2026-11-20' },
        },
        matching_attributes: (extraction.tour_context.experience_types || []).map((t) => ({
          type: 'experience_type',
          value: t,
          polarity: 'include',
        })),
        inferred_preferences: ['Authentic Craft', 'Test Dataset'],
        preference_weights: {
          experience_fit: 0.4,
          route_convenience: 0.25,
          agency_preferences: 0.2,
          provider_quality: 0.15,
        },
        is_test: true,
      }
      if (extraction.tour_context.craft_preference) {
        tourPreferenceProfile.matching_attributes.push({
          type: 'craft_preference',
          value: extraction.tour_context.craft_preference,
          polarity: 'include',
        })
      }
    } else if (extraction.is_complete) {
      tourPreferenceProfile = await buildTourPreferenceProfile(extraction.tour_context, conversationState)
      if (isTest && tourPreferenceProfile) {
        tourPreferenceProfile.is_test = true
      }
    }

    const pricePref = detectPriceSortPreference(userText)
    if (pricePref && tourPreferenceProfile) {
      tourPreferenceProfile.matching_attributes.push({
        type: 'price_preference',
        value: pricePref,
        polarity: 'include',
      })
      tourPreferenceProfile.price_sort = pricePref
    }

    const replyText = typeof extraction.conversational_reply === 'string' ? extraction.conversational_reply : ''
    const mixedScopeNotice = mixedMeal.hasMealRequest
      ? 'Xin lỗi, mình không thể gợi ý chỗ ăn trưa vì yêu cầu đó nằm ngoài phạm vi; mình tiếp tục hỗ trợ yêu cầu làng nghề.'
      : ''
    const cardQueryText = acceptsInScopeOffer ? 'những làng nghề nào được hỗ trợ' : userText
    const combined = `${cardQueryText} ${replyText}`
    const scope = detectCardScope(cardQueryText)

    let activityCards: any[] = []
    let providerCards: any[] = []
    let villageCards: any[] = []

    if (isTest) {
      if (scope === 'village') villageCards = resolveTestVillageCards(combined)
      else if (scope === 'provider') providerCards = resolveTestProviderCards(combined)
      else if (scope === 'activity') activityCards = resolveTestActivityCards(combined)
      else if (scope === 'all') {
        villageCards = resolveTestVillageCards(combined)
        providerCards = resolveTestProviderCards(combined)
        activityCards = resolveTestActivityCards(combined)
      }
    } else {
      if (scope === 'village') villageCards = resolveVillageCards(combined)
      else if (scope === 'provider') providerCards = resolveProviderCards(combined)
      else if (scope === 'activity') activityCards = resolveActivityCards(combined)
      else if (scope === 'all') {
        villageCards = resolveVillageCards(combined)
        providerCards = resolveProviderCards(combined)
        activityCards = resolveActivityCards(combined)
      }
    }

    if (!isTest && villageCards.length > 0) {
      villageCards = withVillageStartingPrices(villageCards, eligibleVillageStartingPrices(await loadExploreRuntime()))
    }

    if (!isRetry && extraction.conversational_reply && typeof extraction.conversational_reply === 'string') {
      try {
        const assistantReply = [mixedScopeNotice, extraction.conversational_reply].filter(Boolean).join(' ')
        await addMessage(params.id, 'Assistant', assistantReply.slice(0, 2000))
      } catch (e) {
        console.warn('[AIT] Could not save assistant response to message history:', e)
      }
    }

    if (!isTest) {
      try {
        const craftsFound: string[] = []
        const textToAnalyze = `${userText} ${replyText}`.toLowerCase()
        const craftKeywords = [
          'gốm', 'lụa', 'mộc', 'mây', 'sơn mài', 'đồng', 'nón', 'bát tràng', 'vạn phúc', 'chàng sơn', 'phú vinh', 'hạ thái', 'đại bái', 'chuông',
        ]
        for (const kw of craftKeywords) {
          if (textToAnalyze.includes(kw)) craftsFound.push(kw)
        }
        if (craftsFound.length > 0 || tourPreferenceProfile) {
          await saveAgencyPreferenceProfile({
            agencyId: access.agencyId,
            sessionId: params.id,
            tourPreferenceProfile: tourPreferenceProfile || { matching_attributes: craftsFound },
          })
        }
      } catch (err) {
        console.warn('[AIT] Failed to update preference profile for learning loop:', err)
      }
    }

    // 5. Build turn structure for turnSchema
    let turn: any = null
    if (tourPreferenceProfile && extraction.is_complete) {
      // Execute matching call internally
      try {
        const [experiences, bookings, operatingHours, villages] = await Promise.all([
          loadExperiences(),
          loadBookings(),
          loadOperatingHours(),
          loadVillages(),
        ])
        const matching = await runAitMatchingPipeline({
          candidates: experiences,
          profile: tourPreferenceProfile,
          bookings: bookings.map(booking => ({
            experience_id: booking.experience_id,
            start_at: booking.start_at,
            end_at: booking.end_at || booking.start_at,
            status: booking.status,
          })),
          operatingHours,
          villageNames: new Map(villages.map(village => [village.village_id, village.village_name])),
        })
        const topCards = matching.topMatches
        const additionalCards = matching.additionalMatches

        const totalCount = topCards.length + additionalCards.length
        const cards = [...topCards, ...additionalCards]
        const narration = resultEndingCandidate(extraction.conversational_reply || '').slice(0, 120)
        const checkedNarration = postCheckMessage({
          turnType: 'results',
          message: narration,
          allowedNumbers: [],
          knownNames: experiences.flatMap((experience) => [
            experience.name,
            experience.experience_name,
            experience.village_name,
            experience.provider_name,
          ]).filter((name): name is string => Boolean(name)),
          allowedNames: [],
          cardNames: cards.map((card) => card.experience_name),
          fallback: '',
        })
        const excludedVillageNames = conversationState.exclusions.villages
          .map(villageId => villages.find(village => village.village_id === villageId)?.village_name)
          .filter((name): name is string => Boolean(name))
          .map(name => name.replace(/^(?:làng(?: nghề)?|xưởng)\s+/i, ''))
        const excludedCraftNames = conversationState.exclusions.crafts.map(craftLabelVi)
        const craftPreference = tourPreferenceProfile.matching_attributes.find(
          (attribute: any) => attribute.type === 'craft_preference' && attribute.polarity !== 'exclude'
        )?.value
        const resultMessage = buildResultsMessage({
          count: totalCount,
          group_size: conversationState.group_size,
          start_date: /^\d{4}-\d{2}-\d{2}$/.test(conversationState.date || '')
            ? conversationState.date
            : undefined,
          max_budget_per_person: conversationState.budget_per_person,
          craft: typeof craftPreference === 'string' ? craftLabelVi(craftPreference) : undefined,
          origin: conversationState.origin,
          radiusKm: conversationState.radius_km,
          excludedVillages: excludedVillageNames,
          excludedCrafts: excludedCraftNames,
          priceSort: priceSortDirection(tourPreferenceProfile),
          matches: cards.length > 0
            ? cards.map((card) => ({
              experience_name: card.experience_name,
              price_per_person: card.price_per_person,
              distance_km: card.distance_km,
            }))
            : undefined,
          ending: cards.length > 0 && checkedNarration.ok ? checkedNarration.message : undefined,
        })

        turn = {
          turn_type: totalCount > 0 ? ('results' as const) : ('no_results' as const),
          message: resultMessage,
          top_matches: topCards,
          additional_suggestions: additionalCards,
          comparison: null,
          quick_replies: [],
          follow_up_questions: [],
          relaxation_suggestions: [],
          sources: [],
          used_llm: false,
        }
      } catch (e) {
        console.warn('[AIT] Failed to build match cards for turn:', e)
      }
    }

    if (!turn && extraction.intent === 'platform_guidance' && (isHelpQuestion || acceptsInScopeOffer)) {
      turn = {
        turn_type: 'answer' as const,
        message: (extraction.conversational_reply || 'Mình có thể hỗ trợ tìm hiểu làng nghề và ghép tour phù hợp.').slice(0, 500),
        top_matches: [],
        additional_suggestions: [],
        comparison: null,
        quick_replies: [],
        follow_up_questions: [],
        relaxation_suggestions: [],
        sources: [{
          type: 'knowledge_base',
          ref: acceptsInScopeOffer ? 'verified_craft_villages' : 'contact_and_booking',
        }],
        used_llm: extraction.usedLlm ?? false,
      }
    }

    if (!turn) {
      const askMsg = (extraction.conversational_reply || 'Bạn có thể cung cấp thêm thông tin cho chuyến đi không?').slice(0, 500)
      turn = {
        turn_type: 'ask_info' as const,
        message: askMsg,
        top_matches: [],
        additional_suggestions: [],
        comparison: null,
        quick_replies: [
          { label: '10 người', patch: { hard_constraints: { group_size: 10 } } },
          { label: '20 người', patch: { hard_constraints: { group_size: 20 } } },
        ],
        follow_up_questions: [],
        relaxation_suggestions: [],
        sources: [],
        used_llm: true,
      }
    }

    if (mixedScopeNotice) {
      turn.message = `${mixedScopeNotice} ${turn.message}`.slice(0, 500)
    }

    const statusCode = isE2E ? 200 : isRetry ? 200 : 201

    return NextResponse.json(
      {
        message,
        is_test: isTest,
        extraction,
        tour_preference_profile: tourPreferenceProfile,
        activity_cards: activityCards,
        village_cards: villageCards,
        provider_cards: providerCards,
        turn,
      },
      { status: statusCode }
    )
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 400 })
  }
}
