import { filterAsync } from '@/lib/db/async-collections'
import { authResult } from '@/lib/auth/api-result'
import { createManagedAccount, AuthError } from '@/lib/auth/lifecycle'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { demoRepository } from '@/lib/db/application-store'
export async function GET(request: Request) { return (await authResult(async () => {
  const session = (await sessionContextFromRequest(request))
  if (!session.authenticated || session.role !== 'ADMIN' || !session.permissions.includes('manage_users')) throw new AuthError('Forbidden', 403)
  const repo = demoRepository()
  return { kind: session.adminType === 'HDT' ? 'ubnd' : 'provider', email_configured: process.env.NODE_ENV !== 'production' && process.env.HAB_EMAIL_MODE === 'dev-outbox', villages: (await filterAsync((await repo.all('villages')),async row => row.is_active === 'true' && (session.adminType === 'HDT' ? !(await repo.find('ubnd_village_assignments', item => item.village_id === row.village_id)) : row.village_id === session.assignedVillageId))).map(row => ({ village_id: row.village_id, name: row.name })) }
})) }
export async function POST(request: Request) { return (await authResult(async () => { const body = await request.json(); return (await createManagedAccount((await sessionContextFromRequest(request)), body.kind, body)) })) }
