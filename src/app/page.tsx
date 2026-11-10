import { redirect } from 'next/navigation'
import { currentServerSession } from '@/lib/auth/server-session'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = (await currentServerSession())
  // #253: a Guest lands on EXP120 Explore; AUT009 is only for restricted actions (screen-spec-AUT009 §1).
  if (!session.authenticated) redirect('/explore')
  if (session.role === 'Local_Provider' && session.providerId) redirect(`/provider/${session.providerId}/dashboard`)
  if (session.role === 'ADMIN') redirect(session.adminType === 'UBND' ? '/admin/providers' : '/admin')
  redirect('/explore')
}
