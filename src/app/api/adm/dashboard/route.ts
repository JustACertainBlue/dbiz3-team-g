import { NextRequest, NextResponse } from 'next/server'
import { filterDashboardMetrics } from '@/lib/adm/metrics-service'
import { SessionLike } from '@/lib/adm/scope-guard'
import { TimePreset, CollaborationSortBy } from '@/lib/adm/types'

function getSessionFromRequest(req: NextRequest): SessionLike | null {
  const header = req.headers.get('x-mock-session')
  if (header) {
    try {
      return JSON.parse(header) as SessionLike
    } catch {
      // ignore
    }
  }

  const cookie = req.cookies.get('hab_mock_session')?.value || req.cookies.get('x-mock-session')?.value
  if (cookie) {
    try {
      return JSON.parse(decodeURIComponent(cookie)) as SessionLike
    } catch {
      // ignore
    }
  }

  return null
}

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session || !session.authenticated) {
    return NextResponse.json(
      { error: 'Authentication required. Please provide a valid session.' },
      { status: 401 }
    )
  }

  const role = session.role ?? ''
  const adminType = session.adminType ?? (role === 'HDT' ? 'HDT' : role === 'UBND' ? 'UBND' : null)
  const isAuthorizedAdmin = (role === 'ADMIN' || role === 'HDT' || role === 'UBND') && (adminType === 'HDT' || adminType === 'UBND')

  if (!isAuthorizedAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Admin privileges required to view dashboard.' },
      { status: 403 }
    )
  }

  const normalizedSession: SessionLike = {
    ...session,
    role: 'ADMIN',
    adminType,
  }

  try {
    const { searchParams } = new URL(req.url)
    const preset = searchParams.get('preset') as TimePreset | null
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const villageId = searchParams.get('villageId') || undefined
    const rawAgencyParam = searchParams.getAll('agencyId')
    const agencyIds = rawAgencyParam.flatMap(a => a.split(',')).map(s => s.trim()).filter(Boolean)
    const agencyId = agencyIds.join(',') || undefined

    const rawProviderParam = searchParams.getAll('providerId')
    const providerIds = rawProviderParam.flatMap(p => p.split(',')).map(s => s.trim()).filter(Boolean)
    const providerId = providerIds.join(',') || undefined

    const sortBy = searchParams.get('sortBy') as CollaborationSortBy | null

    const data = await filterDashboardMetrics(normalizedSession, {
      preset: preset || undefined,
      startDate,
      endDate,
      villageId,
      agencyId,
      providerId,
      agencyIds: agencyIds.length > 0 ? agencyIds : undefined,
      providerIds: providerIds.length > 0 ? providerIds : undefined,
      sortBy: sortBy || undefined,
    })

    return NextResponse.json(data, { status: 200 })
  } catch (err: any) {
    const message = err?.message || 'Internal Server Error'
    if (message.includes('Forbidden')) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
