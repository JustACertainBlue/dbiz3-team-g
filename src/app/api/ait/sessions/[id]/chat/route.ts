import { NextResponse } from 'next/server'
import { openOrReuseChat } from '@/lib/matching/handoff-service'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const agencyId = body.agency_id || request.headers.get('x-account-id') || 'agency-default'
    const providerId = body.provider_id
    const contextMessage = body.context_message || 'Inquiring about tour experience'

    if (!providerId) {
      return NextResponse.json({ error: 'provider_id is required' }, { status: 400 })
    }

    const chatResult = await openOrReuseChat({
      agencyId,
      providerId,
      contextMessage,
    })

    return NextResponse.json(chatResult, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
