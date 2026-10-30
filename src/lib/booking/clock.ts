// Seed "now" from data/seed/manifest.json (generated_at); tests inject it instead of the wall clock.
export const SEED_NOW = '2026-09-30T00:00:00+07:00'

export type Clock = () => Date

export const systemClock: Clock = () => new Date()

const HANOI_OFFSET = 7 * 3_600_000

// ISO 8601 timestamp with the +07:00 offset used by the seed.
export function hanoiTimestamp(timestamp: number): string {
  return new Date(timestamp + HANOI_OFFSET).toISOString().slice(0, 19) + '+07:00'
}

// YYYY-MM-DD of an instant in Asia/Ho_Chi_Minh (#31); the F-SCHED-10 date filter compares these (#62).
export function hanoiDate(timestamp: number): string {
  return new Date(timestamp + HANOI_OFFSET).toISOString().slice(0, 10)
}

// YYYY-MM-DD plus n calendar days (schedule ranges, #71).
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

// A real calendar date written as YYYY-MM-DD (#62, #71).
export function isQueryDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}
