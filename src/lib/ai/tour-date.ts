import { hanoiDate, isQueryDate } from '@/lib/booking/clock'

// Issue #156 (spec-AIT FR-003: "Do not invent extracted requirements"): read the first date the
// Agency wrote. A date with a year is kept as written; a date without a year is its next upcoming
// occurrence counted from today in Asia/Ho_Chi_Minh (today itself included). A date that does not
// exist (31/02, 12/20 read as day 12 of month 20) is not extracted, so the follow-up question asks.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const MONTH = String.raw`(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?`
const ORDINAL = '(?:st|nd|rd|th)?'
const YEAR = String.raw`(?:,?\s*(\d{4})\b)?`

const DATE_PATTERN = new RegExp(
  [
    String.raw`\b(\d{4})-(\d{2})-(\d{2})\b`,
    String.raw`\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b`,
    String.raw`\b${MONTH}\s*(\d{1,2})${ORDINAL}\b${YEAR}`,
    String.raw`\b(\d{1,2})${ORDINAL}\s*(?:of\s+)?${MONTH}(?![a-z])${YEAR}`,
  ].join('|'),
  'i',
)

const pad = (n: number) => String(n).padStart(2, '0')
const monthNumber = (name: string) => MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1

function resolve(day: number, month: number, year: number | undefined, today: string): string | undefined {
  if (year !== undefined) {
    const date = `${year}-${pad(month)}-${pad(day)}`
    return isQueryDate(date) ? date : undefined
  }
  const thisYear = Number(today.slice(0, 4))
  // Up to four years ahead so 29 Feb finds the next leap year.
  for (let y = thisYear; y <= thisYear + 4; y++) {
    const date = `${y}-${pad(month)}-${pad(day)}`
    if (isQueryDate(date) && date >= today) return date
  }
  return undefined
}

export function extractTourDate(text: string, now: Date): string | undefined {
  const m = text.match(DATE_PATTERN)
  if (!m) return undefined
  const today = hanoiDate(now.getTime())
  const num = (i: number) => (m[i] === undefined ? undefined : Number(m[i]))
  if (m[1]) return resolve(num(3)!, num(2)!, num(1), today)
  if (m[4]) return resolve(num(4)!, num(5)!, num(6), today)
  if (m[7]) return resolve(num(8)!, monthNumber(m[7]), num(9), today)
  return resolve(num(10)!, monthNumber(m[11]), num(12), today)
}
