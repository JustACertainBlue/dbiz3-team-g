import { NextRequest, NextResponse } from 'next/server'
import { loadAgencies, loadProviders } from '@/lib/db/seed-loader'
import { SessionLike } from '@/lib/adm/scope-guard'
import { adminSessionFromRequest } from '@/lib/adm/admin-session'
import { FilterOptionsResponse } from '@/lib/adm/types'

const getSessionFromRequest = adminSessionFromRequest

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session || !session.authenticated) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 }
    )
  }

  const role = session.role ?? ''
  const adminType = session.adminType ?? (role === 'HDT' ? 'HDT' : role === 'UBND' ? 'UBND' : null)
  const isAuthorizedAdmin = (role === 'ADMIN' || role === 'HDT' || role === 'UBND') && (adminType === 'HDT' || adminType === 'UBND')

  if (!isAuthorizedAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Admin privileges required.' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'agency'
  const query = (searchParams.get('query') || '').toLowerCase()

  if (type === 'provider') {
    const allProviders = await loadProviders()
    let scoped = allProviders

    if (adminType === 'UBND' && session.villageId) {
      scoped = allProviders.filter(p => p.village_id === session.villageId)
    }

    if (query) {
      scoped = scoped.filter(p => p.business_name.toLowerCase().includes(query))
    }

    const response: FilterOptionsResponse = {
      type: 'provider',
      options: scoped.map(p => ({
        id: p.provider_id,
        name: p.business_name,
        villageId: p.village_id,
      })),
    }

    return NextResponse.json(response, { status: 200 })
  }

  // type === 'agency'
  const allAgencies = await loadAgencies()
  let scoped = allAgencies

  if (query) {
    scoped = scoped.filter(a => a.company_name.toLowerCase().includes(query))
  }

  const response: FilterOptionsResponse = {
    type: 'agency',
    options: scoped.map(a => ({
      id: a.agency_id,
      name: a.company_name,
    })),
  }

  return NextResponse.json(response, { status: 200 })
}
