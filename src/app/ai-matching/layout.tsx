import React from 'react'
import { redirect } from 'next/navigation'
import { currentServerSession } from '@/lib/auth/server-session'
import { sessionDisplayName } from '@/lib/auth/session'
import { aiMatchingAccess } from './ai-matching-access'
import { AgencyNameProvider } from './agency-name'

// BR-002, #28: a Guest opening AIT121 is redirected to Login before the page renders.
export default async function AiMatchingLayout({ children }: { children: React.ReactNode }) {
  const session = (await currentServerSession())
  const access = aiMatchingAccess(session)
  if (access === 'redirect-login') redirect('/login')
  // The role and the Agency id are known here, so the page never has to ask the browser (no flash of the restricted screen).
  return <AgencyNameProvider name={await sessionDisplayName(session)} role={access === 'allow' ? 'Agency' : 'Guest'} agencyId={session.agencyId ?? ''}>{children}</AgencyNameProvider>
}
