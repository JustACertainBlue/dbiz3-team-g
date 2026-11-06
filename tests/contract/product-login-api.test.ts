import { beforeEach, describe, expect, it } from 'vitest'
import { POST as login } from '@/app/api/auth/login/route'
import { GET as session } from '@/app/api/auth/session/route'
import { POST as logout } from '@/app/api/auth/logout/route'
import { hashPassword } from '@/lib/auth/password'
import { demoRepository } from '@/lib/demo/json-repository'

describe('PR #11 password login through the shared session contract', () => {
  beforeEach(() => demoRepository().reset())
  it('keeps a new Agency identity through login, session read and logout', async () => {
    const repo = demoRepository()
    repo.insert('user_accounts', { user_id: 'integration-user', email: 'integration@example.invalid', full_name: 'Integration Agency', role_code: 'Tour_Agency', account_status: 'Approved', password_hash: await hashPassword('Secure123!') })
    repo.insert('agency_profiles', { user_id: 'integration-user', agency_id: 'integration-agency' })
    const request = (password: string) => new Request('http://localhost/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'integration@example.invalid', password }) })
    expect((await login(request('wrong'))).status).toBe(401)
    const response = await login(request('Secure123!'))
    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.data.redirectTo).toBe('/explore')
    expect(payload.data.session).toMatchObject({ role: 'Tour_Agency', agencyId: 'integration-agency', userId: 'integration-user' })
    const token = response.cookies.get('hab_session')!.value
    const authenticated = new Request('http://localhost/api/auth/session', { headers: { cookie: `hab_session=${token}` } })
    expect((await session(authenticated).json()).data.session).toMatchObject({ authenticated: true, agencyId: 'integration-agency' })
    await logout(authenticated)
    expect((await session(authenticated).json()).data.session.authenticated).toBe(false)
  })
})
