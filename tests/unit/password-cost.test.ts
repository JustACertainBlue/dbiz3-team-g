import bcrypt from 'bcryptjs'
import { describe, expect, it } from 'vitest'
import { hashPassword, passwordHashCost, verifyPassword } from '@/lib/auth/password'

// The bcrypt work factor is an environment setting, not a business rule:
// production and development keep cost 12; automated tests use the bcrypt
// minimum so the suite does not time out under parallel load.
describe('password hash cost', () => {
  it('keeps cost 12 outside automated tests', () => {
    expect(passwordHashCost({ NODE_ENV: 'production' })).toBe(12)
    expect(passwordHashCost({ NODE_ENV: 'development' })).toBe(12)
    expect(passwordHashCost({})).toBe(12)
  })

  it('uses the bcrypt minimum cost only under NODE_ENV=test', () => {
    expect(passwordHashCost({ NODE_ENV: 'test' })).toBe(4)
  })

  it('hashes with the low cost in this test run and still verifies', async () => {
    const hash = await hashPassword('Secure123!')
    expect(bcrypt.getRounds(hash)).toBe(4)
    expect(await verifyPassword('Secure123!', hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })

  it('still verifies hashes created with cost 12 (existing accounts)', async () => {
    // Precomputed once with bcryptjs at cost 12 so the test does not hash at cost 12 itself (that timed
    // out under load). Test-only fixture: the password below is not, and must never be, a real password.
    const TEST_ONLY_PASSWORD = 'test-only-cost12-fixture-password'
    const TEST_ONLY_COST12_HASH = '$2b$12$3KqW8v4obeJUQaSWErdeou/nZOQUjbPxuqs5iwHCJDu1n51jvq1jS'
    expect(TEST_ONLY_COST12_HASH).toMatch(/^\$2[ab]\$12\$/)
    expect(bcrypt.getRounds(TEST_ONLY_COST12_HASH)).toBe(12)
    expect(await verifyPassword(TEST_ONLY_PASSWORD, TEST_ONLY_COST12_HASH)).toBe(true)
    expect(await verifyPassword('wrong-test-only-password', TEST_ONLY_COST12_HASH)).toBe(false)
    // 15 s for this test only: two bcrypt compares at cost 12 are slow on purpose (that is the work factor
    // existing accounts were hashed with), not a sign of a code fault, and took over 5 s on a loaded laptop.
    // Unlike product-session.test.ts, where hashing at cost 12 in tests was removed instead (Entry 49).
  }, 15_000)
})
