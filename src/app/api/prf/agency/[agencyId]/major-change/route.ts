import { demoSessionFromRequest } from '@/lib/auth/demo-session'

export async function POST(
  req: Request,
  { params }: { params: { agencyId: string } | Promise<{ agencyId: string }> },
): Promise<Response> {
  const resolved = await Promise.resolve(params)
  const session = demoSessionFromRequest(req)
  if (!session.authenticated || session.role !== 'TourAgency' || session.agencyId !== resolved.agencyId) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return new Response(
    JSON.stringify({
      success: true,
      agency_id: resolved.agencyId,
      message: 'Major change review request created for HDT',
    }),
    {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}
