import { demoRepository } from '../demo/json-repository'
import { hashPassword, verifyPassword } from './password'
import { passwordInput } from './lifecycle'

/**
 * ADR 0001 decision 1b: on the hosted (production) build the development-only "any non-empty password" login
 * is off and seed accounts only have placeholder hashes. At every app start, one synthetic test account per
 * role gets a real bcrypt password from an environment variable, without a forced password change because
 * several testers share it. A missing or invalid variable leaves that account untouched (no login) and logs a
 * warning that never contains a password.
 */
export const TEST_ACCOUNTS = [
  { env: 'HAB_TEST_PASSWORD_AGENCY', email: 'thanhvien13@example.invalid' }, // Tour Agency, Công ty Du lịch Tràng An
  { env: 'HAB_TEST_PASSWORD_PROVIDER', email: 'thanhvien19@example.invalid' }, // Local Provider, Xưởng thủ công Bát Tràng
  { env: 'HAB_TEST_PASSWORD_UBND', email: 'thanhvien1@example.invalid' }, // UBND Admin, Bát Tràng (active village)
  { env: 'HAB_TEST_PASSWORD_HDT', email: 'thanhvien9@example.invalid' }, // HDT Admin
] as const

type Logger = Pick<Console, 'warn' | 'info'>
type Env = Record<string, string | undefined>

export async function ensureTestAccounts(env: Env = process.env, log: Logger = console) {
  const configured: string[] = []
  const skipped: string[] = []
  for (const { env: name, email } of TEST_ACCOUNTS) {
    const password = env[name]
    if (!password) {
      log.warn(`[test-accounts] ${name} is not set; ${email} gets no password and cannot log in.`)
      skipped.push(email); continue
    }
    try { passwordInput(password, password) } catch {
      log.warn(`[test-accounts] ${name} does not meet the account password rule (8–64 chars, upper, lower, digit, special, no space); ${email} skipped.`)
      skipped.push(email); continue
    }
    const repository = demoRepository()
    const account = repository.find('user_accounts', row => row.email.toLowerCase() === email)
    if (!account || !['Active', 'Approved'].includes(account.account_status)) {
      log.warn(`[test-accounts] ${email} is missing or not Active/Approved; skipped.`)
      skipped.push(email); continue
    }
    // Idempotent: an unchanged password keeps the stored hash, so restarts do not rewrite the account.
    const samePassword = !account.password_hash.includes('seedhash') && await verifyPassword(password, account.password_hash)
    if (samePassword && account.must_change_password === 'false') { configured.push(email); continue }
    const now = new Date().toISOString()
    const changes = samePassword
      ? { must_change_password: 'false', updated_at: now }
      : { password_hash: await hashPassword(password), must_change_password: 'false', password_changed_at: now, updated_at: now }
    repository.update('user_accounts', row => row.user_id === account.user_id, changes)
    configured.push(email)
  }
  log.info(`[test-accounts] ready: ${configured.length} configured, ${skipped.length} skipped.`)
  return { configured, skipped }
}
