// Checks on the reply of the model before it is shown. The reply is never logged here: callers get
// only the names of the violations.

export type ReplyViolation = 'leak' | 'booking_claim'

export const SAFE_REPLY =
  'Mình đã ghi nhận yêu cầu của đoàn. Để chốt đặt chỗ, bạn dùng Yêu cầu báo giá hoặc Chat với xưởng nhé.'

export function detectLeak(text: string): ('email' | 'phone' | 'secret' | 'internal_url')[] {
  const leaks = new Set<'email' | 'phone' | 'secret' | 'internal_url'>()
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) leaks.add('email')
  // Vietnamese numbers: +84 then 9-10 digits, or 0 then 9 digits; not a price (đ ₫ after) and not
  // followed by more digits. A full stop that ends a sentence is allowed after the number.
  if (/\+84[\s.-]?[1-9](?:[\s.-]?\d){8,9}(?!\d|\.\d|[đ₫])/.test(text) || /(?<![\d.])0[1-9](?:[\s.-]?\d){8}(?!\d|\.\d|[đ₫])/.test(text)) leaks.add('phone')
  if (/\bsk-[a-zA-Z0-9_-]{20,}\b/.test(text) || /\b[A-Z0-9_]{3,}_KEY\s*=/.test(text) || text.includes('SUPABASE_SERVICE_ROLE_KEY')) leaks.add('secret')
  if (/[a-zA-Z0-9_-]+\.supabase\.co/.test(text) || /\/api\/ait\//.test(text)) leaks.add('internal_url')
  return [...leaks]
}

/** True when the reply says a tour is booked or confirmed. Only the Provider confirms a booking. */
export function hasAffirmativeBookingClaim(text: string): boolean {
  return /(?<![\p{L}\p{N}])(?:đã\s+(?:được\s+)?(?:đặt|xác\s*nhận|chốt)(?:\s+(?:tour|lịch|chuyến))?|(?:tour|lịch|chuyến)\s+đã\s+(?:được\s+)?(?:đặt|xác\s*nhận|chốt)|your\s+tour\s+(?:is\s+)?(?:booked|confirmed))(?![\p{L}\p{N}])/iu
    .test(text)
}

export function postCheckReply(reply: string): { ok: boolean; message: string; violations: ReplyViolation[] } {
  const violations: ReplyViolation[] = []
  if (hasAffirmativeBookingClaim(reply)) violations.push('booking_claim')
  if (detectLeak(reply).length > 0) violations.push('leak')
  return violations.length > 0
    ? { ok: false, message: SAFE_REPLY, violations }
    : { ok: true, message: reply, violations: [] }
}
