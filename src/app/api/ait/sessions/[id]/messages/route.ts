import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { PLATFORM_KNOWLEDGE_BASE } from '@/lib/ai/knowledge-base'
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
  getTestCandidates,
  resolveTestVillageCards,
  resolveTestProviderCards,
  resolveTestActivityCards,
  findFixtureVillageMentions,
  stripTestPromptMarker,
} from '@/lib/matching/test-dataset'
import { craftTypeForPreference, detectExperienceTypes } from '@/lib/matching/craft-taxonomy'
import { withVillageStartingPrices } from '@/lib/village-starting-price'
import { eligibleVillageStartingPrices } from '@/lib/explore/catalog'
import { loadExploreRuntime } from '@/lib/explore/seed-repository'
import { loadBookings, loadExperiences, loadVillages } from '@/lib/db/seed-loader'
import { loadOperatingHours } from '@/lib/prf/seed-reader'
import {
  priceSortDirection,
  runAitMatchingPipeline,
  runVillageCardPipeline,
} from '@/lib/ait/matching-pipeline'
import { originDisplayLabel, originDisplayNotice } from '@/lib/matching/geo'
import { normalizeVillageName } from '@/lib/matching/village-coordinate-lookup'
import { isAitGeoDebugEnabled, logAitGeoDebug } from '@/lib/ait/geo-debug'
import {
  fallbackMissingPrimary,
  normalizeMissingPrimary,
  stripMissingDataClaims,
} from '@/lib/ai/missing-primary'
import { sanitizeInput, createRateLimiter } from '@/lib/ait/guard'
import { routeByRules } from '@/lib/ait/router'
import { classifyIntent } from '@/lib/ait/llm-router'
import {
  buildResultsMessage,
  buildMissingPrimaryMessage,
  buildVillageCardResultsMessage,
  craftLabelVi,
  refusalTemplate,
  resultEndingCandidate,
} from '@/lib/ait/messages'
import { hasAffirmativeBookingClaim, postCheckMessage } from '@/lib/ait/postcheck'
import {
  explainStoredMatch,
  isMatchExplanationRequest,
  matchingContextResults,
} from '@/lib/ait/match-reasons'
import { turnSchema } from '@/lib/ait/schemas'
import {
  applyConversationState,
  emptyConversationState,
  isAffirmativeReply,
  isBookingActionRequest,
  isAmbiguousCraftQuestion,
  isBookingHelpRequest,
  isCompleteConversationState,
  isExplicitConversationReset,
  isFalsePositiveMealPhrase,
  hasZeroRadiusConstraint,
  hasInvalidRadiusConstraint,
  isShortPendingReply,
  isSystemHelpRequest,
  hasUnsupportedDistanceConstraint,
  mergeConversationState,
  missingQuestions,
  nextPendingQuestion,
  normalizeConversationState,
  normalizePendingQuestion,
  sanitizeUnsupportedFollowUpQuestions,
  stripZeroRadiusConstraint,
  stripUnsupportedDistanceConstraint,
  splitMixedMealRequest,
} from '@/lib/ait/conversation-state'
import fs from 'fs'
import path from 'path'

const rateLimiter = createRateLimiter({ limit: 20, windowMs: 60000 })
const UNSUPPORTED_DISTANCE_REPLY =
  "Hiện chưa hỗ trợ lọc theo khoảng cách tối thiểu hoặc khoảng cách trong một dải. Bạn có thể nói giới hạn tối đa, ví dụ 'dưới 20 km'."

function bookingGuidanceTurn() {
  const knowledge = PLATFORM_KNOWLEDGE_BASE.find(item => item.id === 'contact_and_booking')
  if (!knowledge) throw new Error('Booking guidance is missing from the knowledge base.')
  return {
    turn_type: 'answer' as const,
    message: `AI không tự đặt hoặc xác nhận tour.\n\n${knowledge.contentVi}`,
    top_matches: [],
    additional_suggestions: [],
    comparison: null,
    quick_replies: [],
    follow_up_questions: [],
    relaxation_suggestions: [],
    sources: [{ type: 'knowledge_base', ref: knowledge.id }],
    used_llm: false,
  }
}

function pendingQuestionSatisfied(
  field: string,
  state: ReturnType<typeof normalizeConversationState>
): boolean {
  switch (field) {
    case 'craft': return state.craft !== undefined
    case 'group_size': return state.group_size !== undefined
    case 'budget_per_person': return state.budget_per_person !== undefined
    case 'date': return state.date !== undefined
    case 'origin': return state.origin !== undefined
    case 'radius_km': return state.radius_km !== undefined
    default: return false
  }
}

function changedKnownTourCriteria(
  before: ReturnType<typeof normalizeConversationState>,
  after: ReturnType<typeof normalizeConversationState>
): boolean {
  return (
    (before.craft !== undefined && before.craft !== after.craft)
    || (before.group_size !== undefined && before.group_size !== after.group_size)
    || (before.budget_per_person !== undefined && before.budget_per_person !== after.budget_per_person)
    || (before.date !== undefined && before.date !== after.date)
    || (before.origin !== undefined && before.origin !== after.origin)
    || (before.radius_km !== undefined && before.radius_km !== after.radius_km)
    || JSON.stringify(before.exclusions) !== JSON.stringify(after.exclusions)
  )
}

async function outOfScopeResponse(
  sessionId: string,
  storedContext: Record<string, unknown>,
  state: ReturnType<typeof normalizeConversationState>
) {
  const refusalCount = Number(storedContext.out_of_scope_refusal_count) || 0
  const skippedQuestion = normalizePendingQuestion(storedContext.pending_question)
  if (
    skippedQuestion
    && skippedQuestion.field !== 'in_scope_offer'
    && !pendingQuestionSatisfied(skippedQuestion.field, state)
  ) {
    state.dismissed_questions = [...new Set([...state.dismissed_questions, skippedQuestion.field])]
  }
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
    if (!isRetry && isBookingActionRequest(originalText)) {
      const turn = bookingGuidanceTurn()
      return NextResponse.json({ turn, conversational_reply: turn.message }, { status: 200 })
    }

    if (!isRetry && isMatchExplanationRequest(originalText)) {
      const knownExperienceNames = (await loadExperiences()).map(experience => experience.name)
      const answer = explainStoredMatch(originalText, storedContext, knownExperienceNames)
      const turn = {
        turn_type: 'answer' as const,
        message: answer,
        top_matches: [],
        additional_suggestions: [],
        comparison: null,
        quick_replies: [],
        follow_up_questions: [],
        relaxation_suggestions: [],
        sources: [{ type: 'matching_result', ref: 'last_matching_results' }],
        used_llm: false,
      }
      return NextResponse.json({ turn, conversational_reply: answer }, { status: 200 })
    }

    let conversationState = normalizeConversationState(storedContext.state)
    const pendingQuestion = normalizePendingQuestion(storedContext.pending_question)
    const previousUserMessages = (await getMessages(params.id))
      .filter(item => item.sender.toLowerCase() !== 'assistant')
    const previousUserText = previousUserMessages.at(-1)?.text ?? ''
    const isReset = !isRetry && isExplicitConversationReset(originalText)
    const activePendingQuestion = isReset ? null : pendingQuestion
    const textForParsing = stripTestPromptMarker(originalText)
    const mixedMeal = !isRetry && !isReset
      ? splitMixedMealRequest(textForParsing)
      : { inScopeText: textForParsing, hasMealRequest: false }
    const routeText = mixedMeal.hasMealRequest ? mixedMeal.inScopeText : textForParsing
    const unsupportedDistanceRequest = !isRetry && hasUnsupportedDistanceConstraint(routeText)
    const zeroRadiusRequest = !isRetry && hasZeroRadiusConstraint(routeText)
    const invalidRadiusRequest = !isRetry && hasInvalidRadiusConstraint(routeText)
    const unsupportedCurrencyRequest = !isRetry && /\$|(?:\bUSD\b|\bdollar\b|\beuro\b|\bEUR\b|\bGBP\b|\byen\b)/iu.test(routeText)
    const invalidDateRequest = !isRetry
      && /(?:hôm\s+qua|hom\s+qua|31\s*\/\s*02(?:\s*\/\s*\d{4})?|ngày\s+\d{1,2}\s*\/\s*(?:2|02)\s*\/\s*\d{4})/iu.test(routeText)
    const pureEnglishRequest = !isRetry
      && /^[\x00-\x7F]*$/.test(routeText)
      && /\b(?:I|want|visit|pottery|silk|weaving|under|over|pax|budget|person|show|please|distance|from|with)\b/iu.test(routeText)
    const acceptsInScopeOffer = activePendingQuestion?.field === 'in_scope_offer'
      && isAffirmativeReply(originalText)
    const answersPendingQuestion = Boolean(activePendingQuestion && isShortPendingReply(originalText))
    const isGuideLanguageQuestion = /(?:có\s+)?hướng dẫn tiếng Anh(?:\s+không)?\??/iu.test(routeText)
    const isGuideLanguageFollowUp = /^(?:không có cũng được|có cũng được)[.!? ]*$/iu.test(routeText.trim())
      && /(?:có\s+)?hướng dẫn tiếng Anh(?:\s+không)?\??/iu.test(previousUserText)
    const isHelpQuestion = isSystemHelpRequest(routeText)
      || isBookingHelpRequest(routeText)
      || isGuideLanguageQuestion
      || isGuideLanguageFollowUp
    const bypassClassifier = isRetry || isReset || acceptsInScopeOffer || answersPendingQuestion
      || isHelpQuestion || isFalsePositiveMealPhrase(routeText) || mixedMeal.hasMealRequest
      || unsupportedDistanceRequest || zeroRadiusRequest || invalidRadiusRequest
      || unsupportedCurrencyRequest || pureEnglishRequest || invalidDateRequest

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
    const isTest = isTestConversation([{ sender: 'Agency', text: originalText }])
    if (unsupportedCurrencyRequest || pureEnglishRequest || invalidRadiusRequest || invalidDateRequest) {
      const reply = unsupportedCurrencyRequest
        ? 'Hiện chưa hỗ trợ đơn vị tiền này, vui lòng nhập bằng đồng.'
        : pureEnglishRequest
          ? 'Hiện chỉ hỗ trợ tiếng Việt, bạn vui lòng nhập bằng tiếng Việt.'
          : invalidRadiusRequest
            ? 'Giá trị bán kính không hợp lệ. Vui lòng nhập một số bán kính dương bằng km.'
            : 'Ngày hoặc thời gian này không hợp lệ. Vui lòng nhập một ngày hợp lệ.'
      await updateMatchingSessionContext(params.id, {
        state: normalizeConversationState(conversationState),
        pending_question: activePendingQuestion,
        out_of_scope_refusal_count: 0,
      })
      await addMessage(params.id, 'Assistant', reply)
      const turn = {
        turn_type: 'answer' as const,
        message: reply,
        top_matches: [],
        additional_suggestions: [],
        comparison: null,
        quick_replies: [],
        follow_up_questions: [],
        relaxation_suggestions: [],
        sources: [],
        used_llm: false,
      }
      return NextResponse.json({
        message,
        is_test: isTest,
        extraction: {
          is_complete: false,
          processing_status: 'Success',
          retry_available: false,
          follow_up_questions: [],
          tour_context: applyConversationState({}, normalizeConversationState(conversationState)),
          conversational_reply: reply,
          missing_primary: [],
          intent: 'platform_guidance',
          usedLlm: false,
        },
        tour_preference_profile: null,
        activity_cards: [],
        village_cards: [],
        provider_cards: [],
        turn,
      }, { status: 201 })
    }
    if (unsupportedDistanceRequest || zeroRadiusRequest) {
      const stateWithoutPreviousRadius = normalizeConversationState(conversationState)
      delete stateWithoutPreviousRadius.radius_km
      delete stateWithoutPreviousRadius.slots.radius
      const stateText = unsupportedDistanceRequest
        ? stripUnsupportedDistanceConstraint(routeText)
        : stripZeroRadiusConstraint(routeText)
      conversationState = mergeConversationState(
        stateWithoutPreviousRadius,
        stateText,
        {},
        new Date(),
        activePendingQuestion?.field,
      )
      await updateMatchingSessionContext(params.id, {
        state: conversationState,
        pending_question: activePendingQuestion,
        out_of_scope_refusal_count: 0,
      })
      const reply = unsupportedDistanceRequest
        ? UNSUPPORTED_DISTANCE_REPLY
        : buildVillageCardResultsMessage([], 0, conversationState.origin)
      await addMessage(params.id, 'Assistant', reply)
      const turn = {
        turn_type: unsupportedDistanceRequest ? 'answer' as const : 'no_results' as const,
        message: reply,
        top_matches: [],
        additional_suggestions: [],
        comparison: null,
        quick_replies: [],
        follow_up_questions: [],
        relaxation_suggestions: [],
        sources: [],
        used_llm: false,
      }
      return NextResponse.json(
        {
          message,
          is_test: isTest,
          extraction: {
            is_complete: false,
            processing_status: 'Success',
            retry_available: false,
            follow_up_questions: [],
            tour_context: applyConversationState({}, conversationState),
            conversational_reply: reply,
            missing_primary: [],
            intent: 'platform_guidance',
            usedLlm: false,
          },
          tour_preference_profile: null,
          activity_cards: [],
          village_cards: [],
          provider_cards: [],
          turn,
        },
        { status: 201 },
      )
    }
    const allMessages = await getMessages(params.id)
    const recentUserTurns = allMessages
      .filter(item => item.sender.toLowerCase() !== 'assistant')
      .slice(-2)
      .map(item => ({ sender: item.sender, text: item.text, sent_at: item.sent_at }))
    const latestUserMessage = [...allMessages]
      .reverse()
      .find(item => item.sender.toLowerCase() !== 'assistant')
    const analysisText = isRetry
      ? latestUserMessage?.text ?? ''
      : acceptsInScopeOffer
        ? 'Những làng nghề nào được hỗ trợ?'
        : routeText
    const analysisMessages = analysisText ? [{ sender: 'Agency', text: analysisText }] : []

    if (isAmbiguousCraftQuestion(analysisText)) {
      const clarification = 'Bạn muốn đổi yêu cầu sang trải nghiệm này hay chỉ hỏi về khả năng có hoạt động này?'
      const turn = {
        turn_type: 'clarify' as const,
        message: clarification,
        top_matches: [],
        additional_suggestions: [],
        comparison: null,
        quick_replies: [],
        follow_up_questions: [],
        relaxation_suggestions: [],
        sources: [],
        used_llm: false,
      }
      return NextResponse.json({ message, turn, conversational_reply: clarification }, { status: 201 })
    }

    const extraction = await extractTourContext({
      sessionId: params.id,
      messages: analysisMessages,
      state: conversationState,
      recentTurns: recentUserTurns,
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

    extraction.missing_primary = [...new Set([
      ...normalizeMissingPrimary(extraction.missing_primary, routeText),
      ...fallbackMissingPrimary(routeText),
    ])]
    extraction.conversational_reply = stripMissingDataClaims(extraction.conversational_reply ?? '')

    let optionalInvite: string | undefined
    const stateBeforeExtraction = conversationState
    if (isReset) {
      conversationState = emptyConversationState()
    } else if (!isHelpQuestion && extraction.intent !== 'platform_guidance') {
      conversationState = mergeConversationState(
        conversationState,
        analysisText,
        extraction.tour_context,
        new Date(),
        activePendingQuestion?.field
      )
    }

    const skippedPendingQuestion = Boolean(
      activePendingQuestion
      && activePendingQuestion.field !== 'in_scope_offer'
      && !answersPendingQuestion
      && !pendingQuestionSatisfied(activePendingQuestion.field, conversationState)
      && changedKnownTourCriteria(stateBeforeExtraction, conversationState)
    )
    if (skippedPendingQuestion && activePendingQuestion) {
      conversationState.dismissed_questions = [
        ...new Set([...conversationState.dismissed_questions, activePendingQuestion.field]),
      ]
    }

    extraction.tour_context = applyConversationState(extraction.tour_context, conversationState)
    if (extraction.intent !== 'platform_guidance') {
      extraction.is_complete = extraction.is_complete || isCompleteConversationState(conversationState)
      const nextQuestion = extraction.is_complete || skippedPendingQuestion
        ? null
        : nextPendingQuestion(conversationState)
      optionalInvite = nextQuestion?.text
      extraction.follow_up_questions = extraction.is_complete
        ? []
        : nextQuestion ? [nextQuestion.text] : []

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
        ...(isReset ? matchingContextResults([], '') : {}),
      })
    } else {
      await updateMatchingSessionContext(params.id, {
        state: conversationState,
        pending_question: isReset || acceptsInScopeOffer ? null : activePendingQuestion,
        out_of_scope_refusal_count: 0,
      })
    }

    const userText = analysisText
    if (isTest) {
      if (!extraction.tour_context.experience_types || extraction.tour_context.experience_types.length === 0) {
        const detected = detectExperienceTypes(userText)
        if (detected.length > 0) {
          extraction.tour_context.experience_types = detected
        }
      }
    }

    const isBareTest = isTest && userText.trim() === ''
    const specificActivityTerms = [
      ...userText.matchAll(/\b(?:làm|chế\s+tạo|chế\s+tác)\s+([\p{L}]+)/giu),
      ...userText.matchAll(/\bworkshop\s+([\p{L}]+)/giu),
    ].map((match) => match[1].toLowerCase())
    const genericActivityTerms = new Set([
      'gì', 'nào', 'khác', 'mới', 'làm', 'đồ', 'thử', 'này', 'đó', 'phù', 'hợp',
    ])
    const hasUnmatchedSpecificActivity = detectCardScope(userText) === 'activity'
      && resolveActivityCards(userText).length === 0
      && specificActivityTerms.some(term => !genericActivityTerms.has(term))
    const hasTourDetails = Boolean(
      extraction.tour_context.craft_preference
      || extraction.tour_context.experience_types?.length
      || extraction.tour_context.group_size
      || extraction.tour_context.budget?.max_per_person
      || extraction.tour_context.target_date_or_range?.start_date
      || extraction.tour_context.origin_or_route?.origin_address
      || conversationState.radius_km !== undefined
      || conversationState.exclusions.villages.length
      || conversationState.exclusions.crafts.length
    )
    const shouldBuildTourProfile = extraction.is_complete
      || (
        !hasUnmatchedSpecificActivity
        &&
        extraction.intent !== 'platform_guidance'
        && (extraction.intent === 'tour_matching' || extraction.intent === 'mixed' || hasTourDetails)
      )

    let tourPreferenceProfile: any = null
    if (isTest && (extraction.is_complete || isBareTest)) {
      extraction.is_complete = true
      tourPreferenceProfile = {
        hard_constraints: {
          group_size: extraction.tour_context.group_size || 10,
          max_budget_per_person: extraction.tour_context.budget?.max_per_person || 200000,
          target_date_or_range: extraction.tour_context.target_date_or_range || { start_date: '2026-11-20' },
          origin: extraction.tour_context.origin_or_route,
          radius_km: conversationState.radius_km,
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
        ranking_preferences: conversationState.ranking_preferences,
        is_test: true,
      }
      if (extraction.tour_context.craft_preference) {
        tourPreferenceProfile.matching_attributes.push({
          type: 'craft_preference',
          value: extraction.tour_context.craft_preference,
          polarity: 'include',
        })
      }
    } else if (shouldBuildTourProfile) {
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
    const cardQueryText = acceptsInScopeOffer ? 'những làng nghề nào được hỗ trợ' : userText
    const combined = `${cardQueryText} ${replyText}`
    const scope = detectCardScope(cardQueryText)

    let activityCards: any[] = []
    let providerCards: any[] = []
    let villageCards: any[] = []
    let villageOverflowCards: any[] = []

    if (isTest) {
      if (scope === 'village') villageCards = resolveTestVillageCards(cardQueryText, conversationState.radius_km !== undefined)
      else if (scope === 'provider') providerCards = resolveTestProviderCards(combined)
      else if (scope === 'activity') activityCards = resolveTestActivityCards(combined)
      else if (scope === 'all') {
        villageCards = resolveTestVillageCards(cardQueryText, conversationState.radius_km !== undefined)
        providerCards = resolveTestProviderCards(combined)
        activityCards = resolveTestActivityCards(combined)
      }
    } else {
      if (scope === 'village') villageCards = resolveVillageCards(cardQueryText, conversationState.radius_km !== undefined)
      else if (scope === 'provider') providerCards = resolveProviderCards(combined)
      else if (scope === 'activity') activityCards = resolveActivityCards(combined)
      else if (scope === 'all') {
        villageCards = resolveVillageCards(cardQueryText, conversationState.radius_km !== undefined)
        providerCards = resolveProviderCards(combined)
        activityCards = resolveActivityCards(combined)
      }
    }

    if (!isTest && villageCards.length > 0) {
      villageCards = withVillageStartingPrices(villageCards, eligibleVillageStartingPrices(await loadExploreRuntime()))
    }
    if (scope === 'village') {
      villageCards = runVillageCardPipeline({
        cards: villageCards,
        radiusKm: conversationState.radius_km,
        origin: conversationState.origin || extraction.tour_context.origin_or_route,
        distanceRequested: conversationState.slots.radius?.source === 'explicit'
          || conversationState.slots.origin?.source === 'explicit'
          || conversationState.ranking_preferences?.nearest === true,
      })
    }
    const originNotice = originDisplayNotice(
      conversationState.origin || extraction.tour_context.origin_or_route,
    )
    const originOutsideScope = originNotice?.startsWith('Địa điểm') === true
    if (originOutsideScope) {
      tourPreferenceProfile = null
      villageCards = []
      providerCards = []
      activityCards = []
    }
    const unavailableFixtureVillages = !isTest
      ? findFixtureVillageMentions(cardQueryText)
        .filter(name => !resolveVillageCards(name).some(card =>
          card.name.toLocaleLowerCase('vi').includes(name.toLocaleLowerCase('vi'))
        ))
      : []
    const unavailableCraft = conversationState.craft
      && !craftTypeForPreference(conversationState.craft)
      ? conversationState.craft
      : undefined
    if (unavailableFixtureVillages.length > 0 || unavailableCraft) {
      extraction.missing_primary = [
        ...new Set([
          ...extraction.missing_primary,
          ...unavailableFixtureVillages,
          ...(unavailableCraft ? [unavailableCraft] : []),
        ]),
      ]
      tourPreferenceProfile = null
      villageCards = []
    }
    if (scope === 'village') {
      villageOverflowCards = villageCards.slice(3)
      villageCards = villageCards.slice(0, 3)
    }

    if (
      !isRetry
      && extraction.missing_primary.length === 0
      && extraction.conversational_reply
      && typeof extraction.conversational_reply === 'string'
    ) {
      try {
        await addMessage(params.id, 'Assistant', extraction.conversational_reply.slice(0, 2000))
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
    if (tourPreferenceProfile) {
      // Execute matching call internally
      try {
        const [experiences, bookings, operatingHours, villages] = await Promise.all([
          isTest ? getTestCandidates(tourPreferenceProfile) : loadExperiences(),
          loadBookings(),
          loadOperatingHours(),
          loadVillages(),
        ])
        const matching = await runAitMatchingPipeline({
          candidates: experiences,
          profile: tourPreferenceProfile,
          explicitCriteria: {
            distance: conversationState.slots.radius?.source === 'explicit'
              || conversationState.slots.origin?.source === 'explicit'
              || conversationState.ranking_preferences?.nearest === true,
            group_size: conversationState.slots.group_size?.source === 'explicit',
            budget: conversationState.slots.budget_per_person?.source === 'explicit',
            date: conversationState.slots.date?.source === 'explicit',
          },
          bookings: bookings.map(booking => ({
            experience_id: booking.experience_id,
            start_at: booking.start_at,
            end_at: booking.end_at || booking.start_at,
            status: booking.status,
          })),
          operatingHours,
          villageNames: new Map(villages.map(village => [village.village_id, village.village_name])),
        })
        if (isAitGeoDebugEnabled()) {
          const debugVillages = isTest
            ? resolveTestVillageCards('làng nghề', true)
            : villages
          const scoresByVillage = new Map<string, {
            score_components: Record<string, number>
            normalized_weights: Record<string, number>
            ranking_score: number | null
            omitted_components: string[]
          }>()
          for (const candidate of matching.rankedCandidates) {
            const village = debugVillages.find(item =>
              item.village_id === candidate.village_id
              || normalizeVillageName('village_name' in item ? item.village_name : item.name)
                === normalizeVillageName(candidate.village_name || ''),
            )
            if (!village || scoresByVillage.has(village.village_id)) continue
            scoresByVillage.set(village.village_id, {
              score_components: candidate.score_components,
              normalized_weights: candidate.normalized_weights,
              ranking_score: candidate.ranking_score,
              omitted_components: candidate.omitted_components,
            })
          }
          logAitGeoDebug({
            origin: conversationState.origin || extraction.tour_context.origin_or_route,
            radiusKm: conversationState.radius_km,
            villages: debugVillages.map(village => ({
              village_id: village.village_id,
              name: 'village_name' in village ? village.village_name : village.name,
            })),
            scoresByVillage,
          })
        }
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
          verifiedFacts: experiences.flatMap((experience) => [
            experience.description,
            ...(Array.isArray(experience.tags) ? experience.tags : []),
          ]).filter((fact): fact is string => typeof fact === 'string'),
          fallback: '',
        })
        extraction.conversational_reply = checkedNarration.ok ? checkedNarration.message : ''
        const excludedVillageNames = conversationState.exclusions.villages
          .map(villageId => villages.find(village => village.village_id === villageId)?.village_name)
          .filter((name): name is string => Boolean(name))
          .map(name => name.replace(/^(?:làng(?: nghề)?|xưởng)\s+/i, ''))
        const excludedCraftNames = conversationState.exclusions.crafts.map(craftLabelVi)
        const craftPreference = tourPreferenceProfile.matching_attributes.find(
          (attribute: any) => attribute.type === 'craft_preference' && attribute.polarity !== 'exclude'
        )?.value
        const rawOrigin = conversationState.origin
          || tourPreferenceProfile.hard_constraints?.origin?.origin_address
          || tourPreferenceProfile.hard_constraints?.origin?.address
        const requestedOrigin = originDisplayLabel(rawOrigin)
          || (typeof rawOrigin === 'string' ? rawOrigin : undefined)
        const originUnresolved = originNotice?.startsWith('Chưa nhận ra')
          ? originNotice
          : undefined
        const resultMessage = buildResultsMessage({
          count: totalCount,
          group_size: conversationState.group_size,
          start_date: /^\d{4}-\d{2}-\d{2}$/.test(conversationState.date || '')
            ? conversationState.date
            : undefined,
          max_budget_per_person: conversationState.budget_per_person,
          craft: typeof craftPreference === 'string' ? craftLabelVi(craftPreference) : undefined,
          origin: requestedOrigin || 'trung tâm Hà Nội',
          originUnresolved,
          radiusKm: conversationState.radius_km,
          dateScheduleUnconfirmed: /^\d{4}-\d{2}-\d{2}$/.test(conversationState.date || ''),
          noResultsWithinRadius:
            totalCount === 0
            && conversationState.radius_km !== undefined
            && matching.rejected.some(({ reason }) => reason === 'radius'),
          excludedVillages: excludedVillageNames,
          excludedCrafts: excludedCraftNames,
          missingPrimary: extraction.missing_primary,
          priceSort: priceSortDirection(tourPreferenceProfile),
          matches: cards.length > 0
            ? cards.map((card) => ({
              experience_name: card.experience_name,
              price_per_person: card.price_per_person,
              distance_km: card.distance_km,
              distance_source: card.distance_source,
              location_source: card.location_source,
              radius_status: card.radius_status,
            }))
            : undefined,
          ending: extraction.is_complete && cards.length > 0 && checkedNarration.ok
            ? checkedNarration.message
            : optionalInvite,
        })
        await updateMatchingSessionContext(
          params.id,
          matchingContextResults(cards, originalText)
        )

        turn = {
          turn_type: totalCount > 0 ? ('results' as const) : ('no_results' as const),
          message: resultMessage,
          top_matches: topCards,
          additional_suggestions: additionalCards,
          comparison: null,
          quick_replies: [],
          follow_up_questions: optionalInvite ? [optionalInvite] : [],
          relaxation_suggestions: [],
          sources: [],
          used_llm: false,
        }
      } catch (e) {
        console.warn('[AIT] Failed to build match cards for turn:', e)
      }
    }

    if (!turn && originOutsideScope) {
      turn = {
        turn_type: 'no_results' as const,
        message: originNotice!,
        top_matches: [],
        additional_suggestions: [],
        comparison: null,
        quick_replies: [],
        follow_up_questions: [],
        relaxation_suggestions: [],
        sources: [],
        used_llm: false,
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

    if (!originOutsideScope && scope === 'village' && conversationState.radius_km !== undefined) {
      const origin = conversationState.origin || extraction.tour_context.origin_or_route
      const originLabel = originDisplayLabel(origin)
        || (typeof origin === 'string' ? origin : undefined)
      turn = {
        ...turn,
        turn_type: villageCards.length > 0 ? 'results' : 'no_results',
        message: [
          buildVillageCardResultsMessage(
            villageCards,
            conversationState.radius_km,
            originLabel,
            villageOverflowCards,
          ),
          ...(originNotice?.startsWith('Chưa nhận ra') ? [originNotice] : []),
        ].join('\n\n'),
        top_matches: [],
        additional_suggestions: [],
      }
    }

    if (extraction.missing_primary.length > 0) {
      const missingPrimaryMessage = buildMissingPrimaryMessage(
        extraction.missing_primary,
        villageCards.map((card) => card.name),
      )
      turn = {
        ...turn,
        turn_type: 'answer',
        message: unavailableCraft
          ? `${missingPrimaryMessage}\n\nMình có thể gợi ý làng nghề khác đang có dữ liệu.`
          : missingPrimaryMessage,
        top_matches: [],
        additional_suggestions: [],
      }
      if (!isRetry) {
        try {
          await addMessage(params.id, 'Assistant', missingPrimaryMessage)
        } catch (e) {
          console.warn('[AIT] Could not save missing-data response to message history:', e)
        }
      }
    }

    if (hasAffirmativeBookingClaim(turn.message)) {
      turn = bookingGuidanceTurn()
    }

    const activeCriteria = [
      conversationState.craft ? craftLabelVi(conversationState.craft) : undefined,
      conversationState.radius_km !== undefined
        ? `bán kính ${conversationState.radius_km.toString().replace('.', ',')} km`
        : undefined,
      conversationState.group_size !== undefined ? `${conversationState.group_size} khách` : undefined,
      conversationState.budget_per_person !== undefined
        ? `ngân sách ${conversationState.budget_per_person.toLocaleString('vi-VN')}đ`
        : undefined,
      conversationState.date,
      conversationState.origin,
    ].filter((value): value is string => Boolean(value))
    turn = {
      ...turn,
      message: `${turn.message}${turn.turn_type === 'results'
        ? `\n\nĐang lọc: ${activeCriteria.join(', ') || 'các tiêu chí đã nêu'}.`
        : ''}\n\nĐang áp dụng: ${activeCriteria.join(', ') || 'trống'}.`,
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
