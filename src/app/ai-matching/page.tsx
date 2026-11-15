import { currentServerSession } from '@/lib/auth/server-session'
import { aiMatchingAccess } from './ai-matching-access'
import AiMatchingClient from './AiMatchingClient'

/** Resolve the initial UI state on the server; API handlers remain the auth authority. */
export default async function AiMatchingPage() {
  try {
    const session = await currentServerSession()
    const access = aiMatchingAccess(session)
    const isAgency = access === 'allow'

    return (
      <AiMatchingClient
        initialRole={isAgency ? 'agency' : 'guest'}
        initialAgencyId={isAgency ? session.agencyId ?? undefined : undefined}
      />
    )
  } catch (error) {
    console.error('Unable to resolve the AI matching session on the server', error)
    return <AiMatchingClient initialRole="loading" />
  }
}
