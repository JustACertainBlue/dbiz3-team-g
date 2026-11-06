import { NextRequest, NextResponse } from 'next/server'
import { loadVillages } from '@/lib/db/seed-loader'
import { adminSessionFromRequest } from '@/lib/adm/admin-session'
import { VillagesResponse } from '@/lib/adm/types'

const getSessionFromRequest = adminSessionFromRequest

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session || !session.authenticated) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 }
    )
  }

  if (session.role !== 'ADMIN' || !session.adminType) {
    return NextResponse.json(
      { error: 'Forbidden: Admin privileges required.' },
      { status: 403 }
    )
  }

  const allVillages = await loadVillages()

  if (session.adminType === 'UBND') {
    const assignedId = session.assignedVillageId || ''
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
