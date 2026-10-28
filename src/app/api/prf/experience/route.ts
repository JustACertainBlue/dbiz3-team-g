import { demoSessionFromRequest } from '@/lib/auth/demo-session'
import { createExperience, ExperienceError, listProviderExperiences } from '@/lib/prf/experience-service'
import { ZodError } from 'zod'

export async function GET(req: Request): Promise<Response> {
  try {
    const providerId = new URL(req.url).searchParams.get('provider_id')
    if (!providerId) return new Response(JSON.stringify({ error: 'provider_id is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    const result = await listProviderExperiences(providerId, demoSessionFromRequest(req))
    return new Response(JSON.stringify({ experiences: result }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (error: unknown) {
    const status = error instanceof ExperienceError ? error.statusCode : 500
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }), { status, headers: { 'Content-Type': 'application/json' } })
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const session = demoSessionFromRequest(req)

    const body = await req.json()
    const result = await createExperience(session, body)

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return new Response(JSON.stringify({ error: 'Validation Error', issues: error.issues }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (error instanceof ExperienceError) {
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
