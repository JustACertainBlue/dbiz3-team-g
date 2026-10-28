import { NextRequest, NextResponse } from 'next/server'
import { loadVillages } from '@/lib/db/seed-loader'
import { SessionLike } from '@/lib/adm/scope-guard'
import { VillagesResponse } from '@/lib/adm/types'

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

  const allVillages = await loadVillages()

  if (adminType === 'UBND') {
    const assignedId = session.villageId || ''
    const assigned = allVillages.filter(v => v.village_id === assignedId)
    const response: VillagesResponse = {
      isLocked: true,
      assignedVillageId: assignedId,
      villages: assigned.map(v => ({
        villageId: v.village_id,
        name: v.name,
        district: v.district,
      })),
    }
    return NextResponse.json(response, { status: 200 })
  }

  // HDT Admin: platform-wide unlocked options
  const response: VillagesResponse = {
    isLocked: false,
    assignedVillageId: null,
    villages: allVillages.map(v => ({
      villageId: v.village_id,
      name: v.name,
      district: v.district,
    })),
  }

  return NextResponse.json(response, { status: 200 })
}
