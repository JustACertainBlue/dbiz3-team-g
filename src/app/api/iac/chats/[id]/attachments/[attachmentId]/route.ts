import { sessionContextFromRequest } from '@/lib/auth/session'
import { chatErrorResponse } from '@/lib/iac/chat-http'
import { readAttachment } from '@/lib/iac/chat-service'

export const dynamic = 'force-dynamic'

// F-CHAT-05 download (spec-IAC #40): always a download, never rendered inline.
export async function GET(request: Request, { params }: { params: { id: string; attachmentId: string } }) {
  try {
    const file = await readAttachment(sessionContextFromRequest(request), params.id, params.attachmentId)
    return new Response(new Uint8Array(file.bytes), {
      status: 200,
      headers: {
        'content-type': file.file_type,
        'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
        'x-content-type-options': 'nosniff',
        'cache-control': 'private, no-store',
      },
    })
  } catch (error) {
    return chatErrorResponse(error)
  }
}
