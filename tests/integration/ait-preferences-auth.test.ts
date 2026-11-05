/**
 * linh/br-fixes – AIT BR-001 / BR-015 (checklist §3 #46): the Agency preference profile route is for the
 * authenticated Tour Agency itself. Guest → 401; Local Provider / UBND / HDT → 403; another Agency → 403
 * and nothing is written. Same status codes as the other AIT routes (BR-001, ait-matching-api.test.ts:120).
 * Written before the fix (Constitution II).
 */
import { describe, expect, it } from 'vitest'
import { GET, POST } from '@/app/api/ait/preferences/[agencyId]/route'
import { getAgencyPreferenceProfile } from '@/lib/preferences/preference-service'

const OWN = '02e568d8-d65e-54b1-a554-b411150d1dcb' // demo Agency (Tràng An)
const OTHER = 'ebf4fcfa-1013-5ecd-b7c6-e0d8e9fa0277' // Hồng Hà
const call = (handler: typeof GET, agencyId: string, account: string, body?: unknown) => handler(
  new Request(`http://localhost:3000/api/ait/preferences/${agencyId}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { cookie: `hab_demo_account=${account}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
  { params: { agencyId } },
)

describe('AIT BR-015 | preference profile route is the Agency\'s own', () => {
  it('Guest gets 401 on GET and POST', async () => {
    expect((await call(GET, OWN, 'guest')).status).toBe(401)
    expect((await call(POST, OWN, 'guest', { preference_weights: { x: 1 } })).status).toBe(401)
  })

  for (const account of ['provider', 'ubnd', 'hdt']) {
    it(`${account} gets 403`, async () => {
      expect((await call(GET, OWN, account)).status).toBe(403)
      expect((await call(POST, OWN, account, { preference_weights: { x: 1 } })).status).toBe(403)
    })
  }

  it('an Agency cannot read or overwrite another Agency\'s profile', async () => {
    const before = JSON.stringify(await getAgencyPreferenceProfile(OTHER))
    expect((await call(GET, OTHER, 'agency')).status).toBe(403)
    expect((await call(POST, OTHER, 'agency', { session_id: 's', tour_preference_profile: { preference_weights: { Silk: 1 } } })).status).toBe(403)
    expect(JSON.stringify(await getAgencyPreferenceProfile(OTHER))).toBe(before)
  })

  it('the Agency reads its own profile', async () => {
    expect((await call(GET, OWN, 'agency')).status).toBe(200)
  })
})
