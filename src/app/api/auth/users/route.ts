import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { listAccounts, accountAction } from '@/lib/auth/admin-accounts'
export const dynamic = 'force-dynamic'
export function GET(request: Request) {
  try { return NextResponse.json({ data: listAccounts(sessionContextFromRequest(request)) }) }
  catch { return NextResponse.json({ error: 'Không có quyền quản lý tài khoản.' }, { status: 403 }) }
}
export async function PATCH(request: Request) {
  try { const body = await request.json(); return NextResponse.json({ data: accountAction(sessionContextFromRequest(request), body.user_id, body.action) }) }
  catch (cause) { const code = cause instanceof Error ? cause.message : 'INVALID_ACTION'; return NextResponse.json({ error: code === 'EMAIL_NOT_CONFIGURED' ? 'Chưa cấu hình dịch vụ email để gửi mật khẩu tạm.' : code === 'NO_PREVIOUS_STATUS' ? 'Không có lịch sử trạng thái trước khi khóa. Cần kiểm tra tài khoản trước khi mở.' : 'Không thể thực hiện thao tác với tài khoản này.' }, { status: code === 'FORBIDDEN' ? 403 : 400 }) }
}
