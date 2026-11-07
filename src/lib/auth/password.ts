// Password primitives from linh-daotruc's AUT implementation, PR #11.
import bcrypt from 'bcryptjs'

const PRODUCTION_COST = 12
// bcrypt's minimum work factor. Used only by automated tests so the full
// suite does not time out under parallel load; never in dev or production.
const TEST_COST = 4

export function passwordHashCost(env: { NODE_ENV?: string } = process.env): number {
  return env.NODE_ENV === 'test' ? TEST_COST : PRODUCTION_COST
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, passwordHashCost())
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
