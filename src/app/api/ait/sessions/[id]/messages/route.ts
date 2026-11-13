import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { addMessage, getMatchingSession, getMessages } from '@/lib/matching/session-service'
import { extractTourContext, buildTourPreferenceProfile } from '@/lib/ai/extractor'
import { resolveVillageCards, resolveProviderCards } from '@/lib/matching/card-resolver'

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

    let tourPreferenceProfile = null
    if (extraction.is_complete) {
      tourPreferenceProfile = await buildTourPreferenceProfile(extraction.tour_context)
    }

    // Resolve rich interactive cards (Village cards, Local Provider cards)
    const userText = String(body.text || '')
    const replyText = typeof extraction.conversational_reply === 'string' ? extraction.conversational_reply : ''
    const combined = `${userText} ${replyText}`

    const providerCards = resolveProviderCards(userText)
    const villageCards = providerCards.length === 0 ? resolveVillageCards(combined) : []

    // Save assistant reply so subsequent turns maintain full bidirectional dialogue context (#33: Retry adds no message)
    if (!isRetry && extraction.conversational_reply && typeof extraction.conversational_reply === 'string') {
      try {
        await addMessage(params.id, 'Assistant', extraction.conversational_reply.slice(0, 2000))
      } catch (e) {
        console.warn('[AIT] Could not save assistant response to message history:', e)
      }
    }

    return NextResponse.json({
      message,
      extraction,
      tour_preference_profile: tourPreferenceProfile,
      village_cards: villageCards,
      provider_cards: providerCards,
    }, { status: isRetry ? 200 : 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 400 })
  }
}
