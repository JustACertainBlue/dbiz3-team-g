export interface SessionContext {
  role: string
  accountId: string | null
  authenticated: boolean
}

export interface AccessCheckResult {
  allowed: boolean
  agencyId?: string
  redirectTo?: string
  statusCode?: number
}

export function checkAitAccess(ctx: SessionContext): AccessCheckResult {
  if (!ctx.authenticated || ctx.role === 'Guest') {
    return {
      allowed: false,
      redirectTo: '/login',
    }
  }

  if (ctx.role !== 'Agency') {
    return {
      allowed: false,
      statusCode: 403,
    }
  }

  return {
    allowed: true,
    agencyId: ctx.accountId || undefined,
  }
}
