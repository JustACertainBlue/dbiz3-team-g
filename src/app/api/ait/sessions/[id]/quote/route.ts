import { NextResponse } from 'next/server'
import { createOrReuseQuoteRequest, openOrReuseChat } from '@/lib/matching/handoff-service'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const agencyId = body.agency_id || request.headers.get('x-account-id') || 'agency-default'
    const experienceId = body.experience_id
    const providerId = body.provider_id

    if (!experienceId) {
      return NextResponse.json({ error: 'experience_id is required' }, { status: 400 })
    }

    const quoteResult = await createOrReuseQuoteRequest({
      agencyId,
      experienceId,
      sessionId: params.id,
    })

    let chatResult = null
    if (providerId) {
      chatResult = await openOrReuseChat({
        agencyId,
        providerId,
        contextMessage: `Quote Request: ${quoteResult.quote_request_id}`,
      })
    }

    return NextResponse.json({
      ...quoteResult,
      chat_session_id: chatResult?.chat_session_id,
    }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
