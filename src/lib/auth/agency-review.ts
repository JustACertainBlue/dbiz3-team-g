import { objectExists } from '@/lib/storage/object-store'
import { randomUUID } from 'node:crypto'
import type { SessionContext } from './session'
import { demoRepository } from '../db/application-store'
import { authDelivery, issueResubmission, type Delivery } from './lifecycle'

const CHANGE_RMI_NEXT_STEP = 'Yêu cầu thay đổi này đã đóng. Vui lòng bổ sung theo góp ý của HDT và gửi thay đổi mới từ hồ sơ Agency.'

function authorize(session: SessionContext) {
  if (!session.authenticated || session.role !== 'ADMIN' || session.adminType !== 'HDT' || !session.permissions.includes('manage_users')) throw new Error('FORBIDDEN')
}
export async function agencyReviews(session: SessionContext) {
  authorize(session)
  const repo = demoRepository()
  const registrations = (await Promise.all((await repo.all('agency_registration_requests')).map(async row => {
    const version = (await repo.find('registration_submission_versions', item => item.registration_request_id === row.registration_request_id && item.version_no === row.current_version_no))
    return { id: row.registration_request_id, kind: 'registration', name: version?.company_name || row.email, status: row.current_status, submitted: version?.submitted_at || row.created_at, fields: version ? Object.fromEntries(Object.entries(version).filter(([key]) => !['submitted_by','registration_request_id'].includes(key))) : {}, account: (await repo.find('user_accounts', item => item.user_id === row.agency_user_id)), history: (await repo.all('agency_review_records')).filter(item => item.registration_request_id === row.registration_request_id), documents: (await Promise.all((await repo.all('registration_documents')).filter(item => item.registration_request_id === row.registration_request_id && item.version_no === row.current_version_no).map(async item => { const file = (await repo.find('stored_files', file => file.file_id === item.file_id)); return { type: item.document_type, name: file?.file_name || 'Tài liệu chưa có file', available: Boolean(file && /^[0-9a-f-]{36}$/i.test(file.file_id) && file.storage_key === 'registration-documents/' + file.file_id && (await objectExists(file.storage_key))), href: file ? '/api/auth/agency-reviews/documents/' + file.file_id : null } }))) }
  })))
  const changes = (await Promise.all((await repo.all('agency_major_change_requests')).map(async row => {
    const profile = (await repo.find('agency_profiles', item => item.agency_id === row.agency_id))
    return { id: row.major_change_id, kind: 'change', name: profile?.company_name || row.agency_id, status: row.review_status, submitted: row.submitted_at, fields: { company_name: profile?.company_name || '', tax_id: profile?.tax_id || '', proposed_company_name: row.proposed_company_name, proposed_tax_id: row.proposed_tax_id }, account: (await repo.find('user_accounts', item => item.user_id === profile?.user_id)), history: (await repo.all('agency_review_records')).filter(item => item.major_change_id === row.major_change_id), documents: [] }
  })))
  return [...registrations, ...changes].map(({ account, ...item }) => ({ ...item, account: account ? { email: account.email, status: account.account_status, name: account.full_name, created_at: account.created_at, last_login: account.last_login } : null }))
}
export async function reviewAgency(session: SessionContext, id: string, kind: string, decision: string, comment: string, delivery?: Delivery) {
  authorize(session)
  if (!['Approve','Reject','Request More Information'].includes(decision) || (decision !== 'Approve' && !comment.trim())) throw new Error('INVALID_REVIEW')
  const now = new Date().toISOString()
  return (await demoRepository().transaction(["agency_major_change_requests","agency_profiles","agency_registration_requests","user_accounts","agency_review_records","registration_resubmission_tokens","notifications","audit_logs"], tables => {
    const table = (name: string) => tables[name] ??= []
    let recipient = '', version = '', delivered = false
    if (kind === 'change') {
      const change = table('agency_major_change_requests').find(row => row.major_change_id === id && row.review_status === 'Pending Review')
      if (!change) throw new Error('STALE_REVIEW')
      const profile = table('agency_profiles').find(row => row.agency_id === change.agency_id)
      if (!profile) throw new Error('MISSING_PROFILE')
      recipient = profile.user_id
      if (decision === 'Approve') {
        if (change.proposed_tax_id && table('agency_profiles').some(row => row.agency_id !== profile.agency_id && row.tax_id === change.proposed_tax_id)) throw new Error('DUPLICATE_TAX_ID')
        if (change.proposed_company_name) profile.company_name = change.proposed_company_name
        if (change.proposed_tax_id) profile.tax_id = change.proposed_tax_id
        profile.updated_at = now
      }
      // spec-AUT FR-018 (#57, #83): Request More Information closes a major change like Reject; the decision record
      // keeps "Request More Information" and the Agency submits a new change. Closed changes carry reviewed_at.
      change.review_status = decision === 'Approve' ? 'Approved' : 'Rejected'
      change.reviewed_at = now
    } else if (kind === 'registration') {
      const registration = table('agency_registration_requests').find(row => row.registration_request_id === id && row.current_status === 'Pending Approval')
      if (!registration) throw new Error('STALE_REVIEW')
      const account = table('user_accounts').find(row => row.user_id === registration.agency_user_id)
      if (!account) throw new Error('AUTH_SETUP_REQUIRED')
      recipient = account.user_id; version = registration.current_version_no
      const lastReview = table('agency_review_records').filter(row => row.registration_request_id === id && row.registration_version_no === version).sort((a,b) => b.decided_at.localeCompare(a.decided_at))[0]
      if (lastReview?.decision === 'Request More Information' && decision !== 'Request More Information') throw new Error('STALE_REVIEW')
      if (decision === 'Request More Information') {
        if (delivery || (process.env.NODE_ENV !== 'production' && process.env.HAB_EMAIL_MODE === 'dev-outbox')) {
          issueResubmission(tables, id, delivery ?? authDelivery()); delivered = true
        }
      } else {
        registration.current_status = decision === 'Approve' ? 'Approved' : 'Rejected'
        account.account_status = registration.current_status; account.updated_at = now
        for (const token of table('registration_resubmission_tokens')) if (token.registration_request_id === id && !token.used_at) token.invalidated_at = now
      }
      registration.updated_at = now
    } else throw new Error('INVALID_REVIEW')
    table('agency_review_records').push({ review_id: randomUUID(), registration_request_id: kind === 'registration' ? id : '', registration_version_no: version, major_change_id: kind === 'change' ? id : '', hdt_user_id: session.userId!, decision, comments: comment.trim(), decided_at: now })
    table('notifications').push({ notification_id: randomUUID(), recipient_user_id: recipient, event_type: 'Registration Reviewed', source_type: kind === 'change' ? 'AgencyMajorChange' : 'AgencyRegistration', source_id: id, payload: JSON.stringify(kind === 'change' && decision === 'Request More Information' ? { decision, comment, next_step: CHANGE_RMI_NEXT_STEP } : { decision, comment }), created_at: now, read_at: '', email_delivery_status: 'Fail' })
    table('audit_logs').push({ audit_id: randomUUID(), actor_user_id: session.userId!, action: 'REVIEW_AGENCY', target_type: kind, target_id: id, occurred_at: now, change_or_result: JSON.stringify({ decision, comment }) })
    return { success: true, email_delivery_status: delivered ? 'Dev outbox' : 'Not configured', in_app_status: 'Success' }
  }))
}
