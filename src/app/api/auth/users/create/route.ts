import { authResult } from '@/lib/auth/api-result'
import { createManagedAccount, AuthError } from '@/lib/auth/lifecycle'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { demoRepository } from '@/lib/demo/json-repository'
export function GET(request: Request) { return authResult(() => {
  const session = sessionContextFromRequest(request)
  if (!session.authenticated || session.role !== 'ADMIN' || !session.permissions.includes('manage_users')) throw new AuthError('Forbidden', 403)
  const repo = demoRepository()
  return { kind: session.adminType === 'HDT' ? 'ubnd' : 'provider', email_configured: process.env.NODE_ENV !== 'production' && process.env.HAB_EMAIL_MODE === 'dev-outbox', villages: repo.all('villages').filter(row => row.is_active === 'true' && (session.adminType === 'HDT' ? !repo.find('ubnd_village_assignments', item => item.village_id === row.village_id) : row.village_id === session.assignedVillageId)).map(row => ({ village_id: row.village_id, name: row.name })) }
}) }
export function POST(request: Request) { return authResult(async () => { const body = await request.json(); return createManagedAccount(sessionContextFromRequest(request), body.kind, body) }) }
