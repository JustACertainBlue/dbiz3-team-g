import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST as submit } from '@/app/api/register/route'
import { GET as document } from '@/app/api/auth/agency-reviews/documents/[fileId]/route'

describe('registration delivery and document access boundaries', () => {
  afterEach(() => vi.unstubAllEnvs())
  it('fails clearly without an email adapter rather than pretending an OTP was sent', async () => {
    vi.stubEnv('HAB_EMAIL_MODE', '')
    const response = await submit(new Request('http://localhost/api/register', { method: 'POST' }))
    expect(response.status).toBe(503)
    expect((await response.json()).message).toContain('not configured')
  })
  it.each(['', 'agency', 'provider', 'ubnd'])('denies document download to %s', async account => {
    const request = new Request('http://localhost/api/auth/agency-reviews/documents/none', { headers: account ? { cookie: `hab_demo_account=${account}` } : {} })
    expect((await document(request, { params: { fileId: 'none' } })).status).toBe(403)
  })
  it('does not allow HDT to use a path as a document ID', async () => {
    const request = new Request('http://localhost/api/auth/agency-reviews/documents/none', { headers: { cookie: 'hab_demo_account=hdt' } })
    expect((await document(request, { params: { fileId: '../../runtime.json' } })).status).toBe(404)
  })
})
