import { guestSession, type MockSession } from '../../../../../../../tests/prf/helpers/mockSession'

export async function POST(
  req: Request,
  { params }: { params: { agencyId: string } | Promise<{ agencyId: string }> },
): Promise<Response> {
  const resolved = await Promise.resolve(params)
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
