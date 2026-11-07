import { describe, expect, it } from 'vitest'
import { demoSessionContextFor } from '@/lib/auth/session'
import { aiMatchingAccess, RESTRICTED_TEXT } from '@/app/ai-matching/ai-matching-access'

// T051 (Round 3, D7): AIT121 access — BR-001, BR-002, AS-1, AS-2, #28.
describe('T051 | aiMatchingAccess', () => {
  it('Guest → redirect to Login', async () => {
    expect(aiMatchingAccess((await demoSessionContextFor('guest')))).toBe('redirect-login')
  })

  it('Tour Agency → allow', async () => {
    expect(aiMatchingAccess((await demoSessionContextFor('agency')))).toBe('allow')
  })

  it.each(['provider', 'ubnd', 'hdt'] as const)('%s → restricted', async key => {
    expect(aiMatchingAccess((await demoSessionContextFor(key)))).toBe('restricted')
  })

  it('the restricted copy does not mention Guests', () => {
    expect(RESTRICTED_TEXT.length).toBeGreaterThan(0)
    expect(RESTRICTED_TEXT).not.toMatch(/guest/i)
  })
})
