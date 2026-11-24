import type { SessionContext } from '@/lib/auth/session'

// AIT121 access (BR-001, BR-002, #28): a Guest goes to Login; other non-Agency actors see a restricted page.
export const RESTRICTED_TEXT = 'Ghép tour AI chỉ dành cho tài khoản công ty lữ hành. Hãy đăng nhập bằng tài khoản công ty lữ hành để tiếp tục.'

export function aiMatchingAccess(session: SessionContext): 'allow' | 'redirect-login' | 'restricted' {
  if (!session.authenticated) return 'redirect-login'
  return session.role === 'Tour_Agency' && session.agencyId ? 'allow' : 'restricted'
}
