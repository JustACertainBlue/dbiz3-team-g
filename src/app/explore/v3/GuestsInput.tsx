'use client'
// Number of guests of a booking request: a numeric input, not a select (human decision 21/11). Used by the booking flow
// only (04 "Giá & lịch trống", the request form of 04/24, 35 create and edit). The shared search bars keep their select.
import React, { useState } from 'react'
import './guests-v3.css'

/** '' when the value is fine or empty (the `required` attribute covers empty); otherwise the message under the field. */
export function guestsError(value: string, max: number | null): string {
  if (value.trim() === '') return ''
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1) return 'Nhập số khách từ 1'
  if (max !== null && number > max) return `Tối đa ${max} khách mỗi ca`
  return ''
}

export default function GuestsInput({ id, name, value, max, onChange, required = true, className }: {
  id: string; name?: string; value: string; max: number | null; onChange: (value: string) => void; required?: boolean; className?: string
}) {
  const error = guestsError(value, max)
  return <>
    <input id={id} name={name} className={className} type="number" inputMode="numeric" min={1} max={max ?? undefined} step={1} required={required}
      value={value} onChange={event => onChange(event.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} />
    {error && <span id={`${id}-err`} role="alert" className="v3-gerr">{error}</span>}
  </>
}

/** Uncontrolled wrapper for plain GET forms of server pages (04): keeps its own value and shows the same message. */
export function GuestsField({ id, name, defaultValue, max, required = false }: { id: string; name: string; defaultValue: string; max: number | null; required?: boolean }) {
  const [value, setValue] = useState(defaultValue)
  return <GuestsInput id={id} name={name} value={value} max={max} onChange={setValue} required={required} />
}
