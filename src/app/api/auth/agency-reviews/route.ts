import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { agencyReviews, reviewAgency } from '@/lib/auth/agency-review'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try { return NextResponse.json({ data: (await agencyReviews((await sessionContextFromRequest(request)))) }) }
  catch { return NextResponse.json({ error: 'Chỉ HDT được xem hồ sơ Agency.' }, { status: 403 }) }
}
export async function POST(request: Request) {
  try { const body = await request.json(); return NextResponse.json({ data: (await reviewAgency((await sessionContextFromRequest(request)), body.id, body.kind, body.decision, typeof body.comment === 'string' ? body.comment : '')) }) }
  catch (cause) { const code = cause instanceof Error ? cause.message : ''; return NextResponse.json({ error: code === 'FORBIDDEN' ? 'Không có quyền thẩm định.' : code === 'STALE_REVIEW' ? 'Hồ sơ đã được xử lý hoặc chưa sẵn sàng. Hãy tải lại.' : code === 'AUTH_SETUP_REQUIRED' ? 'Hồ sơ chưa có tài khoản; cần hoàn thiện hệ thống xác thực trước khi duyệt.' : 'Kiểm tra quyết định và nhận xét bắt buộc.' }, { status: code === 'FORBIDDEN' ? 403 : 409 }) }
}
