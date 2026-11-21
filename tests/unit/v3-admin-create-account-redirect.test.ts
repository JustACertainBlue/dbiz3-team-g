// The v3 mockup has no "create account" entry (png/39): /admin/create-account sends the visitor to the account list.
import { describe, expect, it } from 'vitest'
import { isRedirectError } from 'next/dist/client/components/redirect'
import CreateAccountPage from '@/app/admin/create-account/page'

describe('/admin/create-account', () => {
  it('redirects on the server to /admin/users', async () => {
    let caught: unknown
    try { await CreateAccountPage() } catch (error) { caught = error }
    expect(isRedirectError(caught)).toBe(true)
    expect(String((caught as { digest?: string }).digest)).toContain(';/admin/users;')
  })
})
