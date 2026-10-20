import { NextRequest, NextResponse } from 'next/server'
import { listUserAccounts, toggleUserStatus } from '@/lib/adm/user-service'
import { SessionLike } from '@/lib/adm/scope-guard'

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
  const isAuthorizedAdmin =
    (role === 'ADMIN' || role === 'HDT' || role === 'UBND') &&
    (adminType === 'HDT' || adminType === 'UBND')

  if (!isAuthorizedAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Admin privileges required to access user management.' },
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
    const search = searchParams.get('search') || undefined
    const roleParam = searchParams.get('role') || undefined
    const statusParam = searchParams.get('status') || undefined

    const data = await listUserAccounts(normalizedSession, {
      search,
      role: roleParam,
      status: statusParam,
    })

    return NextResponse.json(data, { status: 200 })
  } catch (err: any) {
    const message = err?.message || 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session || !session.authenticated) {
    return NextResponse.json(
      { error: 'Authentication required. Please provide a valid session.' },
      { status: 401 }
    )
  }

  const role = session.role ?? ''
  const adminType = session.adminType ?? (role === 'HDT' ? 'HDT' : role === 'UBND' ? 'UBND' : null)
  const isAuthorizedAdmin =
    (role === 'ADMIN' || role === 'HDT' || role === 'UBND') &&
    (adminType === 'HDT' || adminType === 'UBND')

  if (!isAuthorizedAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Admin privileges required to manage user accounts.' },
      { status: 403 }
    )
  }

  const normalizedSession: SessionLike = {
    ...session,
    role: 'ADMIN',
    adminType,
  }

  try {
    const body = await req.json()
    const { userId, enabled } = body

    if (!userId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid payload: userId and boolean enabled status are required.' },
        { status: 400 }
      )
    }

    const result = await toggleUserStatus(normalizedSession, userId, enabled)
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to update user status.' }, { status: 403 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (err: any) {
    const message = err?.message || 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
