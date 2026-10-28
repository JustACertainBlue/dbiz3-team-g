import { demoSessionFromRequest } from '@/lib/auth/demo-session'
import { generateDescriptionDraft, AIError } from '@/lib/prf/ai-service'
import { ZodError } from 'zod'

export async function POST(req: Request): Promise<Response> {
  try {
    const session = demoSessionFromRequest(req)

    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await generateDescriptionDraft(body, session)

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
    if (error instanceof AIError) {
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
