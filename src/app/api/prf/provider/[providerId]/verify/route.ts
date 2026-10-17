import { guestSession, type MockSession } from '../../../../../../../tests/prf/helpers/mockSession'
import {
  reviewProvider,
  ProviderNotFoundError,
  ForbiddenError,
} from '@/lib/prf/provider-service'
import { VerifyProviderSchema } from '@/lib/prf/validators'
import { ZodError } from 'zod'

export async function POST(
  req: Request,
  { params }: { params: { providerId: string } | Promise<{ providerId: string }> },
): Promise<Response> {
  try {
    const resolvedParams = await Promise.resolve(params)
    const providerId = resolvedParams.providerId

    let session: MockSession = guestSession()
    const sessionHeader = req.headers.get('x-mock-session')
    if (sessionHeader) {
      try {
        session = JSON.parse(sessionHeader)
      } catch {
        session = guestSession()
      }
    }

    let body: unknown = {}
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const parsed = VerifyProviderSchema.parse(body)
    const result = await reviewProvider(
      providerId,
      session,
      parsed.decision,
      parsed.revision_comments,
    )

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return new Response(JSON.stringify({ error: 'Validation Error', issues: error.issues }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (error instanceof ForbiddenError || (error as { statusCode?: number }).statusCode === 403) {
      return new Response(JSON.stringify({ error: (error as Error).message || 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (
      error instanceof ProviderNotFoundError ||
      (error as { statusCode?: number }).statusCode === 404
    ) {
      return new Response(JSON.stringify({ error: 'Provider not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if ((error as { statusCode?: number }).statusCode === 400) {
      return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
