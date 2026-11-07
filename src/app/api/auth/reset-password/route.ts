import { authResult } from '@/lib/auth/api-result'
import { resetPassword } from '@/lib/auth/lifecycle'
export async function POST(request: Request) { return (await authResult(async () => { const body = await request.json(); return (await resetPassword(String(body.token || ''), String(body.new_password || ''), String(body.confirm_password || ''))) })) }
