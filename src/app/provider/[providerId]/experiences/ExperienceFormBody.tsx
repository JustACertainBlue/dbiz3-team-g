'use client'
// Screens 32 (EXP069 add, EXP070 edit): the sections of mockup 32 in its order (hab-mockup-v3/source/FormTraiNghiem.dc.html):
// Thông tin chung · Ảnh trải nghiệm · Điểm nổi bật của trải nghiệm · Về trải nghiệm này · Giá & ca trải nghiệm ·
// Bao gồm & tiện ích · Chính sách của xưởng. Shared by the add and the edit page; the page keeps state, save and rules.
// Not shown (no column to store them): "Câu hỏi thường gặp", the "Rất được đoàn khách ưa thích" chips, "Người hướng dẫn",
// child ages, and the editable "Các ca trong ngày" (read only here).
import React from 'react'
import { ExperienceCancellationField, ExperienceDiscountsField } from './ExperienceTermsField'
import ExperienceLocationField from './ExperienceLocationField'
import ExperienceImagesField, { type ExperienceImageItem } from './ExperienceImagesField'
import { HighlightsCard, SuitableCard, InclusionsCard, ChildPolicyField, SlotsReadOnly, type SlotLine } from './ExperienceContentFields'
import type { ContentForm } from '@/lib/prf/experience-content-form'
import type { CancellationPolicy, DiscountRule } from '@/lib/prf/experience-terms'

export interface ExperienceFormData {
  name: string; category: string; duration_minutes: number; price_per_person: number; max_participants: number; notice_period_hours: number
  experience_location_address: string; cancellation_rules_text: string; description: string
}
interface Props {
  formData: ExperienceFormData; setFormData: (next: ExperienceFormData) => void; hasActiveBookings: boolean
  images: ExperienceImageItem[]; setImages: (next: ExperienceImageItem[]) => void; setUploading: (busy: boolean) => void
  content: ContentForm; setContent: (next: ContentForm) => void; slots: SlotLine[]
  policy: CancellationPolicy; group: DiscountRule[]; special: DiscountRule[]
  onPolicy: (v: CancellationPolicy) => void; onGroup: (v: DiscountRule[]) => void; onSpecial: (v: DiscountRule[]) => void
  aiRefining: boolean; aiDraft: string | null; onAiRefine: () => void; onApplyDraft: () => void; onDismissDraft: () => void
}

const Heading = ({ title, hint }: { title: string; hint?: string }) => <div className="prf-section-heading"><div><h2 className="pv3-sec-h">{title}</h2>{hint && <p className="prf-field-helper">{hint}</p>}</div></div>
const Locked = ({ on }: { on: boolean }) => on ? <span className="prf-badge prf-badge-warning" style={{ marginLeft: '0.5rem' }}>Đang khóa</span> : null

export default function ExperienceFormBody(p: Props) {
  const { formData, setFormData, hasActiveBookings: locked } = p
  const set = <K extends keyof ExperienceFormData>(key: K, value: ExperienceFormData[K]) => setFormData({ ...formData, [key]: value })
  return <div className="pv3-stack">
    <div className="prf-section-card">
      <Heading title="Thông tin chung" />
      <div className="pv3-grid2">
        <div className="prf-field-group"><label className="prf-label" htmlFor="experience-field-1">Tên trải nghiệm *</label>
          <input id="experience-field-1" type="text" required value={formData.name} onChange={e => set('name', e.target.value)} className="prf-input" />
          <span className="prf-field-helper">Ngắn gọn, bắt đầu bằng việc khách sẽ làm.</span></div>
        <div className="prf-field-group"><label className="prf-label" htmlFor="experience-field-2">Loại hoạt động *</label>
          <select id="experience-field-2" value={formData.category} onChange={e => set('category', e.target.value)} className="prf-select">
            <option value="Workshop/Hands-on">Tự tay làm</option>
            <option value="Sightseeing">Tham quan làng nghề / Lò nung cổ</option>
            <option value="Culinary/Tasting">Ẩm thực làng nghề & Trà đạo</option>
            <option value="Cultural Show">Xem biểu diễn</option>
            <option value="Combo">Combo Trọn gói Trải nghiệm</option>
          </select></div>
      </div>
      <ExperienceLocationField value={formData.experience_location_address} locked={locked} onChange={value => set('experience_location_address', value)} />
    </div>

    <div className="prf-section-card">
      <Heading title="Ảnh trải nghiệm" hint="Ảnh đầu tiên hiện lớn nhất trên trang chi tiết. Ảnh ngang, mỗi ảnh tối đa 10 MB." />
      <ExperienceImagesField images={p.images} onChange={p.setImages} onBusyChange={p.setUploading} />
    </div>

    <HighlightsCard value={p.content} onChange={p.setContent} />

    <div className="prf-section-card">
      <Heading title="Về trải nghiệm này" />
      <div className="prf-field-group">
        <div className="pv3-rowbetween"><label className="prf-label" htmlFor="experience-description">Mô tả *</label>
          <button type="button" onClick={p.onAiRefine} disabled={p.aiRefining} className="prf-btn prf-btn-outline">{p.aiRefining ? 'Đang phân tích...' : '✦ Nhờ AI mô tả'}</button></div>
        <textarea id="experience-description" rows={5} required value={formData.description} onChange={e => set('description', e.target.value)} className="prf-textarea" />
      </div>
      {p.aiDraft && <div className="pv3-ai" role="status">
        <p className="pv3-ai__t">✦ AI gợi ý</p><p className="pv3-ai__b">{p.aiDraft}</p>
        <div className="pv3-ai__btns">
          <button type="button" onClick={p.onApplyDraft} className="prf-btn prf-btn-primary">Dùng bản này</button>
          <button type="button" onClick={p.onDismissDraft} className="prf-btn prf-btn-outline">Giữ bản của tôi</button>
          <button type="button" onClick={p.onAiRefine} disabled={p.aiRefining} className="prf-btn prf-btn-outline">Viết lại</button>
        </div></div>}
    </div>
    <SuitableCard value={p.content} onChange={p.setContent} />

    <div className="prf-section-card">
      <Heading title="Giá & ca trải nghiệm" />
      <div className="pv3-grid3">
        <div className="prf-field-group"><label className="prf-label" htmlFor="experience-field-4">Giá mỗi khách (₫) *<Locked on={locked} /></label>
          <input id="experience-field-4" type="number" required min={1} disabled={locked} value={formData.price_per_person} onChange={e => set('price_per_person', Number(e.target.value))} className="prf-input prf-input-locked" /></div>
        <div className="prf-field-group"><label className="prf-label" htmlFor="experience-field-3">Thời lượng mỗi ca (phút) *<Locked on={locked} /></label>
          <input id="experience-field-3" type="number" required min={1} disabled={locked} value={formData.duration_minutes} onChange={e => set('duration_minutes', Number(e.target.value))} className="prf-input prf-input-locked" /></div>
        <div className="prf-field-group"><label className="prf-label" htmlFor="experience-field-5">Tối đa mỗi ca (khách) *<Locked on={locked} /></label>
          <input id="experience-field-5" type="number" required min={1} disabled={locked} value={formData.max_participants} onChange={e => set('max_participants', Number(e.target.value))} className="prf-input prf-input-locked" /></div>
      </div>
      <ExperienceDiscountsField group={p.group} special={p.special} onGroup={p.onGroup} onSpecial={p.onSpecial} />
      <SlotsReadOnly slots={p.slots} />
    </div>

    <InclusionsCard value={p.content} onChange={p.setContent} />

    <div className="prf-section-card">
      <Heading title="Chính sách của xưởng" />
      <div className="prf-field-group"><label className="prf-label" htmlFor="experience-field-6">Đặt trước ít nhất (giờ) *</label>
        <input id="experience-field-6" type="number" required min={0} value={formData.notice_period_hours} onChange={e => set('notice_period_hours', Number(e.target.value))} className="prf-input" />
        <span className="prf-field-helper">Thời gian tối thiểu công ty lữ hành phải chốt đoàn để xưởng chuẩn bị.</span></div>
      <ExperienceCancellationField policy={p.policy} onPolicy={p.onPolicy} />
      <ChildPolicyField value={p.content} onChange={p.setContent} />
    </div>
  </div>
}
