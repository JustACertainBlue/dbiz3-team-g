import { redirect } from 'next/navigation'
import { currentServerSession } from '@/lib/auth/server-session'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const session = currentServerSession()
  if (!session.authenticated) redirect('/login')
  if (session.role === 'Local_Provider' && session.providerId) redirect(`/provider/${session.providerId}/dashboard`)
  if (session.role === 'ADMIN') redirect(session.adminType === 'UBND' ? '/admin/providers' : '/admin')
  redirect('/explore')
}
