// Search bar of mockup 01/21/02/04 (human decision 2026-11-18 #1): a GET form to /explore/search.
import React from 'react'
import { CalendarDays, Search, Users } from 'lucide-react'
import { GuestsField } from './GuestsInput'

export default function SearchBar({ q = '', date = '', guests = '', label = 'Tìm trải nghiệm' }: { q?: string; date?: string; guests?: string; label?: string }) {
  return <form role="search" aria-label={label} className="v3-sbar" action="/explore/search" method="get">
    <label className="v3-seg v3-seg--q"><Search aria-hidden="true" /><span className="v3-sv"><span className="v3-sl">Bạn muốn trải nghiệm nghề gì?</span>
      <input name="q" defaultValue={q} placeholder="Nhập nghề, làng hoặc từ khoá" /></span></label>
    <label className="v3-seg"><CalendarDays aria-hidden="true" /><span className="v3-sv"><span className="v3-sl">Ngày đưa đoàn đi</span>
      <input name="date" type="date" defaultValue={date} /></span></label>
    <label className="v3-seg"><Users aria-hidden="true" /><span className="v3-sv"><span className="v3-sl">Số khách trong đoàn</span>
      <GuestsField id="v3-sbar-guests" name="guests" defaultValue={guests} max={null} /></span></label>
    <button type="submit" className="v3-sbtn">Tìm</button>
  </form>
}
