import { authResult } from '@/lib/auth/api-result'
import { requestPasswordReset } from '@/lib/auth/lifecycle'
export function POST(request: Request) { return authResult(async () => requestPasswordReset((await request.json()).email)) }
