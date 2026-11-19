'use client'
// "Lịch trống" of mockup 24: month grid (5 states) with the selected day panel. Month changes are links (?thang=);
// the day choice stays in the page. "Gửi yêu cầu đặt ngày này" belongs to the booking flow (ui/v3-booking), shown
// disabled in Đợt 1 (human decision 2026-11-18 #3).
import React, { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DAY_STATUS, type MonthCalendar as Month } from '@/lib/explore/v3-provider'

const LONG = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

export default function MonthCalendar({ month, basePath, isAgency, initial }: { month: Month; basePath: string; isAgency: boolean; initial: string }) {
  const firstFree = month.days.find(day => day.state === 'free')?.date ?? ''
  const [selected, setSelected] = useState(month.days.some(day => day.date === initial && day.state !== 'past') ? initial : firstFree)
  const day = month.days.find(item => item.date === selected)
  const long = day ? `${LONG[new Date(`${day.date}T00:00:00Z`).getUTCDay()]}, ${day.date.slice(8, 10)}/${day.date.slice(5, 7)}/${day.date.slice(0, 4)}` : ''
  return <div className="v3p-cal">
    <div className="v3-card v3p-cal__main">
      <div className="v3p-cal__head">
        <Link href={`${basePath}?thang=${month.prev}#lich`} className="v3p-cal__nav" aria-label="Tháng trước" scroll={false}><ChevronLeft aria-hidden="true" /></Link>
        <h3>{month.title}</h3>
        <Link href={`${basePath}?thang=${month.next}#lich`} className="v3p-cal__nav" aria-label="Tháng sau" scroll={false}><ChevronRight aria-hidden="true" /></Link>
      </div>
      <div className="v3p-legend">
        <span className="v3p-lg"><i className="v3p-sw m-free" />Còn trống</span><span className="v3p-lg"><i className="v3p-sw m-hold" />Có đoàn giữ chỗ</span>
        <span className="v3p-lg"><i className="v3p-sw m-busy" />Đã có đoàn</span><span className="v3p-lg"><i className="v3p-sw m-off" />Xưởng nghỉ</span>
        <span className="v3p-lg"><i className="v3p-sw m-sel" />Ngày đang chọn</span>
      </div>
      <div className="v3p-mgrid">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(name => <span key={name} className="v3p-wd">{name}</span>)}
        {Array.from({ length: month.leading }, (_, i) => <span key={`b${i}`} className="v3p-mc m-blank" aria-hidden="true" />)}
        {month.days.map(item => {
          const selectable = item.state !== 'past'
          return <button key={item.date} type="button" className={`v3p-mc m-${item.state}${item.date === selected ? ' m-sel' : ''}`} disabled={!selectable}
            aria-label={`${item.day}/${month.month.slice(5)} ${item.state === 'past' ? '' : DAY_STATUS[item.state].label}`.trim()} aria-pressed={item.date === selected} onClick={() => setSelected(item.date)}>
            <b>{item.day}</b>
          </button>
        })}
      </div>
    </div>
    <aside className="v3-card v3p-cal__side">
      {day ? <>
        <p className="v3p-cal__eb">NGÀY ĐÃ CHỌN</p>
        <p className="v3p-cal__date">{long}</p>
        <p className={day.state === 'free' ? 'v3-av-ok' : 'v3-av-warn'}>{DAY_STATUS[day.state].label}{day.state === 'free' && day.hours ? ` · ${day.hours}` : ''}</p>
        <p className="v3p-cal__note">{DAY_STATUS[day.state].note}</p>
        {day.state === 'free' && (isAgency
          ? <button type="button" className="hab-btn hab-btn--primary" disabled title="Luồng đặt chỗ đang được làm">Gửi yêu cầu đặt ngày này</button>
          : <Link className="hab-btn hab-btn--primary" href="/login">Đăng nhập để đặt chỗ</Link>)}
        {day.state === 'free' && <p className="v3-cap">Không mất phí. Xưởng nhận lời thì giữ chỗ 72 giờ để bạn thanh toán.</p>}
      </> : <p className="v3p-cal__note">Chọn một ngày còn trống trên lịch.</p>}
    </aside>
  </div>
}
