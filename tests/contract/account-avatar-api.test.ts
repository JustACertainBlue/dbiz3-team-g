import { describe, expect, it } from 'vitest'
import { GET, POST, DELETE } from '../../src/app/api/auth/account/avatar/route'

describe('private avatar API', () => {
  it('rejects every guest operation', async () => {
    expect(GET(new Request('http://localhost/api/auth/account/avatar')).status).toBe(401)
    expect((await POST(new Request('http://localhost/api/auth/account/avatar', { method: 'POST' }))).status).toBe(401)
    expect(DELETE(new Request('http://localhost/api/auth/account/avatar', { method: 'DELETE' })).status).toBe(401)
  })
  it('rejects invalid image bytes without claiming success', async () => {
    const body = new FormData()
    body.set('avatar', new File(['not an image'], 'fake.png', { type: 'image/png' }))
    const response = await POST(new Request('http://localhost/api/auth/account/avatar', { method: 'POST', headers: { cookie: 'hab_demo_account=agency' }, body }))
    expect(response.status).toBe(400)
  })
})
