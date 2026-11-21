// Screen 35 shows the list price with the Group Discount and does not let the Provider edit it (no price column
// other than agreed_price_total exists). Same rule as explore/v3-search priceFor: the best reached threshold wins.
export interface DiscountRule { pax: number; pct: number }
export interface GroupPrice { total: number; old: number | null; pct: number }

export function groupPrice(perGuest: number, guests: number, rules: readonly DiscountRule[]): GroupPrice {
  const full = perGuest * guests
  const reached = rules.filter(rule => guests >= rule.pax).sort((a, b) => b.pct - a.pct)[0]
  return reached ? { total: Math.round(full * (100 - reached.pct) / 100), old: full, pct: reached.pct } : { total: full, old: null, pct: 0 }
}
