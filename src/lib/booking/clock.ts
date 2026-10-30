// Seed "now" from data/seed/manifest.json (generated_at); tests inject it instead of the wall clock.
export const SEED_NOW = '2026-09-30T00:00:00+07:00'

export type Clock = () => Date

export const systemClock: Clock = () => new Date()
