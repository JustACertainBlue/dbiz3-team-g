import { type SessionContext } from '@/lib/auth/session'
import { currentServerSession } from '@/lib/auth/server-session'
import { demoRepository } from '@/lib/db/application-store'

// Gate for BKG137 and SCH141: a Tour Agency on its own agencyId (BR-002, BR-008, #33).
export async function agencyPageSession(agencyId: string): Promise<SessionContext | null> {
  const session = (await currentServerSession())
  return session.authenticated && session.role === 'Tour_Agency' && session.agencyId === agencyId ? session : null
}

// Analyze L1: village filter options are the villages of the Agency's own Bookings.
export async function ownVillages(agencyId: string): Promise<{ village_id: string; name: string }[]> {
  const repository = demoRepository()
  const villages = new Map<string, string>()
  for (const booking of (await repository.all('bookings')).filter(row => row.agency_id === agencyId)) {
    const provider = (await repository.find('provider_profiles', row => row.provider_id === booking.provider_id))
    const village = provider && (await repository.find('villages', row => row.village_id === provider.village_id))
    if (village) villages.set(village.village_id, village.name)
  }
  return [...villages].map(([village_id, name]) => ({ village_id, name })).sort((a, b) => a.name.localeCompare(b.name))
}
