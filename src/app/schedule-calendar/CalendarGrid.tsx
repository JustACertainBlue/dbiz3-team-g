import Link from 'next/link'
import { hanoiClock, hanoiDate } from '@/lib/time/hanoi-time'
import { statusLabel } from '@/lib/status-labels'

// Shared CSS-grid calendar (#70) for SCH139, SCH140 and SCH141: one row per local day, a 00:00–24:00
// timeline, each block sized by its duration and labelled with its status text (not colour alone).
// Route-less folder (no page.tsx), so both phases can import it.
export interface CalendarGridBlock {
  start_at: string
  end_at: string
  status: string // any status, shown as written (Available, On hold, Booked, Unavailable, Completed, Cancelled)
  booking_id?: string
}

const DAY_MS = 86_400_000
const statusClass = (status: string) => `cal-${status.toLowerCase().replace(/\s+/g, '-')}`
// Design wave 2: calendar cells use the shared Vietnamese labels (calendar statuses first, then Booking statuses).
const calendarLabel = (status: string) => { const own = statusLabel('calendar', status); return own !== status ? own : statusLabel('booking', status) }

export default function CalendarGrid({ days, blocks, selectedDate, hrefFor }: {
  days: string[]
  blocks: CalendarGridBlock[]
  selectedDate?: string
  hrefFor?: (block: CalendarGridBlock) => string | undefined
}) {
  return <div className="cal-grid">
    {days.map(day => {
      const dayStart = Date.parse(`${day}T00:00:00+07:00`)
      const own = blocks.filter(block => hanoiDate(block.start_at) === day)
      return <section key={day} className={`cal-row${day === selectedDate ? ' cal-selected' : ''}`} aria-label={day}>
        <h3>{day}</h3>
        <div className="cal-track">
          {own.map(block => {
            const left = ((Date.parse(block.start_at) - dayStart) / DAY_MS) * 100
            const width = ((Date.parse(block.end_at) - Date.parse(block.start_at)) / DAY_MS) * 100
            const label = `${hanoiClock(block.start_at)}–${hanoiDate(block.end_at) === day ? hanoiClock(block.end_at) : '24:00'} ${calendarLabel(block.status)}`
            const href = hrefFor?.(block)
            const style = { left: `${left}%`, width: `${width}%` }
            return href
              ? <Link key={`${block.start_at}-${block.booking_id ?? block.status}`} href={href} className={`cal-block ${statusClass(block.status)}`} style={style} title={label}><span>{label}</span></Link>
              : <span key={`${block.start_at}-${block.booking_id ?? block.status}`} className={`cal-block ${statusClass(block.status)}`} style={style} title={label}><span>{label}</span></span>
          })}
        </div>
      </section>
    })}
  </div>
}

export const calendarStyles = `.cal-grid{display:grid;gap:6px;margin-top:16px}.cal-row{display:grid;grid-template-columns:110px 1fr;gap:10px;align-items:center}.cal-row h3{margin:0;font-size:13px}.cal-selected h3{color:#9a4a2a}.cal-selected .cal-track{outline:2px solid #9a4a2a}.cal-track{position:relative;height:40px;background:#f4efe5;border-radius:8px;overflow:hidden}.cal-block{position:absolute;top:0;bottom:0;display:flex;align-items:center;padding:0 4px;font-size:11px;border-right:1px solid white;overflow:hidden;white-space:nowrap;color:#1e2f27;text-decoration:none}.cal-block span{overflow:hidden;text-overflow:ellipsis}.cal-available{background:var(--color-status-calendar-available-bg);color:var(--color-status-calendar-available-fg)}.cal-unavailable{background:var(--color-status-calendar-unavailable-bg);color:var(--color-status-calendar-unavailable-fg)}.cal-on-hold{background:var(--color-status-calendar-onhold-bg);color:var(--color-status-calendar-onhold-fg);font-weight:700}.cal-booked{background:var(--color-status-calendar-booked-bg);color:var(--color-status-calendar-booked-fg);box-shadow:inset 0 0 0 2px var(--color-status-calendar-booked-border);font-weight:700}.cal-completed{background:var(--color-status-booking-completed-bg);color:var(--color-status-booking-completed-fg)}.cal-cancelled{background:var(--color-status-booking-cancelled-bg);color:var(--color-status-booking-cancelled-fg);text-decoration:line-through}@media(max-width:720px){.cal-row{grid-template-columns:1fr}.cal-track{height:auto;display:flex;flex-wrap:wrap;gap:4px;background:none}.cal-block{position:static;width:auto!important;padding:6px 8px;border-radius:999px}}`
