import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { addMessage, getMatchingSession, getMessages, withMatchingSessionWriteLock } from '@/lib/matching/session-service'
import { extractTourContext, buildTourPreferenceProfile } from '@/lib/ai/extractor'
import { AiServiceUnavailableError, ConversationalAiService } from '@/lib/ai/llm-service'
import { runLlmTurn } from '@/lib/ai/llm-turn'
import { isProductionRuntime } from '@/lib/ai/runtime-mode'

const AI_UNAVAILABLE_BODY = {
  error_code: 'AI_SERVICE_UNAVAILABLE',
  message: "Temporary AI Failure — we couldn't process your request right now. Your conversation is saved.",
  user_message: 'Dịch vụ AI đang tạm gián đoạn. Cuộc trò chuyện của bạn đã được lưu, bạn bấm Thử lại sau ít phút.',
  retry_available: true,
}

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

async function handlePost(
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

    // With AI credentials configured, every request goes through the language model and a failure is a
    // 503: there is no silent fallback to rules. In production, missing credentials are also a 503.
    // In development and test without credentials the route keeps the existing rule-based extractor.
    const configured = ConversationalAiService.isConfigured()
    if (!configured && isProductionRuntime()) {
      console.error('[AIT] AI provider credentials are not configured (Cloudflare Workers AI / OpenRouter). Returning 503; production never falls back to rules.')
      return NextResponse.json(AI_UNAVAILABLE_BODY, { status: 503 })
    }
    if (configured) {
      try {
        const turn = await runLlmTurn(params.id, allMessages)
        return NextResponse.json({ message, ...turn }, { status: isRetry ? 200 : 201 })
      } catch (error) {
        if (!(error instanceof AiServiceUnavailableError)) throw error
        return NextResponse.json(AI_UNAVAILABLE_BODY, { status: 503 })
      }
    }

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

    return NextResponse.json({
      message,
      extraction,
      tour_preference_profile: tourPreferenceProfile,
    }, { status: isRetry ? 200 : 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 400 })
  }
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  return withMatchingSessionWriteLock(context.params.id, () => handlePost(request, context))
}
