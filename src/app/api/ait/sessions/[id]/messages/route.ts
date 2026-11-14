import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { addMessage, getMatchingSession, getMessages } from '@/lib/matching/session-service'
import { extractTourContext, buildTourPreferenceProfile } from '@/lib/ai/extractor'
import { resolveVillageCards, resolveProviderCards, resolveActivityCards, detectCardScope, detectPriceSortPreference } from '@/lib/matching/card-resolver'
import { saveAgencyPreferenceProfile } from '@/lib/preferences/preference-service'
import {
  isTestPrompt,
  resolveTestVillageCards,
  resolveTestProviderCards,
  resolveTestActivityCards,
} from '@/lib/matching/test-dataset'
import { detectExperienceTypes } from '@/lib/matching/craft-taxonomy'

async function authorize(request: Request, sessionId: string) {
  const actor = (await sessionContextFromRequest(request))
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

    // #33: Retry re-analyzes the stored conversation and adds no message.
    const isRetry = body.retry === true
    const message = isRetry ? null : await addMessage(params.id, body.sender || 'Agency', body.text || '')
    const allMessages = await getMessages(params.id)

    const extraction = await extractTourContext({
      sessionId: params.id,
      messages: allMessages,
    })

    // FR-003, BR-017, #27: AI failure keeps the conversation and returns 503 with Retry; no profile.
    if (extraction.processing_status === 'Temporary AI Failure') {
      return NextResponse.json({
        error_code: 'AI_SERVICE_UNAVAILABLE',
        message: "Temporary AI Failure — we couldn't process your request right now. Your conversation is saved.",
        retry_available: true,
      }, { status: 503 })
    }

    const userText = String(body.text || '')
    const isTest = body.is_test === true || isTestPrompt(userText)

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
          target_date_or_range: extraction.tour_context.target_date_or_range || { date: '2026-11-20' },
        },
        matching_attributes: (extraction.tour_context.experience_types || []).map(t => ({ type: 'experience_type', value: t })),
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
      })
      tourPreferenceProfile.price_sort = pricePref
    }

    // Strictly scoped card resolution: only display what user explicitly asked for (e.g. asking for villages shows ONLY village cards)
    const replyText = typeof extraction.conversational_reply === 'string' ? extraction.conversational_reply : ''
    const combined = `${userText} ${replyText}`

    const scope = detectCardScope(userText)

    let activityCards: any[] = []
    let providerCards: any[] = []
    let villageCards: any[] = []

    if (isTest) {
      if (scope === 'village') {
        villageCards = resolveTestVillageCards(combined)
      } else if (scope === 'provider') {
        providerCards = resolveTestProviderCards(combined)
      } else if (scope === 'activity') {
        activityCards = resolveTestActivityCards(combined)
      } else if (scope === 'all') {
        villageCards = resolveTestVillageCards(combined)
        providerCards = resolveTestProviderCards(combined)
        activityCards = resolveTestActivityCards(combined)
      }
    } else {
      if (scope === 'village') {
        villageCards = resolveVillageCards(combined)
      } else if (scope === 'provider') {
        providerCards = resolveProviderCards(combined)
      } else if (scope === 'activity') {
        activityCards = resolveActivityCards(combined)
      } else if (scope === 'all') {
        villageCards = resolveVillageCards(combined)
        providerCards = resolveProviderCards(combined)
        activityCards = resolveActivityCards(combined)
      }
    }

    // Save assistant reply so subsequent turns maintain full bidirectional dialogue context (#33: Retry adds no message)
    if (!isRetry && extraction.conversational_reply && typeof extraction.conversational_reply === 'string') {
      try {
        await addMessage(params.id, 'Assistant', extraction.conversational_reply.slice(0, 2000))
      } catch (e) {
        console.warn('[AIT] Could not save assistant response to message history:', e)
      }
    }

    // Learning loop: Save or update agency preference profile when crafts or villages are detected (skip during test mode)
    if (!isTest && access.actor.agencyId) {
      try {
        const craftsFound: string[] = []
        const textToAnalyze = `${userText} ${replyText}`.toLowerCase()
        const craftKeywords = [
          'gốm', 'lụa', 'mộc', 'mây', 'sơn mài', 'đồng', 'nón', 'bát tràng', 'vạn phúc', 'chàng sơn', 'phú vinh', 'hạ thái', 'đại bái', 'chuông'
        ]
        for (const kw of craftKeywords) {
          if (textToAnalyze.includes(kw)) {
            craftsFound.push(kw)
          }
        }
        if (craftsFound.length > 0 || tourPreferenceProfile) {
          await saveAgencyPreferenceProfile({
            agencyId: access.actor.agencyId,
            sessionId: params.id,
            tourPreferenceProfile: tourPreferenceProfile || {
              matching_attributes: craftsFound,
            },
          })
        }
      } catch (err) {
        console.warn('[AIT] Failed to update preference profile for learning loop:', err)
      }
    }

    return NextResponse.json({
      message,
      is_test: isTest,
      extraction,
      tour_preference_profile: tourPreferenceProfile,
      activity_cards: activityCards,
      village_cards: villageCards,
      provider_cards: providerCards,
    }, { status: isRetry ? 200 : 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 400 })
  }
}
