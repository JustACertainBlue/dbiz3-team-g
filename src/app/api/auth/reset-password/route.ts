import { authResult } from '@/lib/auth/api-result'
import { resetPassword } from '@/lib/auth/lifecycle'
export function POST(request: Request) { return authResult(async () => { const body = await request.json(); return resetPassword(String(body.token || ''), String(body.new_password || ''), String(body.confirm_password || '')) }) }
