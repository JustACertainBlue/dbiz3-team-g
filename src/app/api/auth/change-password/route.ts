import { authResult } from '@/lib/auth/api-result'
import { changePassword } from '@/lib/auth/lifecycle'
import { sessionContextFromRequest } from '@/lib/auth/session'
export function POST(request: Request) { return authResult(async () => { const body = await request.json(); return changePassword(sessionContextFromRequest(request), String(body.current_password || ''), String(body.new_password || ''), String(body.confirm_password || '')) }) }
