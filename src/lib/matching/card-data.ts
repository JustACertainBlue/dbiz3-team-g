// Card data for screen 22 (mockup 22): the same view as the result card of screen 02 (image, craft, tags, highlights,
// group price), built with the existing resultView / priceFor. Display data only; selection and ranking are untouched.
import type { ExploreSeed } from '../explore/catalog'
import { eligibleRows } from '../explore/catalog'
import { resultView, type ResultView } from '../explore/v3-search'
import { rowCraft } from '../explore/vocabulary'

/** The matching route only serves Tour Agencies, so the group price is shown (isAgency = true). */
export function matchingCardView(seed: ExploreSeed, experienceId: string, guests: number | null): ResultView | null {
  const row = eligibleRows(seed).find(item => item.experience.experience_id === experienceId)
  return row ? resultView(seed, row, { date: '', guests }, true) : null
}

/** The group size the AI understood (tour_preference_profile.hard_constraints.group_size); null when unknown. */
export function profileGuests(profile: any): number | null {
  const size = profile?.hard_constraints?.group_size
  return Number.isInteger(size) && size > 0 ? size : null
}

/** The craft label shown on the card (village editorial_craft, else the Vietnamese label of craft_type); used by the explanation. */
export function craftDisplay(seed: ExploreSeed, experienceId: string): string | undefined {
  const row = eligibleRows(seed).find(item => item.experience.experience_id === experienceId)
  return row ? rowCraft(row.version.craft_type, row.village) : undefined
}
