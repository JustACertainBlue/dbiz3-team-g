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
    const hash = bcrypt.hashSync('Secure123!', 12)
    expect(await verifyPassword('Secure123!', hash)).toBe(true)
  })
})
