import { authResult } from '@/lib/auth/api-result'
import { requestPasswordReset } from '@/lib/auth/lifecycle'
export async function POST(request: Request) { return (await authResult(async () => (await requestPasswordReset((await request.json()).email)))) }
