import { providerCraftLine } from '@/lib/provider/craft-line'

// Read-only line "Gốm sứ · Làng Bát Tràng" for the experience forms (screen 32). Craft and village name are public facts.
export async function GET(_req: Request, { params }: { params: { providerId: string } | Promise<{ providerId: string }> }): Promise<Response> {
  const { providerId } = await Promise.resolve(params)
  return new Response(JSON.stringify({ craft_line: await providerCraftLine(providerId) }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
