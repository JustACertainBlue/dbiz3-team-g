import { sessionContextFromRequest } from '@/lib/auth/session'
import {
  getExperienceById,
  updateExperience,
  deleteExperience,
  ExperienceError,
} from '@/lib/prf/experience-service'
import { ZodError } from 'zod'
import { demoRepository } from '@/lib/db/application-store'

export async function GET(
  req: Request,
  { params }: { params: { experienceId: string } | Promise<{ experienceId: string }> },
): Promise<Response> {
  const resolved = await Promise.resolve(params)
  const session=(await sessionContextFromRequest(req))
  if(!session.authenticated || session.role!=='Local_Provider')return new Response(JSON.stringify({error:'Chỉ chủ xưởng được xem thông tin quản lý.'}),{status:403})
  const stored=(await demoRepository().find('experiences',row=>row.experience_id===resolved.experienceId))
  if(!stored || stored.provider_id!==session.providerId)return new Response(JSON.stringify({error:'Không tìm thấy trải nghiệm của xưởng.'}),{status:404})
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
    const session = (await sessionContextFromRequest(req))

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
    const session = (await sessionContextFromRequest(req))

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
