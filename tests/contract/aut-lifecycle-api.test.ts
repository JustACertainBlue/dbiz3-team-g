import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as login } from '@/app/api/auth/login/route'
import { POST as forgot } from '@/app/api/auth/forgot-password/route'
import { POST as change } from '@/app/api/auth/change-password/route'
import { GET as choices, POST as create } from '@/app/api/auth/users/create/route'
import { GET as revision, POST as resubmit } from '@/app/api/register/resubmit/route'
import { demoRepository } from '@/lib/demo/json-repository'

const request = (path: string, body: unknown, account?: string) => new Request(`http://localhost${path}`, { method:'POST', headers:{'Content-Type':'application/json', ...(account ? {cookie:`hab_demo_account=${account}`} : {})}, body:JSON.stringify(body) })
describe('integrated AUT route boundaries', () => {
  beforeEach(() => { demoRepository().reset(); vi.stubEnv('HAB_EMAIL_MODE','') })
  afterEach(() => vi.unstubAllEnvs())
  it('rejects null login input and malformed credentials without throwing a server error', async () => {
    expect((await login(request('/api/auth/login',null))).status).toBe(400)
    expect((await login(request('/api/auth/login',{email:'not-an-account@example.invalid',password:'anything'}))).status).toBe(401)
  })
  it('reports email configuration consistently for both known and unknown recovery addresses', async () => {
    const known = await forgot(request('/api/auth/forgot-password',{email:'thanhvien13@example.invalid'}))
    const unknown = await forgot(request('/api/auth/forgot-password',{email:'unknown@example.invalid'}))
    expect(known.status).toBe(503); expect(unknown.status).toBe(503)
    expect(await known.json()).toEqual(await unknown.json())
  })
  it('denies unauthenticated password changes and forged revision links', async () => {
    expect((await change(request('/api/auth/change-password',{}))).status).toBe(401)
    expect((await revision(new Request('http://localhost/api/register/resubmit?token=forged'))).status).toBe(403)
    expect((await resubmit(request('/api/register/resubmit',{token:'forged',data:{}}))).status).toBe(400)
  })
  it.each(['agency','provider'])('denies account-creation options and mutations to %s', async account => {
    expect((await choices(new Request('http://localhost/api/auth/users/create',{headers:{cookie:`hab_demo_account=${account}`}}))).status).toBe(403)
    expect((await create(request('/api/auth/users/create',{kind:'ubnd'},account))).status).toBe(403)
  })
  it('derives creation type from Admin subtype and disables delivery-dependent UI when email is absent', async () => {
    for (const [account,kind] of [['hdt','ubnd'],['ubnd','provider']]) {
      const response = await choices(new Request('http://localhost/api/auth/users/create',{headers:{cookie:`hab_demo_account=${account}`}}))
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({kind,email_configured:false})
    }
  })
})
