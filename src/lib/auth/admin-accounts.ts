import { randomUUID } from 'node:crypto'
import type { SessionContext } from './session'
import { demoRepository } from '../demo/json-repository'
import type { DemoRow } from '../demo/types'

function allowed(session: SessionContext, account: DemoRow) {
  if (!session.authenticated || session.role !== 'ADMIN' || !session.permissions.includes('manage_users')) return false
  if (session.adminType === 'HDT') return true
  return account.role_code === 'Local_Provider' && Boolean(session.assignedVillageId) && Boolean(demoRepository().find('provider_profiles', row => row.user_id === account.user_id && row.village_id === session.assignedVillageId))
}
export function listAccounts(session: SessionContext) {
  if (!session.authenticated || session.role !== 'ADMIN' || !session.permissions.includes('manage_users')) throw new Error('FORBIDDEN')
  const repo = demoRepository()
  return repo.all('user_accounts').filter(account => allowed(session, account)).map(account => {
    const agency = repo.find('agency_profiles', row => row.user_id === account.user_id)
    const provider = repo.find('provider_profiles', row => row.user_id === account.user_id)
    const version = provider && repo.find('provider_profile_versions', row => row.provider_id === provider.provider_id && row.version_no === provider.current_version_no)
    const assignment = repo.find('ubnd_village_assignments', row => row.ubnd_user_id === account.user_id)
    const village = assignment && repo.find('villages', row => row.village_id === assignment.village_id)
    return { user_id: account.user_id, name: account.full_name, email: account.email, role: account.role_code, admin_type: account.admin_type, status: account.account_status, organization: agency?.company_name || version?.business_name || (account.admin_type === 'HDT' ? 'Sở Du lịch Hà Nội' : account.admin_type === 'UBND' ? `UBND — ${village?.name || ''}` : 'Chưa có hồ sơ'), last_login: account.last_login, created_date: account.created_at, provider_id: provider?.provider_id, agency_id: agency?.agency_id }
  })
}
export function accountAction(session: SessionContext, userId: string, action: unknown) {
  const repo = demoRepository()
  const account = repo.find('user_accounts', row => row.user_id === userId)
  if (!account || !allowed(session, account)) throw new Error('FORBIDDEN')
  if (action === 'reset_password') throw new Error('EMAIL_NOT_CONFIGURED')
  if (action !== 'enable' && action !== 'disable') throw new Error('INVALID_ACTION')
  const audits = repo.all('audit_logs').filter(row => row.target_id === userId && row.action === 'DISABLE_ACCOUNT').sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
  const previous = audits[0] ? JSON.parse(audits[0].change_or_result).previous_status as string : null
  if (action === 'enable' && (account.account_status !== 'Disabled' || !previous || previous === 'Disabled')) throw new Error('NO_PREVIOUS_STATUS')
  if (action === 'disable' && account.account_status === 'Disabled') throw new Error('ALREADY_DISABLED')
  const now = new Date().toISOString()
  const status = action === 'disable' ? 'Disabled' : previous!
  repo.applyBatch([
    { table: 'user_accounts', match: row => row.user_id === userId, changes: { account_status: status, updated_at: now } },
    ...repo.all('sessions').filter(row => action === 'disable' && row.user_id === userId && !row.revoked_at).map(row => ({ table: 'sessions', match: (sessionRow: DemoRow) => sessionRow.session_id === row.session_id, changes: { revoked_at: now } })),
    { table: 'audit_logs', row: { audit_id: randomUUID(), actor_user_id: session.userId!, action: action === 'disable' ? 'DISABLE_ACCOUNT' : 'ENABLE_ACCOUNT', target_type: 'UserAccount', target_id: userId, occurred_at: now, change_or_result: JSON.stringify({ previous_status: account.account_status, status }) } },
    { table: 'notifications', row: { notification_id: randomUUID(), recipient_user_id: userId, event_type: 'Account Status Changed', source_type: 'UserAccount', source_id: userId, payload: JSON.stringify({ status }), created_at: now, read_at: '', email_delivery_status: 'Fail' } },
  ])
  return { account_status: status }
}
