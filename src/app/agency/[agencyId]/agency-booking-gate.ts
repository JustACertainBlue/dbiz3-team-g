import { cookies } from 'next/headers'
import { DEMO_SESSION_COOKIE, demoSessionFor, type DemoSession } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'

// Gate for BKG137 and SCH141: a Tour Agency on its own agencyId (BR-002, BR-008, #33).
export function agencyPageSession(agencyId: string): DemoSession | null {
  const session = demoSessionFor(cookies().get(DEMO_SESSION_COOKIE)?.value)
  return session.authenticated && session.role === 'TourAgency' && session.agencyId === agencyId ? session : null
}

// Analyze L1: village filter options are the villages of the Agency's own Bookings.
export function ownVillages(agencyId: string): { village_id: string; name: string }[] {
  const repository = demoRepository()
  const villages = new Map<string, string>()
  for (const booking of repository.all('bookings').filter(row => row.agency_id === agencyId)) {
    const provider = repository.find('provider_profiles', row => row.provider_id === booking.provider_id)
    const village = provider && repository.find('villages', row => row.village_id === provider.village_id)
    if (village) villages.set(village.village_id, village.name)
  }
  return [...villages].map(([village_id, name]) => ({ village_id, name })).sort((a, b) => a.name.localeCompare(b.name))
}
