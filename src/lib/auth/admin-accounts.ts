import { filterAsync } from '@/lib/db/async-collections'
import { randomUUID } from 'node:crypto'
import type { SessionContext } from './session'
import { demoRepository } from '../db/application-store'
import type { DemoRow } from '../demo/types'
import { DEFAULT_DISABLE_REASON } from './disable-reason'

async function allowed(session: SessionContext, account: DemoRow) {
  if (!session.authenticated || session.role !== 'ADMIN' || !session.permissions.includes('manage_users')) return false
  if (session.adminType === 'HDT') return true
  return account.role_code === 'Local_Provider' && Boolean(session.assignedVillageId) && Boolean((await demoRepository().find('provider_profiles', row => row.user_id === account.user_id && row.village_id === session.assignedVillageId)))
}
export async function listAccounts(session: SessionContext) {
  if (!session.authenticated || session.role !== 'ADMIN' || !session.permissions.includes('manage_users')) throw new Error('FORBIDDEN')
  const repo = demoRepository()
  return (await Promise.all((await filterAsync((await repo.all('user_accounts')),async account => (await allowed(session, account)))).map(async account => {
    const agency = (await repo.find('agency_profiles', row => row.user_id === account.user_id))
    const provider = (await repo.find('provider_profiles', row => row.user_id === account.user_id))
    const version = provider && (await repo.find('provider_profile_versions', row => row.provider_id === provider.provider_id && row.version_no === provider.current_version_no))
    const assignment = (await repo.find('ubnd_village_assignments', row => row.ubnd_user_id === account.user_id))
    const village = assignment && (await repo.find('villages', row => row.village_id === assignment.village_id))
    return { user_id: account.user_id, name: account.full_name, email: account.email, role: account.role_code, admin_type: account.admin_type, status: account.account_status, organization: agency?.company_name || version?.business_name || (account.admin_type === 'HDT' ? 'Sở Du lịch Hà Nội' : account.admin_type === 'UBND' ? `UBND — ${village?.name || ''}` : 'Chưa có hồ sơ'), last_login: account.last_login || null, created_date: account.created_at, provider_id: provider?.provider_id, agency_id: agency?.agency_id }
  })))
}
// #160: optional disable reason (spec-AUT FR-022); empty or missing → the default text.
export async function accountAction(session: SessionContext, userId: string, action: unknown, reason?: unknown) {
  const repo = demoRepository()
  const target = (await repo.find('user_accounts', row => row.user_id === userId))
  if (!target || !(await allowed(session, target))) throw new Error('FORBIDDEN')
  if (action === 'reset_password') throw new Error('EMAIL_NOT_CONFIGURED')
  if (action !== 'enable' && action !== 'disable') throw new Error('INVALID_ACTION')
  if (reason !== undefined && reason !== null && typeof reason !== 'string') throw new Error('INVALID_REASON')
  const disableReason = (typeof reason === 'string' && reason.trim()) || DEFAULT_DISABLE_REASON
  return (await repo.transaction(["user_accounts","provider_profiles","account_status_history","audit_logs","sessions","notifications"], tables => {
    const table = (name: string) => tables[name] ??= []
    const account = table('user_accounts').find(row => row.user_id === userId)!
    if (session.adminType !== 'HDT' && !table('provider_profiles').some(row => row.user_id === userId && row.village_id === session.assignedVillageId && account.role_code === 'Local_Provider')) throw new Error('FORBIDDEN')
    const histories = table('account_status_history').filter(row => row.user_id === userId && row.to_status === 'Disabled').sort((a,b) => b.changed_at.localeCompare(a.changed_at))
    const audits = table('audit_logs').filter(row => row.target_id === userId && row.action === 'DISABLE_ACCOUNT').sort((a,b) => b.occurred_at.localeCompare(a.occurred_at))
    const previous = histories[0]?.from_status || (audits[0] ? JSON.parse(audits[0].change_or_result).previous_status as string : null)
    if (action === 'enable' && (account.account_status !== 'Disabled' || !previous || previous === 'Disabled')) throw new Error('NO_PREVIOUS_STATUS')
    if (action === 'disable' && account.account_status === 'Disabled') throw new Error('ALREADY_DISABLED')
    const before = account.account_status, status = action === 'disable' ? 'Disabled' : previous!, now = new Date().toISOString()
    account.account_status = status; account.updated_at = now
    for (const row of table('sessions')) if (action === 'disable' && row.user_id === userId && !row.revoked_at) row.revoked_at = now
    table('account_status_history').push({ history_id: randomUUID(), user_id: userId, from_status: before, to_status: status, changed_by: session.userId!, changed_at: now, reason: action === 'disable' ? disableReason : 'Restored previous status' })
    table('audit_logs').push({ audit_id: randomUUID(), actor_user_id: session.userId!, action: action === 'disable' ? 'DISABLE_ACCOUNT' : 'ENABLE_ACCOUNT', target_type: 'UserAccount', target_id: userId, occurred_at: now, change_or_result: JSON.stringify({ previous_status: before, status }) })
    table('notifications').push({ notification_id: randomUUID(), recipient_user_id: userId, event_type: 'Account Status Changed', source_type: 'UserAccount', source_id: userId, payload: JSON.stringify({ status }), created_at: now, read_at: '', email_delivery_status: 'Fail' })
    return { account_status: status }
  }))
}
