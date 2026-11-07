import { describe, expect, it } from 'vitest'
import { demoSessionContextFor } from '@/lib/auth/session'
import { adminPageAccess } from '@/app/admin/admin-page-access'

// T045 (L3): ADM079 is for HDT and UBND only (BR-001, BR-002); others see the restricted state,
// as /admin/providers already does.
describe('T045 | L3 adminPageAccess', () => {
  it.each(['hdt', 'ubnd'] as const)('%s → allow', async key => {
    expect(adminPageAccess((await demoSessionContextFor(key)))).toBe('allow')
  })

  it.each(['guest', 'agency', 'provider'] as const)('%s → restricted', async key => {
    expect(adminPageAccess((await demoSessionContextFor(key)))).toBe('restricted')
  })
})
