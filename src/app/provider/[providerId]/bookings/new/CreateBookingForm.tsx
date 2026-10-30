'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

export interface ExperienceOption {
  experience_id: string
  name: string
  duration_minutes: number
  max_participants: number
  price_per_person: number
  conditions: { notice_period: number; cancellation_policy: Record<string, unknown> }
}

export interface AgencyOption {
  agency_id: string
  company_name: string
}

interface CreatedBooking {
  booking_id: string
  status: string
  created_at: string
  hold_expires_at: string
  public_schedule_block: { start_at: string; end_at: string; status: string }
}

const formatVnd = (value: number) => `${value.toLocaleString('vi-VN')} VND`

export default function CreateBookingForm({ providerId, experiences, agencies }: {
  providerId: string
  experiences: ExperienceOption[]
  agencies: AgencyOption[]
}) {
  const first = experiences[0]
  const [experienceId, setExperienceId] = useState(first?.experience_id ?? '')
  const [agencyId, setAgencyId] = useState(agencies[0]?.agency_id ?? '')
  const [startLocal, setStartLocal] = useState('')
  const [duration, setDuration] = useState(first?.duration_minutes ?? 60)
  const [groupSize, setGroupSize] = useState(1)
  const [agreedPrice, setAgreedPrice] = useState(0)
  const [noticePeriod, setNoticePeriod] = useState(first?.conditions.notice_period ?? 0)
  const [policyText, setPolicyText] = useState(JSON.stringify(first?.conditions.cancellation_policy ?? {}))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedBooking | null>(null)

  const experience = useMemo(() => experiences.find(row => row.experience_id === experienceId), [experiences, experienceId])

  // Conditions are prefilled as a snapshot of the chosen Experience and stay editable (FR-003).
  const selectExperience = (id: string) => {
    setExperienceId(id)
    const next = experiences.find(row => row.experience_id === id)
    if (!next) return
    setDuration(next.duration_minutes)
    setNoticePeriod(next.conditions.notice_period)
    setPolicyText(JSON.stringify(next.conditions.cancellation_policy))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    let cancellationPolicy: unknown
    try {
      cancellationPolicy = JSON.parse(policyText)
    } catch {
      setError('Cancellation policy phải là JSON hợp lệ.')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/bkg/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience_id: experienceId,
          agency_id: agencyId,
          start_at: startLocal ? `${startLocal}:00+07:00` : '',
          duration,
          group_size: groupSize,
          agreed_price: agreedPrice,
          booking_conditions: { notice_period: noticePeriod, cancellation_policy: cancellationPolicy },
        }),
      })
      const json = await response.json() as { data?: CreatedBooking; error?: { code: string; message: string } }
      if (!response.ok || !json.data) {
        setError(json.error ? `${json.error.code}: ${json.error.message}` : 'Không tạo được Booking.')
        return
      }
      setCreated(json.data)
    } catch {
      setError('Không kết nối được máy chủ. Thử lại.')
    } finally {
      setSaving(false)
    }
  }

  // Until BKG135 exists, the created Booking is shown here (spec #43).
  if (created) {
    return <section className="bkg-result">
      <h2>Đã tạo Booking · {created.status}</h2>
      <dl>
        <dt>Booking ID</dt><dd>{created.booking_id}</dd>
        <dt>Thời gian</dt><dd>{created.public_schedule_block.start_at} → {created.public_schedule_block.end_at}</dd>
        <dt>Tạo lúc</dt><dd>{created.created_at}</dd>
        <dt>Giữ chỗ đến</dt><dd>{created.hold_expires_at}</dd>
      </dl>
      <p className="bkg-actions"><Link href={`/provider/${providerId}`}>← Về trang Provider</Link></p>
    </section>
  }

  if (!experiences.length) {
    return <p className="bkg-panel">Provider chưa có Experience nào đang hoạt động, nên chưa tạo được Booking.</p>
  }

  return <form className="bkg-form" onSubmit={submit}>
    <label>Experience
      <select value={experienceId} onChange={event => selectExperience(event.target.value)} required>
        {experiences.map(row => <option key={row.experience_id} value={row.experience_id}>{row.name}</option>)}
      </select>
    </label>
    {experience && <div className="bkg-panel">Sức chứa tối đa: {experience.max_participants} khách · Thời lượng gợi ý: {experience.duration_minutes} phút</div>}
    <label>Agency
      <select value={agencyId} onChange={event => setAgencyId(event.target.value)} required>
        {agencies.map(row => <option key={row.agency_id} value={row.agency_id}>{row.company_name}</option>)}
      </select>
    </label>
    <div className="bkg-grid">
      <label>Bắt đầu (giờ Hà Nội)
        <input type="datetime-local" value={startLocal} onChange={event => setStartLocal(event.target.value)} required />
      </label>
      <label>Thời lượng (phút)
        <input type="number" min={1} step={1} value={duration} onChange={event => setDuration(Number(event.target.value))} required />
      </label>
      <label>Số khách
        <input type="number" min={1} max={experience?.max_participants} step={1} value={groupSize} onChange={event => setGroupSize(Number(event.target.value))} required />
      </label>
      <label>Giá thỏa thuận cho cả đoàn (VND)
        <input type="number" min={1} step={1000} value={agreedPrice} onChange={event => setAgreedPrice(Number(event.target.value))} required />
      </label>
    </div>
    {experience && <div className="bkg-panel">Gợi ý: {formatVnd(experience.price_per_person)} × {groupSize} khách = {formatVnd(experience.price_per_person * groupSize)}. Giá thỏa thuận vẫn có thể sửa.</div>}
    <div className="bkg-grid">
      <label>Notice period (giờ)
        <input type="number" min={0} step={1} value={noticePeriod} onChange={event => setNoticePeriod(Number(event.target.value))} required />
      </label>
      <label>Cancellation policy (JSON)
        <textarea rows={2} value={policyText} onChange={event => setPolicyText(event.target.value)} required />
      </label>
    </div>
    {error && <p className="bkg-error" role="alert">{error}</p>}
    <div className="bkg-actions">
      <button type="submit" disabled={saving}>{saving ? 'Đang tạo…' : 'Create On hold'}</button>
      <Link href={`/provider/${providerId}`}>Cancel</Link>
    </div>
  </form>
}
