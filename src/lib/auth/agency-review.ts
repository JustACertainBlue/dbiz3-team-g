import { randomUUID } from 'node:crypto'
import type { SessionContext } from './session'
import { demoRepository } from '../demo/json-repository'
import type { BatchOperation } from '../demo/types'

function authorize(session: SessionContext) {
  if (!session.authenticated || session.role !== 'ADMIN' || session.adminType !== 'HDT' || !session.permissions.includes('manage_users')) throw new Error('FORBIDDEN')
}
export function agencyReviews(session: SessionContext) {
  authorize(session)
  const repo = demoRepository()
  const registrations = repo.all('agency_registration_requests').map(row => {
    const version = repo.find('registration_submission_versions', item => item.registration_request_id === row.registration_request_id && item.version_no === row.current_version_no)
    return { id: row.registration_request_id, kind: 'registration', name: version?.company_name || row.email, status: row.current_status, submitted: version?.submitted_at || row.created_at, fields: version ? Object.fromEntries(Object.entries(version).filter(([key]) => !['submitted_by','registration_request_id'].includes(key))) : {}, account: repo.find('user_accounts', item => item.user_id === row.agency_user_id), history: repo.all('agency_review_records').filter(item => item.registration_request_id === row.registration_request_id), documents: repo.all('registration_documents').filter(item => item.registration_request_id === row.registration_request_id && item.version_no === row.current_version_no).map(item => { const file = repo.find('stored_files', file => file.file_id === item.file_id); return { type: item.document_type, name: file?.file_name || 'Tài liệu chưa có file', available: false } }) }
  })
  const changes = repo.all('agency_major_change_requests').map(row => {
    const profile = repo.find('agency_profiles', item => item.agency_id === row.agency_id)
    return { id: row.major_change_id, kind: 'change', name: profile?.company_name || row.agency_id, status: row.review_status, submitted: row.submitted_at, fields: { company_name: profile?.company_name || '', tax_id: profile?.tax_id || '', proposed_company_name: row.proposed_company_name, proposed_tax_id: row.proposed_tax_id }, account: repo.find('user_accounts', item => item.user_id === profile?.user_id), history: repo.all('agency_review_records').filter(item => item.major_change_id === row.major_change_id), documents: [] }
  })
  return [...registrations, ...changes].map(({ account, ...item }) => ({ ...item, account: account ? { email: account.email, status: account.account_status, name: account.full_name, created_at: account.created_at, last_login: account.last_login } : null }))
}
export function reviewAgency(session: SessionContext, id: string, kind: string, decision: string, comment: string) {
  authorize(session)
  if (!['Approve','Reject','Request More Information'].includes(decision) || (decision !== 'Approve' && !comment.trim())) throw new Error('INVALID_REVIEW')
  const repo = demoRepository()
  const now = new Date().toISOString()
  const operations: BatchOperation[] = []
  let recipient = ''
  if (kind === 'change') {
    const change = repo.find('agency_major_change_requests', row => row.major_change_id === id)
    if (!change || change.review_status !== 'Pending Review') throw new Error('STALE_REVIEW')
    const profile = repo.find('agency_profiles', row => row.agency_id === change.agency_id)
    if (!profile) throw new Error('MISSING_PROFILE')
    recipient = profile.user_id
    if (decision === 'Approve') operations.push({ table: 'agency_profiles', match: row => row.agency_id === profile.agency_id, changes: { ...(change.proposed_company_name ? { company_name: change.proposed_company_name } : {}), ...(change.proposed_tax_id ? { tax_id: change.proposed_tax_id } : {}), updated_at: now } })
    operations.push({ table: 'agency_major_change_requests', match: row => row.major_change_id === id && row.review_status === 'Pending Review', changes: { review_status: decision === 'Approve' ? 'Approved' : decision === 'Reject' ? 'Rejected' : 'Request More Information', reviewed_at: now } })
  } else if (kind === 'registration') {
    const registration = repo.find('agency_registration_requests', row => row.registration_request_id === id)
    if (!registration || registration.current_status !== 'Pending Approval') throw new Error('STALE_REVIEW')
    const account = repo.find('user_accounts', row => row.user_id === registration.agency_user_id)
    if (!account) throw new Error('AUTH_SETUP_REQUIRED')
    recipient = account.user_id
    const status = decision === 'Approve' ? 'Approved' : decision === 'Reject' ? 'Rejected' : 'Pending Approval'
    operations.push({ table: 'agency_registration_requests', match: row => row.registration_request_id === id && row.current_status === 'Pending Approval', changes: { current_status: status, updated_at: now } }, { table: 'user_accounts', match: row => row.user_id === recipient, changes: { account_status: status, updated_at: now } })
  } else throw new Error('INVALID_REVIEW')
  const registration = kind === 'registration' ? repo.find('agency_registration_requests', row => row.registration_request_id === id) : undefined
  operations.push(
    { table: 'agency_review_records', row: { review_id: randomUUID(), registration_request_id: kind === 'registration' ? id : '', registration_version_no: registration?.current_version_no || '', major_change_id: kind === 'change' ? id : '', hdt_user_id: session.userId!, decision, comments: comment.trim(), decided_at: now } },
    { table: 'notifications', row: { notification_id: randomUUID(), recipient_user_id: recipient, event_type: 'Agency Review', source_type: kind === 'change' ? 'AgencyMajorChange' : 'AgencyRegistration', source_id: id, payload: JSON.stringify({ decision, comment }), created_at: now, read_at: '', email_delivery_status: 'Fail' } },
    { table: 'audit_logs', row: { audit_id: randomUUID(), actor_user_id: session.userId!, action: 'REVIEW_AGENCY', target_type: kind, target_id: id, occurred_at: now, change_or_result: JSON.stringify({ decision, comment }) } },
  )
  repo.applyBatch(operations)
  return { success: true, email_delivery_status: 'Fail', in_app_status: 'Success' }
}
