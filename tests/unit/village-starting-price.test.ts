import { describe, expect, it } from 'vitest'
import { villageStartingPrices, withVillageStartingPrices } from '@/lib/village-starting-price'

describe('villageStartingPrices', () => {
  it('uses the lowest known activity price and ignores missing or invalid values', () => {
    const prices = villageStartingPrices([
      { village_id: 'v1', price_per_person: 180000 },
      { village_id: 'v1', price_per_person: null },
      { village_id: 'v1', price_per_person: 75000 },
      { village_id: 'v1', price_per_person: Number.NaN },
      { village_id: 'v2', price_per_person: null },
      { village_id: 'v3', price_per_person: 0 },
    ])

    expect(prices.get('v1')).toBe(75000)
    expect(prices.get('v2')).toBeNull()
    expect(prices.get('v3')).toBe(0)
  })

  it('replaces card prices with values derived from the supplied activity data', () => {
    const cards = withVillageStartingPrices(
      [{ village_id: 'v1', starting_price: 150000 }, { village_id: 'v2', starting_price: 50000 }],
      new Map([['v1', 60000]]),
    )

    expect(cards).toEqual([
      { village_id: 'v1', starting_price: 60000 },
      { village_id: 'v2', starting_price: null },
    ])
  })
})
