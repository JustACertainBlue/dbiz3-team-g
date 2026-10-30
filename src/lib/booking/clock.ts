// Seed "now" from data/seed/manifest.json (generated_at); tests inject it instead of the wall clock.
export const SEED_NOW = '2026-09-30T00:00:00+07:00'

export type Clock = () => Date

export const systemClock: Clock = () => new Date()

const HANOI_OFFSET = 7 * 3_600_000

// ISO 8601 timestamp with the +07:00 offset used by the seed.
export function hanoiTimestamp(timestamp: number): string {
  return new Date(timestamp + HANOI_OFFSET).toISOString().slice(0, 19) + '+07:00'
}
