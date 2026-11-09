/**
 * Issue #156 — a date without a year is the next upcoming occurrence (from the server's "today"
 * in Asia/Ho_Chi_Minh), never a fixed date; a date with an explicit year is kept as written.
 * spec-AIT FR-003 (docs/spec/specs/spec-AIT.md:234): "Do not invent extracted requirements".
 * Decision (linhkhanh-vu, 09/11): next upcoming occurrence; the extracted date is shown so the
 * Agency can correct it.
 */
import { describe, expect, it } from 'vitest'
import { extractTourContext } from '@/lib/ai/extractor'
import { understoodDateLine } from '@/app/ai-matching/matching-view'

// 2026-11-09 10:00 in Hanoi.
const NOV_9 = () => new Date('2026-11-09T03:00:00Z')

async function dateOf(text: string, now: () => Date = NOV_9) {
  const result = await extractTourContext([{ sender: 'Agency', text }], { now })
  return result.tour_context.target_date_or_range?.start_date
}

describe('#156 | date without a year → next upcoming occurrence', () => {
  it.each([
    ['Dec 20', '2026-12-20'],
    ['December 20th', '2026-12-20'],
    ['20 Dec', '2026-12-20'],
    ['20/12', '2026-12-20'],
  ])('"%s" on 2026-11-09 → %s', async (text, expected) => {
    expect(await dateOf(`12 pax, pottery, on ${text}, from Hoàn Kiếm`)).toBe(expected)
  })

  it.each([
    ['Mar 5', '2027-03-05'],
    ['5/3', '2027-03-05'],
    ['Nov 8', '2027-11-08'],
  ])('a date already past this year: "%s" → next year %s', async (text, expected) => {
    expect(await dateOf(`12 pax on ${text}`)).toBe(expected)
  })

  it('today itself is still upcoming: "Nov 9" on 2026-11-09 → 2026-11-09', async () => {
    expect(await dateOf('12 pax on Nov 9')).toBe('2026-11-09')
  })

  it('uses the injected clock, not a fixed date: "Dec 20" on 2026-12-25 → 2027-12-20', async () => {
    expect(await dateOf('12 pax on Dec 20', () => new Date('2026-12-25T03:00:00Z'))).toBe('2027-12-20')
  })

  it('"today" is the Hanoi calendar day: 2026-12-20 17:30 UTC is already 21 Dec in Hanoi', async () => {
    expect(await dateOf('12 pax on Dec 20', () => new Date('2026-12-20T17:30:00Z'))).toBe('2027-12-20')
  })

  it('never returns the old hard-coded 2026-11-10 for a named month', async () => {
    expect(await dateOf('12 pax on Jan 15')).toBe('2027-01-15')
  })
})

describe('#156 | a date with an explicit year is unchanged', () => {
  it.each([
    ['2027-12-20', '2027-12-20'],
    ['20/12/2027', '2027-12-20'],
    ['Dec 20, 2027', '2027-12-20'],
    ['20 Dec 2025', '2025-12-20'],
  ])('"%s" → %s', async (text, expected) => {
    expect(await dateOf(`12 pax on ${text}`)).toBe(expected)
  })
})

describe('#156 | no invented date', () => {
  it('an impossible date ("31/02") is not extracted, so the date follow-up question is asked', async () => {
    const result = await extractTourContext([{ sender: 'Agency', text: '12 pax on 31/02 from Hoàn Kiếm, pottery' }], { now: NOV_9 })
    expect(result.tour_context.target_date_or_range).toBeUndefined()
    expect(result.follow_up_questions.some(q => /date/i.test(q))).toBe(true)
  })
})

describe('#156 | the extracted date is shown so the Agency can correct it', () => {
  it('names the date the assistant understood and how to change it', () => {
    const body = { extraction: { tour_context: { target_date_or_range: { start_date: '2026-12-20' } } } }
    expect(understoodDateLine(body)).toBe('Tour date understood: Sun 20 Dec 2026. If this is wrong, send the correct date with the year.')
  })

  it('shows nothing when no date was extracted or the response has no extraction', () => {
    expect(understoodDateLine({ extraction: { tour_context: {} } })).toBeNull()
    expect(understoodDateLine(null)).toBeNull()
  })
})
