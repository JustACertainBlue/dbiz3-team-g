import { demoRepository } from '../db/application-store'

export type RegistrationStatus = { status: 'pending' | 'revise' | 'rejected'; reason: string; reviewed_at: string }

/**
 * Screens 18b/18c: what an Agency whose password was just verified is told about its registration.
 * Call only after the password matched (the login route does). Returns only these three fields; null for any other account.
 */
export async function registrationStatusForLogin(email: string): Promise<RegistrationStatus | null> {
  const repo = demoRepository()
  const account = await repo.find('user_accounts', row => row.email.toLowerCase() === email.trim().toLowerCase())
  if (!account || account.role_code !== 'Tour_Agency') return null
  if (account.account_status !== 'Pending Approval' && account.account_status !== 'Rejected') return null
  const request = await repo.find('agency_registration_requests', row => row.agency_user_id === account.user_id)
  const reviews = request
    ? (await repo.all('agency_review_records')).filter(row => row.registration_request_id === request.registration_request_id && row.registration_version_no === request.current_version_no)
      .sort((a, b) => String(b.decided_at).localeCompare(String(a.decided_at)))
    : []
  const last = reviews[0]
  if (account.account_status === 'Rejected') return { status: 'rejected', reason: last?.comments ?? '', reviewed_at: last?.decided_at ?? '' }
  if (request?.current_status === 'Request More Information' || last?.decision === 'Request More Information') return { status: 'revise', reason: last?.comments ?? '', reviewed_at: last?.decided_at ?? '' }
  return { status: 'pending', reason: '', reviewed_at: '' }
}
