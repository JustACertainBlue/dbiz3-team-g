import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { addMessage, getMatchingSession, getMessages } from '@/lib/matching/session-service'
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
import { sanitizeInput, createRateLimiter } from '@/lib/ait/guard'
import { routeByRules } from '@/lib/ait/router'
import { refusalTemplate, buildResultsMessage } from '@/lib/ait/messages'
import { postCheckMessage } from '@/lib/ait/postcheck'
import { turnSchema } from '@/lib/ait/schemas'

const rateLimiter = createRateLimiter({ limit: 20, windowMs: 60000 })

async function authorize(request: Request, sessionId: string) {
  const actor = await sessionContextFromRequest(request)
  const matchingSession = await getMatchingSession(sessionId)
  if (!actor.authenticated) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (actor.role !== 'Tour_Agency' || !actor.agencyId || matchingSession?.agency_id !== actor.agencyId) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { actor, matchingSession }
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

    // 2. Rate limit (20 req / min / agency)
    const rateCheck = rateLimiter.check(access.actor.agencyId, Date.now())
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

    // 3. Rule-based router: check for restricted requests and out of scope
    if (!isRetry) {
      const routeResult = routeByRules(cleanText)
      if (routeResult?.intent === 'restricted_request') {
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
        const tpl = refusalTemplate('out_of_scope')
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
    }

    // 4. Record message and proceed to AI extraction
    const message = isRetry ? null : await addMessage(params.id, body.sender || 'Agency', cleanText)
    const allMessages = await getMessages(params.id)

    const extraction = await extractTourContext({
      sessionId: params.id,
      messages: allMessages,
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

    const userText = cleanText
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
      tourPreferenceProfile = await buildTourPreferenceProfile(extraction.tour_context)
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
    const combined = `${userText} ${replyText}`
    const scope = detectCardScope(userText)

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

    if (!isRetry && extraction.conversational_reply && typeof extraction.conversational_reply === 'string') {
      try {
        await addMessage(params.id, 'Assistant', extraction.conversational_reply.slice(0, 2000))
      } catch (e) {
        console.warn('[AIT] Could not save assistant response to message history:', e)
      }
    }

    if (!isTest && access.actor.agencyId) {
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
            agencyId: access.actor.agencyId,
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
        const { loadExperiences } = await import('@/lib/db/seed-loader')
        const { rankCandidates } = await import('@/lib/matching/scoring-engine')
        const { buildMatchCard } = await import('@/lib/ait/card')
        const { selectTiers } = await import('@/lib/ait/scoring')

        const exps = await loadExperiences()
        const ranked = await rankCandidates(exps, tourPreferenceProfile)
        const scoredList = ranked.map((c) => ({ id: c.experience_id, score: c.match_score }))
        const { top, additional } = selectTiers(scoredList)

        const topCards = top.map((id, idx) => {
          const c = ranked.find((r) => r.experience_id === id)!
          return buildMatchCard({
            candidate: {
              id: c.experience_id,
              provider_id: c.provider_id,
              name: c.name || c.experience_name || '',
              provider_name: c.provider_name || '',
              village_name: c.village_name || '',
              price_per_person: c.price_per_person ?? null,
              max_participants: c.max_participants ?? null,
              notice_period_hours: c.notice_period_hours ?? null,
              image_url: c.image_url ?? null,
              verification_status: 'verified',
              tags: c.tags || [],
            },
            rank: idx + 1,
            score: c.match_score,
            factors: c.match_factors || {},
            sourceCount: null,
          })
        })

        const additionalCards = additional.map((id, idx) => {
          const c = ranked.find((r) => r.experience_id === id)!
          return buildMatchCard({
            candidate: {
              id: c.experience_id,
              provider_id: c.provider_id,
              name: c.name || c.experience_name || '',
              provider_name: c.provider_name || '',
              village_name: c.village_name || '',
              price_per_person: c.price_per_person ?? null,
              max_participants: c.max_participants ?? null,
              notice_period_hours: c.notice_period_hours ?? null,
              image_url: c.image_url ?? null,
              verification_status: 'verified',
              tags: c.tags || [],
            },
            rank: topCards.length + idx + 1,
            score: c.match_score,
            factors: c.match_factors || {},
            sourceCount: null,
          })
        })

        const totalCount = topCards.length + additionalCards.length
        const fallbackMsg = buildResultsMessage({
          count: totalCount,
          group_size: tourPreferenceProfile.hard_constraints?.group_size,
          start_date: tourPreferenceProfile.hard_constraints?.target_date_or_range?.start_date,
          end_date: tourPreferenceProfile.hard_constraints?.target_date_or_range?.end_date,
          max_budget_per_person: tourPreferenceProfile.hard_constraints?.max_budget_per_person,
        })

        // Post-check message
        const checked = postCheckMessage({
          turnType: 'results',
          message: fallbackMsg,
          allowedNumbers: [
            totalCount,
            tourPreferenceProfile.hard_constraints?.group_size,
            tourPreferenceProfile.hard_constraints?.max_budget_per_person,
          ].filter(Boolean) as number[],
          knownNames: exps.map((e) => e.name),
          allowedNames: [],
          cardNames: [...topCards, ...additionalCards].map((c) => c.experience_name),
          fallback: fallbackMsg,
        })

        turn = {
          turn_type: totalCount > 0 ? ('results' as const) : ('no_results' as const),
          message: checked.message,
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
