import { guestSession, type MockSession } from '../../../../../tests/prf/helpers/mockSession'
import { createExperience, ExperienceError } from '@/lib/prf/experience-service'
import { ZodError } from 'zod'

export async function POST(req: Request): Promise<Response> {
  try {
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
