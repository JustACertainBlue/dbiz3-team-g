export function villageStartingPrices(
  activities: readonly {
    village_id?: string | null
    price_per_person?: number | null
  }[],
): Map<string, number | null> {
  const prices = new Map<string, number | null>()

  for (const activity of activities) {
    if (!activity.village_id) continue
    const price = activity.price_per_person
    const current = prices.get(activity.village_id)

    if (typeof price === 'number' && Number.isFinite(price) && price >= 0) {
      if (current == null || price < current) prices.set(activity.village_id, price)
    } else if (!prices.has(activity.village_id)) {
      prices.set(activity.village_id, null)
    }
  }

  return prices
}

export function withVillageStartingPrices<T extends { village_id: string; starting_price?: number | null }>(
  cards: readonly T[],
  prices: ReadonlyMap<string, number | null>,
): Array<T & { starting_price: number | null }> {
  return cards.map(card => ({
    ...card,
    starting_price: prices.get(card.village_id) ?? null,
  }))
}
