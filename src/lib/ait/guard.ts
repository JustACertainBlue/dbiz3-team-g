export function sanitizeInput(
  text: string,
  max = 1000
): { ok: boolean; text: string; reason?: 'empty' | 'too_long' } {
  if (typeof text !== 'string') {
    return { ok: false, text: '', reason: 'empty' };
  }

  // Remove zero-width characters (U+200B–U+200F, U+2060, U+FEFF)
  let cleaned = text.replace(/[\u200B-\u200F\u2060\uFEFF]/g, '');

  // Remove control characters (except \n and \t)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Unicode NFC normalization
  cleaned = cleaned.normalize('NFC');

  // Trim whitespace
  cleaned = cleaned.trim();

  if (cleaned.length === 0) {
    return { ok: false, text: '', reason: 'empty' };
  }

  const charCount = Array.from(cleaned).length;
  if (charCount > max) {
    return { ok: false, text: cleaned, reason: 'too_long' };
  }

  return { ok: true, text: cleaned };
}

export function createRateLimiter({
  limit,
  windowMs,
}: {
  limit: number;
  windowMs: number;
}): {
  check: (
    key: string,
    nowMs: number
  ) => { allowed: boolean; retryAfterMs?: number };
} {
  const store = new Map<string, number[]>();

  return {
    check(key: string, nowMs: number) {
      let history = store.get(key) ?? [];
      // Retain only requests within the sliding window
      history = history.filter((t) => nowMs - t < windowMs);

      if (history.length < limit) {
        history.push(nowMs);
        store.set(key, history);
        return { allowed: true };
      }

      // Blocked: calculate retryAfterMs from the oldest timestamp in window
      const oldest = history[0];
      const retryAfterMs = oldest + windowMs - nowMs;
      store.set(key, history);
      return { allowed: false, retryAfterMs };
    },
  };
}
