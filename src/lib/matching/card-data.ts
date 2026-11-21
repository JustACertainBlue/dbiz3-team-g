// Card data for screen 22 (mockup 22): the same view as the result card of screen 02 (image, craft, tags, highlights,
// group price), built with the existing resultView / priceFor. Display data only; selection and ranking are untouched.
import type { ExploreSeed } from '../explore/catalog'
import { eligibleRows } from '../explore/catalog'
import { resultView, type ResultView } from '../explore/v3-search'

/** The matching route only serves Tour Agencies, so the group price is shown (isAgency = true). */
export function matchingCardView(seed: ExploreSeed, experienceId: string, guests: number | null): ResultView | null {
  const row = eligibleRows(seed).find(item => item.experience.experience_id === experienceId)
  return row ? resultView(seed, row, { date: '', guests }, true) : null
}
