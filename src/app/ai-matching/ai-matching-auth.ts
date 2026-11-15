import type { SessionContext } from '@/lib/auth/session'

export type AuthState = 'loading' | 'agency' | 'guest' | 'error'
export type AuthView = 'skeleton' | 'matching' | 'locked' | 'error'

export type SessionCheckResult =
  | { kind: 'resolved'; session: SessionContext }
  | { kind: 'failed' }

export function authStateFromSessionCheck(result: SessionCheckResult): AuthState {
  if (result.kind === 'failed') return 'error'
  return result.session.authenticated
    && result.session.role === 'Tour_Agency'
    && Boolean(result.session.agencyId)
    ? 'agency'
    : 'guest'
}

export function aiMatchingView(state: AuthState): AuthView {
  switch (state) {
    case 'loading':
      return 'skeleton'
    case 'agency':
      return 'matching'
    case 'guest':
      return 'locked'
    case 'error':
      return 'error'
  }
}
