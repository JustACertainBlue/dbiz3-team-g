import { demoSessionFromRequest } from '@/lib/auth/demo-session'
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
  try {
    const resolved = await Promise.resolve(params)
    const session = demoSessionFromRequest(req)
    const profile = await getAgencyProfile(resolved.agencyId, session)
    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const status = error instanceof AgencyError ? error.statusCode : 500
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { agencyId: string } | Promise<{ agencyId: string }> },
): Promise<Response> {
  try {
    const resolved = await Promise.resolve(params)
    const session = demoSessionFromRequest(req)

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
