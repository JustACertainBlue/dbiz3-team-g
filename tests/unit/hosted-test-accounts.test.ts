import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { verifyPassword } from '@/lib/auth/password'
import { authenticateAccount, workspacePath } from '@/lib/auth/product-session'
import { ensureTestAccounts, TEST_ACCOUNTS } from '@/lib/auth/test-accounts'

// ADR 0001 decision 1b: one synthetic test account per role gets a real password from the environment at every
// app start, so the hosted (production) build has working logins while the development-only "any non-empty
// password" login stays off. Passwords below are test-only fixtures, not real passwords.
const ENV = {
  HAB_TEST_PASSWORD_AGENCY: 'Test-only-Agency-1!',
  HAB_TEST_PASSWORD_PROVIDER: 'Test-only-Provider-1!',
  HAB_TEST_PASSWORD_UBND: 'Test-only-Ubnd-1!',
  HAB_TEST_PASSWORD_HDT: 'Test-only-Hdt-1!',
}
const EMAILS = {
  HAB_TEST_PASSWORD_AGENCY: 'thanhvien13@example.invalid',
  HAB_TEST_PASSWORD_PROVIDER: 'thanhvien19@example.invalid',
  HAB_TEST_PASSWORD_UBND: 'thanhvien1@example.invalid',
  HAB_TEST_PASSWORD_HDT: 'thanhvien9@example.invalid',
}

const repo = () => demoRepository()
const account = (email: string) => repo().find('user_accounts', row => row.email === email)!
const logger = () => ({ warn: vi.fn(), info: vi.fn() })
const allLogText = (log: ReturnType<typeof logger>) => [...log.warn.mock.calls, ...log.info.mock.calls].flat().join(' ')

describe('ADR 0001 | hosted test accounts from environment variables', () => {
  beforeEach(() => repo().reset())
  afterEach(() => vi.unstubAllEnvs())

  it('covers exactly Agency, Provider, UBND = thanhvien1 (Bát Tràng) and HDT', () => {
    expect(TEST_ACCOUNTS.map(a => [a.env, a.email])).toEqual(Object.entries(EMAILS))
  })

  it('gives each configured account a real password and no forced change, so it logs in under production', async () => {
    repo().update('user_accounts', row => row.email === EMAILS.HAB_TEST_PASSWORD_UBND, { must_change_password: 'true' })
    const log = logger()
    await ensureTestAccounts(ENV, log)
    for (const [name, email] of Object.entries(EMAILS)) {
      const row = account(email)
      expect(await verifyPassword(ENV[name as keyof typeof ENV], row.password_hash)).toBe(true)
      expect(row.must_change_password).toBe('false')
    }
    vi.stubEnv('NODE_ENV', 'production')
    const login = await authenticateAccount(EMAILS.HAB_TEST_PASSWORD_UBND, ENV.HAB_TEST_PASSWORD_UBND)
    expect(login.ok).toBe(true)
    if (login.ok) expect(workspacePath(login.identity)).not.toBe('/account/change-password')
    // The development-only "any non-empty password" login stays off in production.
    expect(await authenticateAccount(EMAILS.HAB_TEST_PASSWORD_HDT, 'anything')).toEqual({ ok: false, reason: 'INVALID_CREDENTIALS' })
    expect(await authenticateAccount('thanhvien14@example.invalid', 'anything')).toEqual({ ok: false, reason: 'INVALID_CREDENTIALS' })
  })

  it('skips an account whose variable is missing and warns without logging any password', async () => {
    const before = account(EMAILS.HAB_TEST_PASSWORD_UBND).password_hash
    const log = logger()
    const result = await ensureTestAccounts({ HAB_TEST_PASSWORD_AGENCY: ENV.HAB_TEST_PASSWORD_AGENCY }, log)
    expect(result.configured).toEqual([EMAILS.HAB_TEST_PASSWORD_AGENCY])
    expect(account(EMAILS.HAB_TEST_PASSWORD_UBND).password_hash).toBe(before)
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('HAB_TEST_PASSWORD_UBND'))
    expect(allLogText(log)).not.toContain(ENV.HAB_TEST_PASSWORD_AGENCY)
  })

  it('skips a password that breaks the account password rule and does not log it', async () => {
    const before = account(EMAILS.HAB_TEST_PASSWORD_HDT).password_hash
    const log = logger()
    await ensureTestAccounts({ HAB_TEST_PASSWORD_HDT: 'weakpass' }, log)
    expect(account(EMAILS.HAB_TEST_PASSWORD_HDT).password_hash).toBe(before)
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('HAB_TEST_PASSWORD_HDT'))
    expect(allLogText(log)).not.toContain('weakpass')
  })

  it('is idempotent: a second start with the same variables changes nothing', async () => {
    await ensureTestAccounts(ENV, logger())
    const first = repo().all('user_accounts').filter(row => Object.values(EMAILS).includes(row.email))
    await ensureTestAccounts(ENV, logger())
    const second = repo().all('user_accounts').filter(row => Object.values(EMAILS).includes(row.email))
    expect(second).toEqual(first)
  })

  it('runs at app start in the Node.js runtime only (instrumentation register)', async () => {
    vi.stubEnv('HAB_TEST_PASSWORD_HDT', ENV.HAB_TEST_PASSWORD_HDT)
    const { register } = await import('@/instrumentation')
    vi.stubEnv('NEXT_RUNTIME', 'edge')
    await register()
    expect(account(EMAILS.HAB_TEST_PASSWORD_HDT).password_hash).toContain('seedhash')
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    await register()
    expect(await verifyPassword(ENV.HAB_TEST_PASSWORD_HDT, account(EMAILS.HAB_TEST_PASSWORD_HDT).password_hash)).toBe(true)
  })
})
