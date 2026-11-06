import { describe, expect, it } from 'vitest'
import { GET } from '@/app/api/auth/session/route'

async function session(account?: string) {
  const headers = account ? { cookie: `hab_demo_account=${account}` } : undefined
  const response = GET(new Request('http://localhost/api/auth/session', { headers }))
  return { status: response.status, body: await response.json() }
}

describe('GET /api/auth/session', () => {
  it('returns the canonical Guest context without a cookie', async () => {
    expect(await session()).toEqual({ status: 200, body: { data: { session: expect.objectContaining({ authenticated: false, role: null }) } } })
  })

  it.each([
    ['agency', 'Tour_Agency', null],
    ['provider', 'Local_Provider', null],
    ['ubnd', 'ADMIN', 'UBND'],
    ['hdt', 'ADMIN', 'HDT'],
  ])('maps %s to %s / %s', async (account, role, adminType) => {
    const result = await session(account)
    expect(result.status).toBe(200)
    expect(result.body.data.session).toMatchObject({ authenticated: true, role, adminType })
  })
})
