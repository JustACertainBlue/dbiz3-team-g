import React from 'react'
import { redirect } from 'next/navigation'
import { currentServerSession } from '@/lib/auth/server-session'
import { sessionDisplayName } from '@/lib/auth/session'
import { aiMatchingAccess } from './ai-matching-access'
import { AgencyNameProvider } from './agency-name'

// BR-002, #28: a Guest opening AIT121 is redirected to Login before the page renders.
export default async function AiMatchingLayout({ children }: { children: React.ReactNode }) {
  const session = (await currentServerSession())
  if (aiMatchingAccess(session) === 'redirect-login') redirect('/login')
  return <AgencyNameProvider name={await sessionDisplayName(session)}>{children}</AgencyNameProvider>
}
