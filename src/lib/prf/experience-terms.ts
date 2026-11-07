export type CancellationPolicy = { rules: Array<{ threshold_hours: number; fee_percentage: number }>; notes?: string; [key: string]: unknown }
export type DiscountRule = { pax_threshold: number; discount_percentage: number }
export function cancellationPatch(initial: CancellationPolicy, current: CancellationPolicy) {
  return JSON.stringify(initial) === JSON.stringify(current) ? {} : { cancellation_policy: current }
}
export function readCancellationPolicy(value: unknown): CancellationPolicy {
  let parsed: unknown = value
  if (typeof value === 'string') { try { parsed = JSON.parse(value) } catch { return { rules: [], notes: value } } }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { rules: [] }
  const object = parsed as Record<string, unknown>
  return { ...object, rules: Array.isArray(object.rules) ? object.rules as CancellationPolicy['rules'] : [], notes: typeof object.notes === 'string' ? object.notes : '' }
}
export function cancellationLines(value: unknown): string[] {
  const policy = readCancellationPolicy(value)
  const lines = policy.rules.map(rule => `Báo trước ${rule.threshold_hours} giờ: phí hủy ${rule.fee_percentage}%`)
  if (policy.before_hours !== undefined) lines.push(`Báo trước ${policy.before_hours} giờ${policy.refund_percent !== undefined ? `: hoàn ${policy.refund_percent}%` : ''}`)
  if (policy.notes) lines.push(policy.notes)
  return lines
}
