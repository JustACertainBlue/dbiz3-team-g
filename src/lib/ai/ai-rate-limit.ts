import { createRateLimiter } from './guard'

// 20 messages per minute and per Agency before the model is called. A route file cannot export
// extra helpers, so the limiter lives here.
const aiRequestLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 })

export function checkAiRateLimit(agencyId: string, nowMs: number = Date.now()) {
  return aiRequestLimiter.check(agencyId, nowMs)
}

export function resetAiRateLimiter(): void {
  aiRequestLimiter.reset()
}
