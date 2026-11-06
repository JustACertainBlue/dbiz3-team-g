import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { addMessage, getMatchingSession, getMessages } from '@/lib/matching/session-service'
import { extractTourContext, buildTourPreferenceProfile } from '@/lib/ai/extractor'

async function authorize(request: Request, sessionId: string) {
  const actor = sessionContextFromRequest(request)
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

    return NextResponse.json({
      message,
      extraction,
      tour_preference_profile: tourPreferenceProfile,
    }, { status: isRetry ? 200 : 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 400 })
  }
}
