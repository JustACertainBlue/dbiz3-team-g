'use client'
// Screen 32 part A: blocks of the content columns, in the order of mockup 32 (hab-mockup-v3/source/FormTraiNghiem.dc.html).
// Only columns that exist are shown: highlights, suitable_for, group_note, inclusions, guide_languages, child_policy.
// "Các ca trong ngày" is read only (experience_slots has no write path).
import React from 'react'
import { SUITABLE_FOR } from '@/lib/explore/vocabulary'
import { HIGHLIGHT_BOXES, type ContentForm } from '@/lib/prf/experience-content-form'

type Props = { value: ContentForm; onChange: (next: ContentForm) => void }
const heading = (title: string, hint?: string) => <div className="prf-section-heading"><div><h2 className="pv3-sec-h">{title}</h2>{hint && <p className="prf-field-helper">{hint}</p>}</div></div>

export function HighlightsCard({ value, onChange }: Props) {
  return <div className="prf-section-card">
    {heading('Điểm nổi bật của trải nghiệm', '4 ô hiện ngay dưới ảnh. Mỗi ô gồm tiêu đề ngắn và một dòng mô tả.')}
    <div className="pv3-grid2">{value.highlights.slice(0, HIGHLIGHT_BOXES).map((box, index) => <div key={index} className="prf-field-group">
      <label className="prf-label" htmlFor={`hl-title-${index}`}>Ô {index + 1} · Tiêu đề</label>
      <input id={`hl-title-${index}`} className="prf-input" maxLength={80} value={box.title} onChange={e => onChange({ ...value, highlights: value.highlights.map((item, i) => i === index ? { ...item, title: e.target.value } : item) })} />
      <input className="prf-input" aria-label={`Ô ${index + 1} · Mô tả`} maxLength={120} value={box.sub} onChange={e => onChange({ ...value, highlights: value.highlights.map((item, i) => i === index ? { ...item, sub: e.target.value } : item) })} />
    </div>)}</div>
  </div>
}

export function SuitableCard({ value, onChange }: Props) {
  const toggle = (term: string) => onChange({ ...value, suitable_for: value.suitable_for.includes(term) ? value.suitable_for.filter(item => item !== term) : [...value.suitable_for, term] })
  return <div className="prf-section-card">
    <fieldset className="pv3-fieldset"><legend className="prf-label">Rất hợp cho đoàn</legend>
      <div className="pv3-chips">{SUITABLE_FOR.map(term => <label key={term} className="pv3-chip"><input type="checkbox" checked={value.suitable_for.includes(term)} onChange={() => toggle(term)} />{term}</label>)}</div>
    </fieldset>
    <div className="prf-field-group"><label className="prf-label" htmlFor="group-note">Hộp “Hoàn hảo cho…” bên phải mô tả</label>
      <input id="group-note" className="prf-input" maxLength={120} value={value.group_note} onChange={e => onChange({ ...value, group_note: e.target.value })} />
      <span className="prf-field-helper">Các dòng trong hộp (thời lượng, ngày nhận đoàn, có thêm) hệ thống tự lấy từ phần Giá &amp; ca và Bao gồm.</span></div>
  </div>
}

const note = (id: keyof ContentForm, label: string, props: Props, rows = 4) => <div className="prf-field-group" key={id}>
  <label className="prf-label" htmlFor={`inc-${id}`}>{label}</label>
  <textarea id={`inc-${id}`} className="prf-textarea pv3-ta" rows={rows} value={props.value[id] as string} onChange={e => props.onChange({ ...props.value, [id]: e.target.value })} />
</div>

export function InclusionsCard(props: Props) {
  const { value, onChange } = props
  return <div className="prf-section-card">
    {heading('Bao gồm & tiện ích', 'Mỗi dòng là một mục. Thêm “(phụ phí)” ở cuối dòng nếu mục đó tính thêm tiền.')}
    <div className="pv3-grid3">
      {note('per_guest', 'Mỗi khách có', props)}
      {note('included', 'Đã gồm trong giá', props)}
      {note('trong_buoi', 'Trong buổi trải nghiệm', props)}
      <div className="prf-field-group"><label className="pv3-chip pv3-chip--solo"><input type="checkbox" checked={value.take_home} onChange={e => onChange({ ...value, take_home: e.target.checked })} />Sản phẩm mang về</label>
        <span className="prf-field-helper">Hiện dòng “Mỗi khách một sản phẩm tự làm”.</span></div>
      {note('guide_languages', 'Ngôn ngữ hướng dẫn', props)}
      {note('chup_anh', 'Chụp ảnh, quay phim', props)}
      {note('luu_y', 'Lưu ý cho đoàn', props)}
      {note('an_toan', 'An toàn', props)}
    </div>
  </div>
}

export function ChildPolicyField({ value, onChange }: Props) {
  return <div className="prf-field-group"><label className="prf-label" htmlFor="child-policy">Trẻ em</label>
    <input id="child-policy" className="prf-input" maxLength={200} value={value.child_policy} onChange={e => onChange({ ...value, child_policy: e.target.value })} />
    <span className="prf-field-helper">Một câu công ty lữ hành đọc ở mục Chính sách, ví dụ “Phù hợp với trẻ từ 6 tuổi”.</span></div>
}

export type SlotLine = { label: string; start: string; end: string; weekdays: number[] }
/** Read only: slots are edited by the content team until the app role may write experience_slots. */
export function SlotsReadOnly({ slots }: { slots: SlotLine[] }) {
  return <div className="prf-field-group"><span className="prf-label">Các ca trong ngày</span>
    {slots.length === 0 ? <p className="prf-field-helper">Chưa có ca nào.</p> : <ul className="pv3-slots">{slots.map(slot => <li key={`${slot.label}-${slot.start}`}><b>{slot.label}</b><span>{slot.start} – {slot.end}</span></li>)}</ul>}
    <span className="prf-field-helper">Chỉ xem. Muốn đổi ca, nhắn đội nội dung.</span></div>
}
