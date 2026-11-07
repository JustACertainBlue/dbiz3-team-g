import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { ownAccount, updateOwnAccount } from '@/lib/auth/account-service'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try { return NextResponse.json({ data: (await ownAccount((await sessionContextFromRequest(request)))) }) }
  catch { return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 }) }
}
export async function PATCH(request: Request) {
  const session = (await sessionContextFromRequest(request))
  if (!session.authenticated) return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 })
  try { return NextResponse.json({ data: (await updateOwnAccount(session, await request.json())) }) }
  catch { return NextResponse.json({ error: 'Kiểm tra họ tên (tối đa 100 ký tự), chức danh và số điện thoại (10–15 chữ số).' }, { status: 400 }) }
}
