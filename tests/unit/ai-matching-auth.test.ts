import { describe, expect, it } from 'vitest'
import { demoSessionContextFor } from '@/lib/auth/session'
import { aiMatchingView, authStateFromSessionCheck } from '@/app/ai-matching/ai-matching-auth'

describe('AI matching authentication view', () => {
  it('shows the skeleton while authentication is loading', () => {
    expect(aiMatchingView('loading')).toBe('skeleton')
  })

  it('shows the matching screen for an Agency', () => {
    expect(aiMatchingView('agency')).toBe('matching')
  })

  it('recognizes an authenticated Agency session', async () => {
    const agency = await demoSessionContextFor('agency')

    expect(authStateFromSessionCheck({ kind: 'resolved', session: agency })).toBe('agency')
  })

  it('shows the lock only after a non-Agency session is confirmed', async () => {
    const guest = await demoSessionContextFor('guest')

    expect(authStateFromSessionCheck({ kind: 'resolved', session: guest })).toBe('guest')
    expect(aiMatchingView(authStateFromSessionCheck({ kind: 'resolved', session: guest }))).toBe('locked')
  })

  it('shows an error instead of the lock when authentication fails', () => {
    const state = authStateFromSessionCheck({ kind: 'failed' })

    expect(state).toBe('error')
    expect(aiMatchingView(state)).toBe('error')
  })
})
