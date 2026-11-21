// Screen 35 shows the list price with the Group Discount and does not let the Provider edit it (no price column
// other than agreed_price_total exists). Same rule as explore/v3-search priceFor: the best reached threshold wins.
export interface DiscountRule { pax: number; pct: number }
export interface GroupPrice { total: number; old: number | null; pct: number }

export function groupPrice(perGuest: number, guests: number, rules: readonly DiscountRule[]): GroupPrice {
  const full = perGuest * guests
  const reached = rules.filter(rule => guests >= rule.pax).sort((a, b) => b.pct - a.pct)[0]
  return reached ? { total: Math.round(full * (100 - reached.pct) / 100), old: full, pct: reached.pct } : { total: full, old: null, pct: 0 }
}

export interface PriceBreakdown {
  perGuest: number; guests: number; listTotal: number
  /** Group Discount by the experience_discount_rules on the list price (never from the agreed price). */
  discount: number; discountPct: number; ruleTotal: number
  /** agreed total − rule total: shown as "Điều chỉnh theo thoả thuận" when not 0. */
  adjustment: number
  total: number
  /** The list price is struck out only when the final price is below it. */
  strike: boolean
}

export function priceBreakdown(input: { perGuest: number; guests: number; agreedTotal: number; rules: readonly DiscountRule[] }): PriceBreakdown {
  const rule = groupPrice(input.perGuest, input.guests, input.rules)
  const listTotal = input.perGuest * input.guests
  return {
    perGuest: input.perGuest, guests: input.guests, listTotal,
    discount: listTotal - rule.total, discountPct: rule.pct, ruleTotal: rule.total,
    adjustment: input.agreedTotal - rule.total, total: input.agreedTotal, strike: input.agreedTotal < listTotal,
  }
}

/** Group Discount rules of one experience from experience_discount_rules rows. */
export function rulesOf(rows: readonly Record<string, string>[], experienceId: string): DiscountRule[] {
  return rows.filter(row => row.experience_id === experienceId && row.rule_kind === 'Group Discount')
    .map(row => ({ pax: Number(row.pax_threshold), pct: Number(row.discount_percentage) }))
}
