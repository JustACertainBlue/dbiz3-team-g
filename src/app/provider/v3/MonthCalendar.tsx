'use client'
// Month calendar of screens 29 (full: names and guests in the cells) and 30/33 (compact: day numbers only), with the
// "Ngày đã chọn" panel. Cells are computed on the server (src/lib/provider/month-calendar.ts); this only draws and navigates.
import React, { useState } from 'react'
import Link from 'next/link'
import type { DayCell } from '@/lib/provider/month-calendar'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const LONG = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
const LEGEND: Array<[string, string]> = [['free', 'Còn trống'], ['hold', 'Có đoàn giữ chỗ'], ['booked', 'Đã có đoàn'], ['closed', 'Xưởng nghỉ']]
const shortName = (name?: string) => name ?? ''

function longDate(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return `${LONG[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}
const isoWeekday = (date: string) => { const w = new Date(`${date}T12:00:00Z`).getUTCDay(); return w === 0 ? 7 : w }

export default function MonthCalendar({ cells, today, variant, hoursByWeekday, bookingHref, scheduleHref, bookingsHref }: {
  cells: DayCell[]; today: string; variant: 'full' | 'compact'
  /** ISO weekday (1-7) → "08:00 – 17:00"; missing = closed. */
  hoursByWeekday: Record<number, string>
  bookingHref: string; scheduleHref: string; bookingsHref?: string
}) {
  const months = Array.from(new Set(cells.map(cell => cell.date.slice(0, 7))))
  const todayMonth = today.slice(0, 7)
  const [month, setMonth] = useState(months.includes(todayMonth) ? todayMonth : months[0])
  const byDate = new Map(cells.map(cell => [cell.date, cell]))
  const firstFree = cells.find(cell => cell.date >= today && cell.state !== 'closed')
  const [selected, setSelected] = useState<string>(byDate.has(today) ? today : (firstFree?.date ?? cells[0]?.date))
  const index = months.indexOf(month)
  const monthCells = cells.filter(cell => cell.date.startsWith(month))
  const offset = monthCells.length ? isoWeekday(monthCells[0].date) - 1 : 0
  const [year, mm] = month.split('-')
  const current = byDate.get(selected)
  const full = variant === 'full'
  const chevron = (dir: 'prev' | 'next') => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={dir === 'prev' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} /></svg>
  return <div className={`pv3-cal pv3-cal--${variant}`}>
    <div className="pv3-cal__main">
      <div className="pv3-cal__nav">
        <button type="button" className="pv3-iconbtn" aria-label="Tháng trước" disabled={index <= 0} onClick={() => setMonth(months[index - 1])}>{chevron('prev')}</button>
        <strong>Tháng {mm}/{year}</strong>
        <button type="button" className="pv3-iconbtn" aria-label="Tháng sau" disabled={index >= months.length - 1} onClick={() => setMonth(months[index + 1])}>{chevron('next')}</button>
      </div>
      <ul className="pv3-cal__legend">{LEGEND.map(([key, text]) => <li key={key}><i className={`pv3-cal__dot pv3-cal__dot--${key}`} />{text}</li>)}<li><i className="pv3-cal__dot pv3-cal__dot--selected" />Ngày đang chọn</li></ul>
      <div className="pv3-cal__grid" role="grid" aria-label={`Lịch tháng ${mm}/${year}`}>
        {WEEKDAYS.map(day => <div key={day} className="pv3-cal__wd" role="columnheader">{day}</div>)}
        {Array.from({ length: offset }, (_, i) => <span key={`o${i}`} />)}
        {monthCells.map(cell => {
          const day = Number(cell.date.slice(8))
          const stateText = { free: 'còn trống', hold: 'có đoàn giữ chỗ', booked: 'đã có đoàn', closed: 'xưởng nghỉ' }[cell.state]
          return <button key={cell.date} type="button" role="gridcell" aria-selected={cell.date === selected}
            aria-label={`${longDate(cell.date)}, ${stateText}${cell.guests ? `, ${cell.guests} khách` : ''}`}
            className={`pv3-cal__day pv3-cal__day--${cell.state}${cell.past ? ' is-past' : ''}${cell.date === selected ? ' is-selected' : ''}`} onClick={() => setSelected(cell.date)}>
            <b>{day}</b>
            {full && cell.guests ? <><span className="pv3-cal__sub">{cell.state === 'hold' ? shortName(cell.label) : shortName(cell.label)}</span><span className="pv3-cal__sub pv3-cal__sub--s">{cell.state === 'hold' ? 'Chờ thanh toán' : `${cell.guests} khách`}</span></> : null}
          </button>
        })}
      </div>
    </div>
    {current && <aside className="pv3-cal__panel" aria-live="polite">
      <p className="pv3-cal__eyebrow">NGÀY ĐÃ CHỌN</p>
      <h3 className="pv3-cal__date">{longDate(current.date)}</h3>
      {current.guests
        ? <>
            <p className="pv3-cal__strong">{full ? `${shortName(current.label)} · ${current.guests} khách` : current.state === 'hold' ? 'Có đoàn giữ chỗ' : 'Đã có đoàn'}</p>
            {full && <p className="pv3-cal__muted">{current.state === 'hold' ? 'Đang giữ chỗ, chờ thanh toán' : 'Đã đặt chỗ'} · {current.startTime}</p>}
            {full && <Link className="pv3-link" href={bookingHref.replace('__ID__', current.bookingId ?? '')}>Xem đặt chỗ ›</Link>}
            {!full && <Link className="pv3-link" href={scheduleHref}>Mở lịch xưởng ›</Link>}
          </>
        : current.state === 'closed' || !hoursByWeekday[isoWeekday(current.date)]
          ? <p className="pv3-cal__strong">Xưởng nghỉ</p>
          : <>
              <p className="pv3-cal__strong">Còn trống · {hoursByWeekday[isoWeekday(current.date)]}</p>
              {!full && <p className="pv3-cal__muted">Xưởng còn nhận một đoàn trong ngày này.</p>}
              {!full && <Link className="pv3-link" href={scheduleHref}>Mở lịch xưởng ›</Link>}
            </>}
    </aside>}
  </div>
}
