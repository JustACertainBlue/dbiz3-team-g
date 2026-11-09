// EXP070 §3 #14 (#208): Experience location address, F-PROFILE-06. Same checks as the create form
// (required text; at most 500 characters, as ExperienceCreateSchema). BR-014 / SR-003: locked while the
// Experience has an On hold or Booked booking, like price, capacity and duration.
import React from 'react'

export default function ExperienceLocationField({ value, locked, onChange }: {
  value: string
  locked: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="prf-field-group">
      <label className="prf-label" htmlFor="experience-field-location">
        Địa điểm diễn ra trải nghiệm *
        {locked && <span className="prf-badge prf-badge-warning" style={{ marginLeft: '0.5rem' }}>Đang khóa</span>}
      </label>
      <input id="experience-field-location"
        type="text"
        required
        maxLength={500}
        disabled={locked}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="prf-input prf-input-locked"
        placeholder="Địa chỉ cụ thể tại làng nghề..."
      />
    </div>
  )
}
