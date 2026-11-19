'use client'
// Filters of mockup 02: every change updates the URL (GET parameters) and the server renders the new results.
import React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Facet } from '@/lib/explore/v3-search'

export default function FilterPanel({ crafts, durations, villages, fit, cap15, free, guests, dateLabel }: {
  crafts: Facet[]; durations: Facet[]; villages: Facet[]; fit: number; cap15: number; free: number; guests: number | null; dateLabel: string
}) {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams()
  const go = (change: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString()); next.delete('page'); change(next)
    router.push(`${pathname}?${next.toString()}`, { scroll: false })
  }
  const toggle = (key: string, value: string) => go(next => {
    const values = next.getAll(key); next.delete(key)
    for (const item of values.includes(value) ? values.filter(v => v !== value) : [...values, value]) next.append(key, item)
  })
  const flag = (key: string, on: string, checked: boolean, off?: string) => go(next => { if (checked) next.set(key, on); else if (off) next.set(key, off); else next.delete(key) })
  const budget = (key: string, value: string) => go(next => { const digits = value.replace(/[^\d]/g, ''); if (digits) next.set(key, digits); else next.delete(key) })
  const money = (key: string) => { const v = params.get(key); return v ? Number(v).toLocaleString('vi-VN') : '' }
  // Human review 2026-11-19: an option with 0 results is hidden unless it is selected; an empty group is hidden.
  const option = (label: string, n: number, checked: boolean, onChange: (checked: boolean) => void) => n === 0 && !checked ? null :
    <label className="v3-opt" key={label}><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />{label}<span className="v3-opt__n">{n}</span></label>

  const group = (title: string, options: React.ReactNode[]) => options.some(Boolean) ? <div className="v3-fgroup"><h3>{title}</h3>{options}</div> : null

  return <div className="v3-card v3-filters">
    <p className="v3-filters__title">Lọc theo</p>
    {group('Nghề thủ công', crafts.map(item => option(item.label, item.n, params.getAll('nghe').includes(item.value), () => toggle('nghe', item.value))))}
    <div className="v3-fgroup"><h3>Ngân sách mỗi khách</h3>
      <div className="v3-budget">
        <label><span className="v3-cap">Từ</span><span className="v3-money"><input inputMode="numeric" defaultValue={money('tu')} aria-label="Ngân sách tối thiểu mỗi khách" onBlur={event => budget('tu', event.target.value)} onKeyDown={event => { if (event.key === 'Enter') budget('tu', event.currentTarget.value) }} /><span className="v3-cap">₫</span></span></label>
        <span aria-hidden="true" className="v3-budget__dash">–</span>
        <label><span className="v3-cap">Đến</span><span className="v3-money"><input inputMode="numeric" defaultValue={money('den')} aria-label="Ngân sách tối đa mỗi khách" onBlur={event => budget('den', event.target.value)} onKeyDown={event => { if (event.key === 'Enter') budget('den', event.currentTarget.value) }} /><span className="v3-cap">₫</span></span></label>
      </div>
    </div>
    {group('Thời lượng', durations.map(item => option(item.label, item.n, params.getAll('tg').includes(item.value), () => toggle('tg', item.value))))}
    {group('Số khách mỗi ca', [
      guests ? option(`Đón được đoàn ${guests} khách`, fit, params.get('vua') !== '0', checked => flag('vua', '1', checked, '0')) : null,
      option('Từ 15 khách trở lên', cap15, params.get('suc') === '15', checked => flag('suc', '15', checked)),
    ])}
    {dateLabel && group(`Lịch ngày ${dateLabel}`, [option('Chỉ hiện xưởng còn trống', free, params.get('trong') === '1', checked => flag('trong', '1', checked))])}
    {group('Làng nghề', villages.map(item => option(item.label, item.n, params.getAll('lang').includes(item.value), () => toggle('lang', item.value))))}
  </div>
}

export function SortSelect({ value, options }: { value: string; options: ReadonlyArray<{ value: string; label: string }> }) {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams()
  return <label className="v3-sort">Sắp xếp theo
    <select value={value} onChange={event => { const next = new URLSearchParams(params.toString()); next.delete('page'); if (event.target.value) next.set('sx', event.target.value); else next.delete('sx'); router.push(`${pathname}?${next.toString()}`, { scroll: false }) }}>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select></label>
}
