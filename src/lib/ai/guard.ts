// Checks made before a message is sent to a paid language model. Nothing here logs message content.

export const MAX_MESSAGE_CHARS = 2000 // same limit as MessageTextSchema (1-2000 characters)

export function sanitizeInput(
  text: unknown,
  max = MAX_MESSAGE_CHARS
): { ok: boolean; text: string; reason?: 'empty' | 'too_long' } {
  if (typeof text !== 'string') return { ok: false, text: '', reason: 'empty' }
  const cleaned = text
    .replace(/[​-‏⁠﻿]/g, '') // zero-width characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control characters except \n and \t
    .normalize('NFC')
    .trim()
  if (cleaned.length === 0) return { ok: false, text: '', reason: 'empty' }
  if (Array.from(cleaned).length > max) return { ok: false, text: cleaned, reason: 'too_long' }
  return { ok: true, text: cleaned }
}

/** Sliding-window limiter kept in memory, per key. */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const store = new Map<string, number[]>()
  return {
    check(key: string, nowMs: number): { allowed: boolean; retryAfterMs?: number } {
      const history = (store.get(key) ?? []).filter(at => nowMs - at < windowMs)
      if (history.length < limit) {
        history.push(nowMs)
        store.set(key, history)
        return { allowed: true }
      }
      store.set(key, history)
      return { allowed: false, retryAfterMs: history[0] + windowMs - nowMs }
    },
    reset() { store.clear() },
  }
}
