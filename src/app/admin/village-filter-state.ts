// A7 (FR-005, BR-004): village filter after the villages response for the current actor.
// A UBND actor is locked to its assigned village; when an unlocked (HDT) response follows a locked
// village, the filter returns to All Villages; a village HDT chose itself is kept.
export interface VillageFilterState {
  villageId: string | null
  locked: boolean
}

export function nextVillageFilter(
  previous: VillageFilterState,
  response: { isLocked: boolean; assignedVillageId: string | null }
): VillageFilterState {
  if (response.isLocked) return { villageId: response.assignedVillageId, locked: true }
  if (previous.locked) return { villageId: null, locked: false }
  return { villageId: previous.villageId, locked: false }
}
