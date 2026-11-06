import type { SessionContext } from './session'
import { demoRepository } from '../demo/json-repository'

export function ownAccount(session: SessionContext) {
  if (!session.authenticated || !session.userId) throw new Error('UNAUTHENTICATED')
  const row = demoRepository().find('user_accounts', account => account.user_id === session.userId)
  if (!row) throw new Error('UNAUTHENTICATED')
  const repo = demoRepository()
  const agency = session.agencyId ? repo.find('agency_profiles', item => item.agency_id === session.agencyId) : undefined
  const provider = session.providerId ? repo.find('provider_profiles', item => item.provider_id === session.providerId) : undefined
  const version = provider ? repo.find('provider_profile_versions', item => item.provider_id === provider.provider_id && item.version_no === provider.current_version_no) : undefined
  return { full_name: row.full_name, title: row.title, phone: row.phone, email: row.email, role: session.role, admin_type: session.adminType, data_scope: session.dataScope, organization: agency?.company_name || version?.business_name || '', business_href: session.agencyId ? `/agency/${session.agencyId}` : session.providerId ? `/provider/${session.providerId}` : null }
}

export function updateOwnAccount(session: SessionContext, input: Record<string, unknown>) {
  ownAccount(session)
  const full_name = typeof input.full_name === 'string' ? input.full_name.trim() : ''
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const phone = typeof input.phone === 'string' ? input.phone.trim() : ''
  if (!full_name || full_name.length > 100 || !title || !/^\+?\d{10,15}$/.test(phone)) throw new Error('INVALID_ACCOUNT')
  demoRepository().update('user_accounts', row => row.user_id === session.userId, { full_name, title, phone, updated_at: new Date().toISOString() })
  return ownAccount(session)
}
