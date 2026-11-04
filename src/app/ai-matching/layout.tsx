import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DEMO_SESSION_COOKIE, demoSessionFor } from '@/lib/auth/demo-session'
import { aiMatchingAccess } from './ai-matching-access'

// BR-002, #28: a Guest opening AIT121 is redirected to Login before the page renders.
export default function AiMatchingLayout({ children }: { children: React.ReactNode }) {
  const session = demoSessionFor(cookies().get(DEMO_SESSION_COOKIE)?.value)
  if (aiMatchingAccess(session) === 'redirect-login') redirect('/login')
  return children
}
