import { sessionContextFromRequest } from '@/lib/auth/session'
import { providerCraftLine } from '@/lib/provider/craft-line'

// Read-only line "Gốm sứ · Làng Bát Tràng" for the experience forms (screen 32). Owner only: the forms are the owner's, and the line
// is built from the workshop's unpublished profile too. sessionContextFromRequest already turns a session that must still change its
// temporary password into a guest, so that session gets the same 403 as a guest.
export async function GET(req: Request, { params }: { params: { providerId: string } | Promise<{ providerId: string }> }): Promise<Response> {
  const { providerId } = await Promise.resolve(params)
  const session = await sessionContextFromRequest(req)
  if (!session.authenticated || session.role !== 'Local_Provider' || session.providerId !== providerId) {
    return new Response(JSON.stringify({ error: 'Chỉ chủ xưởng được xem thông tin này.' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }
  return new Response(JSON.stringify({ craft_line: await providerCraftLine(providerId) }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
