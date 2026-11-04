import { describe, expect, it } from 'vitest'
import { nextVillageFilter } from '@/app/admin/village-filter-state'

// T055 (A7): the village filter after a role switch (FR-005, BR-004).
const BT = '20896522-6235-5699-aeaf-f48b8150d895'
const HT = '6dfbb5e9-f92e-58a0-b090-d67cea160f62'

describe('T055 | A7 nextVillageFilter', () => {
  it('UBND → its assigned village', () => {
    expect(nextVillageFilter({ villageId: null, locked: false }, { isLocked: true, assignedVillageId: HT })).toEqual({ villageId: HT, locked: true })
  })

  it('HDT after UBND (previous filter was the locked village) → All Villages', () => {
    expect(nextVillageFilter({ villageId: HT, locked: true }, { isLocked: false, assignedVillageId: null })).toEqual({ villageId: null, locked: false })
  })

  it('HDT keeps a village it chose itself', () => {
    expect(nextVillageFilter({ villageId: BT, locked: false }, { isLocked: false, assignedVillageId: null })).toEqual({ villageId: BT, locked: false })
  })
})
