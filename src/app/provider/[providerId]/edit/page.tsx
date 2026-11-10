'use client'

// PRF128 Chỉnh sửa hồ sơ xưởng (US-4, FR-004). Every field comes from the API; Save sends only the
// changed fields (decision Q1 2026-11-04: no hard-coded demo values, only FR-004 inputs).
// Files are uploaded privately and attached to the editable Provider version on Save.

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import MediaImage from '@/app/components/MediaImage'
import { readSessionContext } from '@/lib/auth/client-session'
import { providerBkgLinks } from '@/lib/booking/nav-links'
import {
  PROVIDER_CRAFT_TYPES,
  WEEKDAY_LABELS,
  buildProviderPatch,
  profileToForm,
  type ProviderEditForm,
} from '@/lib/prf/provider-edit-form'
import StatusBadge from '@/app/components/StatusBadge'
import { statusLabel } from '@/lib/status-labels'

const EMPTY_FORM: ProviderEditForm = {
  business_name: '', craft_type: '', business_registration: '', location_address: '',
  general_description: '', artisan_names: '', phone_number: '', business_email: '', operating_hours: [],
}

export default function EditProviderProfilePage({
  params,
}: {
  params: { providerId: string }
}) {
  const [initial, setInitial] = useState<ProviderEditForm>(EMPTY_FORM)
  const [formData, setFormData] = useState<ProviderEditForm>(EMPTY_FORM)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiDraft,setAiDraft]=useState<string|null>(null)
  const [certificate,setCertificate]=useState<{file_id:string;file_name:string;url:string;available?:boolean}|null>(null)
  const [initialCertificate,setInitialCertificate]=useState('')
  const [media,setMedia]=useState<Array<{file_id:string;category:string;url?:string}>>([])
  const [initialMedia,setInitialMedia]=useState('[]')
  const [conditions,setConditions]=useState<Record<string,unknown>>({})
  const [initialConditions,setInitialConditions]=useState('{}')
  const [uploading,setUploading]=useState(false)
  const [refining, setRefining] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const session = await readSessionContext()
        const canEdit = session.role === 'Local_Provider' && session.providerId === params.providerId
        setAuthorized(canEdit)
        if (!canEdit) return
        const [profileRes, scheduleRes] = await Promise.all([
          fetch(`/api/prf/provider/${params.providerId}`),
          fetch(`/api/bkg/providers/${params.providerId}/schedule`),
        ])
        if (!profileRes.ok) {
          setMessage({ type: 'error', text: 'Không tải được hồ sơ Provider.' })
          return
        }
        const profile = await profileRes.json()
        const schedule = scheduleRes.ok ? await scheduleRes.json() : null
        const form = profileToForm(profile, schedule?.data?.operating_hours)
        setCertificate(profile.business_registration_certificate || null); setInitialCertificate(profile.business_registration_certificate?.file_id || '')
        const mediaItems=(profile.profile_images||[]).map((item:{file_id:string;category:string})=>({...item,url:`/api/prf/media/${item.file_id}`}));setMedia(mediaItems);setInitialMedia(JSON.stringify(mediaItems))
        setConditions(profile.booking_conditions||{});setInitialConditions(JSON.stringify(profile.booking_conditions||{}))
        setInitial(form)
        setFormData(form)
        setStatus(profile.verification_status || '')
      } catch {
        setMessage({ type: 'error', text: 'Lỗi kết nối khi tải hồ sơ.' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.providerId])

  if (!loading && authorized === false) {
    return <main className="prf-container" style={{ padding: '3rem' }}><h1>403 · Không có quyền chỉnh sửa</h1><p>Chỉ chủ sở hữu Local Provider mới được sửa hồ sơ này.</p><Link href={`/provider/${params.providerId}`}>← Xem hồ sơ</Link></main>
  }

  const set = (field: keyof ProviderEditForm, value: string) => setFormData(prev => ({ ...prev, [field]: value }))

  const setHour = (index: number, field: 'weekday' | 'local_start' | 'local_end', value: string) =>
    setFormData(prev => ({
      ...prev,
      operating_hours: prev.operating_hours.map((row, i) => i === index ? { ...row, [field]: field === 'weekday' ? Number(value) : value } : row),
    }))

  const addHour = () => setFormData(prev => ({ ...prev, operating_hours: [...prev.operating_hours, { weekday: 1, local_start: '08:00', local_end: '17:00' }] }))
  const removeHour = (index: number) => setFormData(prev => ({ ...prev, operating_hours: prev.operating_hours.filter((_, i) => i !== index) }))

  const handleAIRefine = async () => {
    if (!formData.general_description) return
    setRefining(true)
    setMessage(null)
    try {
      const res = await fetch('/api/prf/ai/description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_description: formData.general_description,
          craft_type: formData.craft_type || 'Other',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiDraft(data.refined_description_draft || null)
      } else {
        setMessage({ type: 'error', text: 'Dịch vụ AI không khả dụng.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối AI.' })
    } finally {
      setRefining(false)
    }
  }

  async function upload(file:File|undefined,isCertificate:boolean) {
    if(!file)return
    setUploading(true);setMessage(null)
    try{const body=new FormData();body.set('file',file);body.set('provider_id',params.providerId);if(isCertificate)body.set('purpose','certificate');const response=await fetch('/api/prf/media',{method:'POST',body});const result=await response.json();if(!response.ok)throw new Error(result.error);if(isCertificate)setCertificate({...result,available:true});else setMedia(current=>[...current,{file_id:result.file_id,category:'Activity',url:result.url}])}catch(cause){setMessage({type:'error',text:cause instanceof Error?cause.message:'Không thể tải file.'})}finally{setUploading(false)}
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const patch = buildProviderPatch(initial, formData)
    if(certificate && certificate.file_id!==initialCertificate)patch.certificate_file_id=certificate.file_id
    if(JSON.stringify(media)!==initialMedia)patch.profile_images=media.map(({file_id,category})=>({file_id,category}))
    if(JSON.stringify(conditions)!==initialConditions)patch.booking_conditions=conditions
    if (Object.keys(patch).length === 0) {
      setMessage({ type: 'success', text: 'Không có thay đổi nào để lưu.' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/prf/provider/${params.providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (res.ok) {
        setInitial(formData);setInitialCertificate(certificate?.file_id || '');setInitialMedia(JSON.stringify(media));setInitialConditions(JSON.stringify(conditions))
        if (data.new_version_pending) {
          setMessage({
            type: 'success',
            text: `✓ Đã lưu. Bản sửa đổi đang ở trạng thái ${statusLabel('provider', data.verification_status)} chờ UBND thẩm định; phiên bản đã xác minh vẫn hiển thị công khai.`,
          })
        } else {
          setStatus(data.verification_status)
          setMessage({ type: 'success', text: `✓ Lưu thay đổi thành công. Trạng thái: ${statusLabel('provider', data.verification_status)}` })
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Lỗi khi lưu hồ sơ.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối khi lưu.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="spec-portal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <p style={{ fontWeight: 700, color: '#4b5563' }}>Đang tải hồ sơ…</p>
      </div>
    )
  }

  const field = (label: string, name: keyof ProviderEditForm, hint?: string) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <label className="spec-form-label" htmlFor={`prf128-${name}`}>{label}</label>
      <input
        id={`prf128-${name}`}
        type="text"
        className="spec-form-input"
        value={formData[name] as string}
        onChange={e => set(name, e.target.value)}
      />
      {hint && <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.25rem' }}>{hint}</div>}
    </div>
  )

  return (
    <div className="spec-portal">

      <div className="spec-subheader">
        <div>
          Hồ sơ xưởng / <span style={{ color: '#111827' }}>Chỉnh sửa thông tin</span>
        </div>
        <div>
          Trạng thái thẩm định: {status ? <StatusBadge family="provider" status={status} /> : <span>Chưa có hồ sơ</span>}
        </div>
      </div>

      <div className="spec-content-wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0' }}>
              Chỉnh sửa hồ sơ xưởng
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', maxWidth: '800px', margin: 0 }}>
              Tên xưởng, nhóm nghề và số đăng ký kinh doanh là trường trọng yếu: khi hồ sơ đã được xác minh, thay đổi chúng tạo một bản sửa đổi chờ UBND thẩm định, còn phiên bản đã xác minh vẫn hiển thị công khai.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* #218, screen-spec-PRF128 §3 #18 / §5 #4: Manage Experiences → EXP067 */}
            <Link href={`/provider/${params.providerId}/experiences`} className="spec-btn-white">
              Quản lý trải nghiệm
            </Link>
            <Link href={`/provider/${params.providerId}`} className="spec-btn-white">
              Hủy thay đổi
            </Link>
            <button onClick={handleSubmit} disabled={saving || uploading} className="spec-btn-black">
              {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>

        {message && (
          <div role="status" style={{ padding: '1rem', background: message.type === 'success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`, color: message.type === 'success' ? '#065f46' : '#991b1b', marginBottom: '1.5rem', fontWeight: 600 }}>
            {message.text}
          </div>
        )}

        {aiDraft!==null&&<section className="spec-form-section" aria-label="Xem trước mô tả AI"><h2>Bản nháp AI — chưa thay đổi mô tả</h2><label>Sửa bản nháp<textarea value={aiDraft} maxLength={1000} onChange={event=>setAiDraft(event.target.value)}/></label><button type="button" onClick={()=>{setFormData(current=>({...current,general_description:aiDraft}));setAiDraft(null)}}>Chấp nhận bản nháp</button><button type="button" disabled={refining} onClick={handleAIRefine}>Tạo lại</button><button type="button" onClick={()=>setAiDraft(null)}>Bỏ bản nháp</button></section>}
        <form onSubmit={handleSubmit}>
          <div className="spec-form-section">
            <div className="spec-form-section-header">
              <div className="spec-section-num">01 Thông tin xưởng</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                {field('Tên xưởng (thay đổi cần thẩm định lại)', 'business_name')}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="spec-form-label" htmlFor="prf128-craft_type">Nhóm nghề — thay đổi cần thẩm định</label>
                  <select
                    id="prf128-craft_type"
                    className="spec-form-input"
                    value={formData.craft_type}
                    onChange={e => set('craft_type', e.target.value)}
                  >
                    {!PROVIDER_CRAFT_TYPES.includes(formData.craft_type as typeof PROVIDER_CRAFT_TYPES[number]) && (
                      <option value={formData.craft_type}>{formData.craft_type || '—'}</option>
                    )}
                    {PROVIDER_CRAFT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                {field('Số đăng ký kinh doanh (thay đổi cần thẩm định lại)', 'business_registration')}
              </div>
              <div>
                {field('Địa chỉ xưởng', 'location_address')}
                {field('Tên nghệ nhân', 'artisan_names', 'Phân cách bằng dấu phẩy.')}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="spec-form-label" htmlFor="prf128-general_description">Mô tả</label>
                <button
                  type="button"
                  disabled={refining}
                  onClick={handleAIRefine}
                  className="spec-btn-white"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', borderColor: '#000000' }}
                >
                  {refining ? 'TRAU CHUỐT...' : '✨ TRAU CHUỐT BẰNG AI'}
                </button>
              </div>
              <textarea
                id="prf128-general_description"
                rows={4}
                maxLength={1000}
                className="spec-form-input"
                value={formData.general_description}
                onChange={e => set('general_description', e.target.value)}
              />
            </div>
          </div>

          <div className="spec-form-section">
            <div className="spec-form-section-header">
              <div className="spec-section-num">02 Liên hệ</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {field('Số điện thoại', 'phone_number')}
              {field('Email liên hệ', 'business_email')}
            </div>
          </div>

          <section className="spec-form-section"><h2>Tài liệu và hình ảnh</h2><p>File mới chỉ được gắn vào hồ sơ sau khi lưu. Tài liệu đăng ký kinh doanh không hiển thị công khai.</p>{certificate&&<p>{certificate.available===false?<span>{certificate.file_name} — chưa có file gốc</span>:<a href={certificate.url}>{certificate.file_name}</a>}</p>}<label>Giấy đăng ký kinh doanh (PDF/JPEG/PNG, tối đa 10 MB)<input type="file" disabled={uploading} accept=".pdf,.jpg,.jpeg,.png" onChange={event=>{void upload(event.target.files?.[0],true);event.target.value=''}}/></label><label>Ảnh xưởng (JPEG/PNG/WEBP, tối thiểu 1280×720)<input type="file" disabled={uploading} accept="image/jpeg,image/png,image/webp" onChange={event=>{void upload(event.target.files?.[0],false);event.target.value=''}}/></label>{uploading&&<p role="status">Đang tải file…</p>}<div className="provider-media-grid">{media.map((image,index)=><article key={image.file_id}><MediaImage src={image.url} alt={`Ảnh xưởng ${index+1}`}/><label>Nhóm ảnh<select value={image.category} onChange={event=>setMedia(current=>current.map((row,i)=>i===index?{...row,category:event.target.value}:row))}>{[['Activity','Hoạt động'],['Space','Không gian'],['Product','Sản phẩm']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button type="button" onClick={()=>setMedia(current=>current.filter((_,i)=>i!==index))}>Gỡ khỏi hồ sơ</button></article>)}</div></section>
          <section className="spec-form-section"><h2>Điều kiện đặt đoàn</h2><label>Báo trước khi hủy (giờ)<input type="number" min={0} value={String(conditions.cancellation_notice_hours ?? '')} onChange={event=>setConditions({...conditions,cancellation_notice_hours:event.target.value===''?undefined:Number(event.target.value)})}/></label><label>Đặt cọc (%)<input type="number" min={0} max={100} value={String(conditions.deposit_percentage ?? '')} onChange={event=>setConditions({...conditions,deposit_percentage:event.target.value===''?undefined:Number(event.target.value)})}/></label></section>
          <div className="spec-form-section">
            <div className="spec-form-section-header">
              <div className="spec-section-num">03 Giờ hoạt động hằng tuần</div>
              <button type="button" className="spec-btn-white" style={{ fontSize: '0.72rem' }} onClick={addHour}>
                + Thêm khung giờ
              </button>
            </div>
            {formData.operating_hours.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Chưa có giờ mở cửa.</p>
            )}
            {formData.operating_hours.map((row, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', marginBottom: '0.75rem', alignItems: 'end' }}>
                <div>
                  <label className="spec-form-label" htmlFor={`prf128-hours-${index}-weekday`}>Ngày trong tuần</label>
                  <select id={`prf128-hours-${index}-weekday`} className="spec-form-input" value={row.weekday} onChange={e => setHour(index, 'weekday', e.target.value)}>
                    {Object.entries(WEEKDAY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="spec-form-label" htmlFor={`prf128-hours-${index}-start`}>Từ giờ</label>
                  <input id={`prf128-hours-${index}-start`} type="time" className="spec-form-input" value={row.local_start} onChange={e => setHour(index, 'local_start', e.target.value)} />
                </div>
                <div>
                  <label className="spec-form-label" htmlFor={`prf128-hours-${index}-end`}>Đến giờ</label>
                  <input id={`prf128-hours-${index}-end`} type="time" className="spec-form-input" value={row.local_end} onChange={e => setHour(index, 'local_end', e.target.value)} />
                </div>
                <button type="button" className="spec-btn-white" style={{ fontSize: '0.72rem' }} onClick={() => removeHour(index)}>
                  Gỡ
                </button>
              </div>
            ))}
          </div>

          <div style={{ background: '#ffffff', borderTop: '1px solid #e5e7eb', padding: '1rem 2.5rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
            <Link href={`/provider/${params.providerId}`} className="spec-btn-white">
              Hủy thay đổi
            </Link>
            <button type="submit" disabled={saving || uploading} className="spec-btn-black">
              {saving ? 'Đang lưu…' : 'Lưu hồ sơ xưởng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
