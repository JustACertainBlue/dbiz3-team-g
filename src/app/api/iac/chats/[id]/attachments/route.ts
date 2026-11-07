import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { ChatError, requireParticipant } from '@/lib/iac/chat-access'
import type { IncomingFile } from '@/lib/iac/chat-files'
import { chatErrorResponse } from '@/lib/iac/chat-http'
import { sendAttachments } from '@/lib/iac/chat-service'

export const dynamic = 'force-dynamic'

// F-CHAT-05 send attachments: multipart/form-data, one `files` part per file (spec-IAC #39).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = (await sessionContextFromRequest(request))
    ;(await requireParticipant(session, params.id)) // 403 before the body is read (#47)
    const form = await request.formData().catch(() => null)
    if (!form) throw new ChatError('VALIDATION_ERROR', 'Send the files as multipart/form-data')
    const files: IncomingFile[] = []
    for (const part of form.getAll('files')) {
      if (typeof part === 'string') continue
      files.push({ name: part.name, size: part.size, bytes: new Uint8Array(await part.arrayBuffer()) })
    }
    const data = await sendAttachments(session, params.id, files)
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return chatErrorResponse(error)
  }
}
