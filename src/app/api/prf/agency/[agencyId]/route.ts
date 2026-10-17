import { guestSession, type MockSession } from '../../../../../../tests/prf/helpers/mockSession'
import {
  getAgencyProfile,
  updateAgencyProfile,
  AgencyError,
} from '@/lib/prf/agency-service'
import { ZodError } from 'zod'

export async function GET(
  req: Request,
  { params }: { params: { agencyId: string } | Promise<{ agencyId: string }> },
): Promise<Response> {
  const resolved = await Promise.resolve(params)
  let session: MockSession = guestSession()
  const sessionHeader = req.headers.get('x-mock-session')
  if (sessionHeader) {
    try {
      session = JSON.parse(sessionHeader)
    } catch {
      session = guestSession()
    }
  }

  const profile = await getAgencyProfile(resolved.agencyId, session)
  return new Response(JSON.stringify(profile), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: { agencyId: string } | Promise<{ agencyId: string }> },
): Promise<Response> {
  try {
    const resolved = await Promise.resolve(params)
    let session: MockSession = guestSession()
    const sessionHeader = req.headers.get('x-mock-session')
    if (sessionHeader) {
      try {
        session = JSON.parse(sessionHeader)
      } catch {
        session = guestSession()
      }
    }

    const body = await req.json()
    const result = await updateAgencyProfile(resolved.agencyId, session, body)
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
    if (error instanceof AgencyError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
