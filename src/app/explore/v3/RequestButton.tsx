'use client'
// "Gửi yêu cầu đặt chỗ" (mockup 04, 24): a small form, then the chat (25) opens with the request card.
// The Tour Agency never creates a Booking; the Provider does (screen 35). UI v3 decisions #1, #12.
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HOLD_HOURS } from '@/lib/provider/hold-hours'
import { useHydrated } from '@/app/provider/v3/useHydrated'
import GuestsInput, { guestsError } from './GuestsInput'
import './request-v3.css'

export interface FreeSlotOption { start: string; end: string; label: string }
export interface RequestExperience { id: string; name: string; /** guests per slot */ max?: number }

const clock = (text: string) => text.match(/\d{2}:\d{2}/g) ?? []

export default function RequestButton({ experiences, date = '', guests = null, slotTime = '', className = 'hab-btn hab-btn--primary', label = 'Gửi yêu cầu đặt chỗ', initialOpen = false, initialSlots }: {
  experiences: RequestExperience[]; date?: string; guests?: number | null; slotTime?: string; className?: string; label?: string; initialOpen?: boolean
  /** test seam: skip the fetch and start with these free slots */ initialSlots?: FreeSlotOption[]
}) {
  const router = useRouter()
  const hydrated = useHydrated()
  const [open, setOpen] = useState(initialOpen)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [experienceId, setExperienceId] = useState(experiences[0]?.id ?? '')
  const [day, setDay] = useState(date)
  const [size, setSize] = useState(guests ? String(guests) : '')
  // A free slot of the chosen day is required (21/11). null = still loading / no date yet.
  const [slots, setSlots] = useState<FreeSlotOption[] | null>(initialSlots ?? null)
  const [slotStart, setSlotStart] = useState(clock(slotTime)[0] ?? '')
  const [note, setNote] = useState('')
  const max = experiences.find(item => item.id === experienceId)?.max ?? null
  useEffect(() => {
    if (!open || !day || initialSlots) return
    let cancelled = false
    setSlots(null)
    fetch(`/api/bkg/requests/slots?experience_id=${encodeURIComponent(experienceId)}&date=${encodeURIComponent(day)}`)
      .then(response => response.json())
      .then(body => { if (!cancelled) setSlots(body.data?.slots ?? []) })
      .catch(() => { if (!cancelled) setSlots([]) })
    return () => { cancelled = true }
  }, [open, day, experienceId, initialSlots])
  const chosen = slots?.find(slot => slot.start === slotStart) ?? null
  const noSlots = Boolean(day) && slots !== null && slots.length === 0

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (guestsError(size, max) || !chosen) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/bkg/requests', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ experience_id: experienceId, date: day, slot_start: chosen.start, slot_end: chosen.end, group_size: Number(size), note }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error?.message || 'Yêu cầu chưa gửi được')
      router.push(`/messages?chat_session_id=${encodeURIComponent(body.data.chat_session_id)}`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Yêu cầu chưa gửi được'); setBusy(false) }
  }
  return <>
    <button type="button" className={className} onClick={() => setOpen(true)}>{label}</button>
    {open && <div className="v3rq" role="dialog" aria-modal="true" aria-labelledby="v3rq-t">
      <form className="v3rq__box" method="post" onSubmit={submit}>
        <h2 id="v3rq-t" className="v3rq__t">Gửi yêu cầu đặt chỗ</h2>
        <p className="v3rq__cap">Gửi yêu cầu chưa mất phí. Xưởng nhận lời thì giữ chỗ {HOLD_HOURS} giờ.</p>
        {experiences.length > 1 && <label className="v3rq__f"><span>Trải nghiệm</span>
          <select value={experienceId} onChange={event => setExperienceId(event.target.value)}>{experiences.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        <label className="v3rq__f"><span>Ngày</span><input type="date" required value={day} onChange={event => setDay(event.target.value)} /></label>
        {noSlots
          ? <p className="v3rq__err" role="alert">Ngày này xưởng không có ca trống</p>
          : <label className="v3rq__f" htmlFor="v3rq-slot"><span>Ca</span>
            <select id="v3rq-slot" required value={chosen ? chosen.start : ''} onChange={event => setSlotStart(event.target.value)} disabled={slots === null}>
              <option value="">{!day ? 'Chọn ngày trước' : slots === null ? 'Đang tải ca…' : 'Chọn ca'}</option>
              {(slots ?? []).map(slot => <option key={slot.start} value={slot.start}>{slot.label} {slot.start}–{slot.end}</option>)}
            </select></label>}
        <label className="v3rq__f" htmlFor="v3rq-g"><span>Số khách</span><GuestsInput id="v3rq-g" value={size} max={max} onChange={setSize} /></label>
        <label className="v3rq__f"><span>Ghi chú (không bắt buộc)</span><textarea rows={3} maxLength={500} value={note} onChange={event => setNote(event.target.value)} /></label>
        {error && <p role="alert" className="v3rq__err">{error}</p>}
        <div className="v3rq__row">
          <button type="button" className="hab-btn hab-btn--secondary" onClick={() => setOpen(false)} disabled={busy}>Đóng</button>
          <button type="submit" className="hab-btn hab-btn--primary" disabled={!hydrated || busy || !chosen}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</button>
        </div>
      </form>
    </div>}
  </>
}
