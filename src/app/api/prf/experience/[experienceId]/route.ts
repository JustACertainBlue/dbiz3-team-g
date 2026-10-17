import { guestSession, type MockSession } from '../../../../../../tests/prf/helpers/mockSession'
import {
  getExperienceById,
  updateExperience,
  deleteExperience,
  ExperienceError,
} from '@/lib/prf/experience-service'
import { ZodError } from 'zod'

export async function GET(
  req: Request,
  { params }: { params: { experienceId: string } | Promise<{ experienceId: string }> },
): Promise<Response> {
  const resolved = await Promise.resolve(params)
  const experience = await getExperienceById(resolved.experienceId)
  return new Response(JSON.stringify(experience), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: { experienceId: string } | Promise<{ experienceId: string }> },
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
    const result = await updateExperience(resolved.experienceId, session, body)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
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

export async function DELETE(
  req: Request,
  { params }: { params: { experienceId: string } | Promise<{ experienceId: string }> },
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

    const result = await deleteExperience(resolved.experienceId, session)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
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
