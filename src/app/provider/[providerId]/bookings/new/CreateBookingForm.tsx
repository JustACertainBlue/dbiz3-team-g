'use client'
// Screen 35 form (mockup TaoDatCho, "Tạo mới"): sections "Đoàn & trải nghiệm" and "Giá đã thống nhất".
// Booking conditions stay a snapshot of the Experience (hidden). "Điều kiện đã thống nhất" goes into the system message
// "Xưởng đã giữ chỗ"; the price per guest defaults to the list price and is editable (bookings.agreed_price_total stores the agreed total); contact columns are written by the Agency on 06.
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useMemo, useState } from 'react'
import { groupPrice, priceBreakdown, type DiscountRule } from '@/lib/booking/group-price'
import { adjustmentLine } from '@/lib/booking/display'
import GuestsInput, { guestsError } from '@/app/explore/v3/GuestsInput'

export interface ExperienceOption {
  experience_id: string; name: string; duration_minutes: number; max_participants: number; price_per_person: number
  conditions: { notice_period: number; cancellation_policy: Record<string, unknown> }
  rules?: DiscountRule[]
}
export interface AgencyOption { agency_id: string; company_name: string }
export interface SlotOption { experience_id: string; start: string; end: string; label: string }

const vnd = (value: number) => `${value.toLocaleString('vi-VN')} ₫`
const addMinutes = (clock: string, minutes: number) => {
  const total = Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5)) + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default function CreateBookingForm({ providerId, experiences, agencies, slots = [], initialAgencyId, requestMessageId, initial }: {
  providerId: string; experiences: ExperienceOption[]; agencies: AgencyOption[]; slots?: SlotOption[]; initialAgencyId?: string; requestMessageId?: string
  initial?: { experienceId?: string; date?: string; time?: string; guests?: string; perGuest?: string }
}) {
  const router = useRouter()
  const [experienceId, setExperienceId] = useState(experiences.find(e => e.experience_id === initial?.experienceId)?.experience_id ?? experiences[0]?.experience_id ?? '')
  const [agencyId, setAgencyId] = useState(agencies.find(a => a.agency_id === initialAgencyId)?.agency_id ?? agencies[0]?.agency_id ?? '')
  const [date, setDate] = useState(initial?.date ?? '')
  const [time, setTime] = useState(initial?.time ?? '')
  const [groupSize, setGroupSize] = useState(initial?.guests ?? '')
  const experience = useMemo(() => experiences.find(row => row.experience_id === experienceId), [experiences, experienceId])
  const [perGuest, setPerGuest] = useState(initial?.perGuest ?? String(experiences.find(e => e.experience_id === initial?.experienceId)?.price_per_person ?? experiences[0]?.price_per_person ?? ''))
  const [conditions, setConditions] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const experienceSlots = slots.filter(slot => slot.experience_id === experienceId)
  const duration = experience?.duration_minutes ?? 60
  const guests = Number(groupSize)
  const each = Number(perGuest)
  const price = experience && guests > 0 && each > 0 ? groupPrice(each, guests, experience.rules ?? []) : null
  // Display: the group discount follows the rules on the list price; the difference to the typed price is the adjustment.
  const shown = experience && price ? priceBreakdown({ perGuest: experience.price_per_person, guests, agreedTotal: price.total, rules: experience.rules ?? [] }) : null
  const selectExperience = (id: string) => {
    setExperienceId(id); setTime('')
    const next = experiences.find(row => row.experience_id === id)
    if (next) setPerGuest(String(next.price_per_person))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!experience || guestsError(groupSize, experience.max_participants)) return
    setError(null); setSaving(true)
    try {
      const response = await fetch('/api/bkg/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience_id: experienceId, agency_id: agencyId, start_at: `${date}T${time}:00+07:00`, duration, group_size: guests, agreed_price: price?.total,
          booking_conditions: experience.conditions, agreed_conditions: conditions, request_message_id: requestMessageId || undefined,
        }),
      })
      const json = await response.json() as { data?: { booking_id: string }; error?: { code: string; message: string } }
      if (!response.ok || !json.data) { setError(json.error?.message ?? 'Không tạo được đặt chỗ.'); return }
      router.push(`/provider/${providerId}/bookings/${json.data.booking_id}`)
    } catch { setError('Không kết nối được máy chủ. Thử lại.') } finally { setSaving(false) }
  }

  if (!experiences.length) return <p className="v3b-card">Xưởng chưa có trải nghiệm nào đang hoạt động, nên chưa tạo được đặt chỗ.</p>
  if (!agencies.length) return <p className="v3b-card">Chưa có công ty lữ hành nào đã trò chuyện với xưởng. Đặt chỗ chỉ tạo cho công ty đã nhắn tin.</p>

  return <form className="v3b-form" method="post" onSubmit={submit} onChange={() => setError(null)} aria-label="Thông tin đặt chỗ">
    <section className="v3b-card">
      <h2 className="v3b-h2">Đoàn &amp; trải nghiệm</h2>
      <div className="v3b-row">
        <div className="v3b-f"><label htmlFor="ag">Công ty lữ hành <span className="v3b-req">*</span></label>
          <select id="ag" value={agencyId} onChange={event => setAgencyId(event.target.value)} required>{agencies.map(a => <option key={a.agency_id} value={a.agency_id}>{a.company_name}</option>)}</select>
          <p className="v3b-help">Chỉ hiện công ty lữ hành đã trò chuyện với xưởng.</p></div>
        <div className="v3b-f"><label htmlFor="ex">Trải nghiệm <span className="v3b-req">*</span></label>
          <select id="ex" value={experienceId} onChange={event => selectExperience(event.target.value)} required>{experiences.map(e => <option key={e.experience_id} value={e.experience_id}>{e.name}</option>)}</select></div>
      </div>
      <div className="v3b-row">
        <div className="v3b-f"><label htmlFor="dt">Ngày <span className="v3b-req">*</span></label><input id="dt" type="date" value={date} onChange={event => setDate(event.target.value)} required /></div>
        <div className="v3b-f"><label htmlFor="tm">Giờ bắt đầu <span className="v3b-req">*</span></label>
          {experienceSlots.length
            ? <select id="tm" value={time} onChange={event => setTime(event.target.value)} required><option value="">Chọn giờ</option>{experienceSlots.map(s => <option key={`${s.start}-${s.end}`} value={s.start}>{s.start}</option>)}</select>
            : <input id="tm" type="time" value={time} onChange={event => setTime(event.target.value)} required />}
          {time && <p className="v3b-help">Kết thúc {addMinutes(time, duration)} ({duration} phút).</p>}</div>
        <div className="v3b-f"><label htmlFor="gs">Số khách <span className="v3b-req">*</span></label>
          <GuestsInput id="gs" value={groupSize} max={experience?.max_participants ?? null} onChange={setGroupSize} />
          <p className="v3b-help">Tối đa {experience?.max_participants} khách/ca.</p></div>
      </div>
    </section>
    <section className="v3b-card">
      <h2 className="v3b-h2">Giá đã thống nhất</h2>
      <div className="v3b-row">
        <div className="v3b-f"><label htmlFor="pp">Giá mỗi khách <span className="v3b-req">*</span></label>
          <input id="pp" type="number" min={1} step="any" value={perGuest} onChange={event => setPerGuest(event.target.value)} required />
          <p className="v3b-help">Mặc định theo giá niêm yết, sửa nếu đã thoả thuận khác trong tin nhắn.</p></div>
        <div className="v3b-f"><span className="v3b-lab">Tổng</span><p className="v3b-total">{price ? vnd(price.total) : '—'}</p>
          {shown && <>
            {shown.discount > 0 && <p className="v3b-help">{shown.strike ? <><s className="v3b-old">{vnd(shown.listTotal)}</s> · </> : ''}giảm {shown.discountPct}% giá đoàn (− {vnd(shown.discount)})</p>}
            {shown.discount === 0 && shown.strike && <p className="v3b-help"><s className="v3b-old">{vnd(shown.listTotal)}</s></p>}
            {shown.adjustment !== 0 && <p className="v3b-help">{adjustmentLine(shown.adjustment)}</p>}
          </>}
        </div>
      </div>
      <div className="v3b-f"><label htmlFor="cd">Điều kiện đã thống nhất <span className="v3b-opt">(không bắt buộc)</span></label>
        <textarea id="cd" rows={3} maxLength={1000} value={conditions} onChange={event => setConditions(event.target.value)} />
        <p className="v3b-help">Gửi cho công ty lữ hành trong tin nhắn "Xưởng đã giữ chỗ".</p></div>
      {error && <p className="v3b-err" role="alert">{error}</p>}
      <div className="v3b-actions">
        <Link className="v3b-btn v3b-btn--s" href={`/provider/${providerId}/bookings`}>Huỷ</Link>
        <button type="submit" className="v3b-btn v3b-btn--p" disabled={saving}>{saving ? 'Đang tạo…' : 'Tạo và giữ chỗ 72 giờ'}</button>
      </div>
    </section>
  </form>
}
