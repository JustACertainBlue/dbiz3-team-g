import { NextResponse } from 'next/server'
import { addMessage, getMessages } from '@/lib/matching/session-service'
import { extractTourContext, buildTourPreferenceProfile } from '@/lib/ai/extractor'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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
    const body = await request.json()
    const sender = body.sender || 'Agency'
    const text = body.text || ''

    const message = await addMessage(params.id, sender, text)
    const allMessages = await getMessages(params.id)

    const extraction = await extractTourContext({
      sessionId: params.id,
      messages: allMessages,
    })

    let tourPreferenceProfile = null
    if (extraction.is_complete) {
      tourPreferenceProfile = await buildTourPreferenceProfile(extraction.tour_context)
    }

    return NextResponse.json({
      message,
      extraction,
      tour_preference_profile: tourPreferenceProfile,
    }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 400 })
  }
}
