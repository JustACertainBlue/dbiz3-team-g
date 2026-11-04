/**
 * A6: Pending Verification items for ADM079, read from the shared runtime (Constitution I).
 * Providers: provider_profiles.verification_status = Pending Verification (name and submitted_at from the
 * current profile version). Agencies: agency_registration_requests.current_status = Pending Approval
 * (company name from the latest registration_submission_versions row). Read-only (BR-012).
 */
import { demoRepository } from '@/lib/demo/json-repository'
import { resolveAdminScope, SessionLike } from './scope-guard'

export interface PendingVerificationItem {
  kind: 'Provider' | 'Agency'
  id: string
  name: string
  villageId: string | null
  submittedAt: string
}

export async function listPendingVerification(
  session: SessionLike,
  requestedVillageId: string | null = null
): Promise<PendingVerificationItem[]> {
  const scope = resolveAdminScope(session, requestedVillageId)
  const repository = demoRepository()

  const providers: PendingVerificationItem[] = repository.all('provider_profiles')
    .filter(p => p.verification_status === 'Pending Verification')
    .filter(p => !scope.effectiveVillageId || p.village_id === scope.effectiveVillageId)
    .map(p => {
      const version = repository.find('provider_profile_versions', v => v.provider_id === p.provider_id && v.version_no === p.current_version_no)
      return { kind: 'Provider' as const, id: p.provider_id, name: version?.business_name || p.provider_id, villageId: p.village_id, submittedAt: version?.submitted_at || '' }
    })
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))

  // Agencies are not tied to a village, so they are listed only in the platform-wide (All Villages) view.
  const agencies: PendingVerificationItem[] = scope.effectiveVillageId ? [] : repository.all('agency_registration_requests')
    .filter(r => r.current_status === 'Pending Approval')
    .map(r => {
      const latest = repository.all('registration_submission_versions')
        .filter(v => v.registration_request_id === r.registration_request_id)
        .sort((a, b) => Number(b.version_no) - Number(a.version_no))[0]
      return { kind: 'Agency' as const, id: r.registration_request_id, name: latest?.company_name || r.registration_request_id, villageId: null, submittedAt: latest?.submitted_at || r.created_at }
    })
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))

  return [...providers, ...agencies]
}
