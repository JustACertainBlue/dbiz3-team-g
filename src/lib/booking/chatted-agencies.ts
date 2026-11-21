import { demoRepository } from '../db/application-store'

export interface ChattedAgency { agency_id: string; company_name: string }

// Screen 35 offers only Tour Agencies that already have a Chat (any status) with this Provider and whose
// account is Approved (UI v3 decision #1; createBooking enforces the same rule).
export async function chattedAgencies(providerId: string): Promise<ChattedAgency[]> {
  const repository = demoRepository()
  const chatted = new Set((await repository.all('chat_sessions')).filter(row => row.provider_id === providerId).map(row => row.agency_id))
  const approved = new Set((await repository.all('user_accounts')).filter(row => row.account_status === 'Approved').map(row => row.user_id))
  return (await repository.all('agency_profiles'))
    .filter(row => chatted.has(row.agency_id) && approved.has(row.user_id))
    .map(row => ({ agency_id: row.agency_id, company_name: row.company_name }))
    .sort((a, b) => a.company_name.localeCompare(b.company_name))
}
