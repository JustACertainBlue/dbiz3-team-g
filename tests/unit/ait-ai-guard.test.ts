import { describe, expect, it } from 'vitest'
import { createRateLimiter, sanitizeInput } from '@/lib/ai/guard'
import { messageOutcome } from '@/app/ai-matching/matching-view'

describe('sanitizeInput', () => {
  it('removes zero-width and control characters, normalises and trims', () => {
    const result = sanitizeInput('  Đoàn​ 10\u0007 khách⁠  ')
    expect(result).toEqual({ ok: true, text: 'Đoàn 10 khách' })
  })

  it('keeps line breaks and tabs', () => {
    expect(sanitizeInput('a\nb\tc')).toEqual({ ok: true, text: 'a\nb\tc' })
  })

  it('rejects an empty message, also one made only of invisible characters', () => {
    expect(sanitizeInput('   ').reason).toBe('empty')
    expect(sanitizeInput('​‌').ok).toBe(false)
    expect(sanitizeInput(undefined as never).reason).toBe('empty')
  })

  it('rejects a message over the limit, counting characters not bytes', () => {
    expect(sanitizeInput('ạ'.repeat(2000)).ok).toBe(true)
    expect(sanitizeInput('ạ'.repeat(2001))).toMatchObject({ ok: false, reason: 'too_long' })
  })
})

describe('createRateLimiter', () => {
  it('allows the limit, then blocks with the time left, per key', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 })
    expect(limiter.check('a', 0).allowed).toBe(true)
    expect(limiter.check('a', 100).allowed).toBe(true)
    const blocked = limiter.check('a', 200)
    expect(blocked).toEqual({ allowed: false, retryAfterMs: 800 })
    expect(limiter.check('b', 200).allowed).toBe(true)
  })

  it('lets requests through again once the window has passed', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 })
    limiter.check('a', 0)
    expect(limiter.check('a', 500).allowed).toBe(false)
    expect(limiter.check('a', 1001).allowed).toBe(true)
  })
})

describe('screen 22 outcome for a refused message', () => {
  it('429 shows the message and a Retry that resends, since nothing was stored', () => {
    const outcome = messageOutcome({ ok: false, status: 429, body: { error_code: 'RATE_LIMITED', user_message: 'Bạn gửi quá nhanh, hãy thử lại sau ít giây.' } })
    expect(outcome).toEqual({ kind: 'failure', text: 'Bạn gửi quá nhanh, hãy thử lại sau ít giây.', retry: 'resend' })
  })
})
