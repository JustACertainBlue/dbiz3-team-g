'use client'
// "Gửi yêu cầu đặt chỗ" (mockup 04, 24): a small form, then the chat (25) opens with the request card.
// The Tour Agency never creates a Booking; the Provider does (screen 35). UI v3 decisions #1, #12.
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import GuestsInput, { guestsError } from './GuestsInput'
import './request-v3.css'

export interface RequestExperience { id: string; name: string; /** guests per slot */ max?: number }

const clock = (text: string) => text.match(/\d{2}:\d{2}/g) ?? []

export default function RequestButton({ experiences, date = '', guests = null, slotTime = '', className = 'hab-btn hab-btn--primary', label = 'Gửi yêu cầu đặt chỗ', initialOpen = false }: {
  experiences: RequestExperience[]; date?: string; guests?: number | null; slotTime?: string; className?: string; label?: string; initialOpen?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(initialOpen)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [experienceId, setExperienceId] = useState(experiences[0]?.id ?? '')
  const [day, setDay] = useState(date)
  const [size, setSize] = useState(guests ? String(guests) : '')
  const [note, setNote] = useState('')
  const max = experiences.find(item => item.id === experienceId)?.max ?? null
  const [start, end] = clock(slotTime)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (guestsError(size, max)) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/bkg/requests', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ experience_id: experienceId, date: day, slot_start: start ?? '', slot_end: end ?? '', group_size: Number(size), note }) })
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
        <p className="v3rq__cap">Gửi yêu cầu chưa mất phí. Xưởng nhận lời thì giữ chỗ 72 giờ.</p>
        {experiences.length > 1 && <label className="v3rq__f"><span>Trải nghiệm</span>
          <select value={experienceId} onChange={event => setExperienceId(event.target.value)}>{experiences.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        <label className="v3rq__f"><span>Ngày</span><input type="date" required value={day} onChange={event => setDay(event.target.value)} /></label>
        {start && <p className="v3rq__cap">Ca đã chọn: <b>{start}–{end}</b></p>}
        <label className="v3rq__f" htmlFor="v3rq-g"><span>Số khách</span><GuestsInput id="v3rq-g" value={size} max={max} onChange={setSize} /></label>
        <label className="v3rq__f"><span>Ghi chú (không bắt buộc)</span><textarea rows={3} maxLength={500} value={note} onChange={event => setNote(event.target.value)} /></label>
        {error && <p role="alert" className="v3rq__err">{error}</p>}
        <div className="v3rq__row">
          <button type="button" className="hab-btn hab-btn--secondary" onClick={() => setOpen(false)} disabled={busy}>Đóng</button>
          <button type="submit" className="hab-btn hab-btn--primary" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</button>
        </div>
      </form>
    </div>}
  </>
}
