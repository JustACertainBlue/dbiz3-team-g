'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
type Revision = { comments: string; full_name: string; email: string; company_name: string; company_type: string; tax_id: string; team_size: number; tour_types: string[]; location: Record<string,string>; contact_information: Record<string,string> }
function RevisionForm() {
  const [files, setFiles] = useState<File[]>([])
  const token = useSearchParams().get('token') || ''
  const [data, setData] = useState<Revision | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(false)
  useEffect(() => { fetch(`/api/register/resubmit?token=${encodeURIComponent(token)}`).then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error_message); setData(body) }).catch(error => setError(error.message)) }, [token])
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const form = new FormData(); form.set('token', token); form.set('data', JSON.stringify(data)); files.forEach(file => form.append('registration_documents', file))
      const response = await fetch('/api/register/resubmit', { method: 'POST', body: form })
      const body = await response.json(); if (!response.ok) throw new Error(body.error_message)
      setDone(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể nộp lại hồ sơ.') } finally { setBusy(false) }
  }
  if (done) return <section className="card"><h1>Đã nộp lại hồ sơ</h1><p>Hồ sơ tiếp tục chờ HDT thẩm định. Link chỉnh sửa đã được sử dụng.</p><a href="/login">Về đăng nhập</a></section>
  return <section className="card"><h1>Bổ sung hồ sơ Agency</h1>{error && <p role="alert">{error}</p>}{data && <form onSubmit={submit}><p>Yêu cầu bổ sung: {data.comments}</p><p>Email cố định: {data.email}. Có thể tải tài liệu thay thế; nếu không chọn file mới, tài liệu hiện có được giữ trong phiên bản mới.</p>{(['full_name','company_name','tax_id'] as const).map(key => <label key={key}>{({ full_name:'Họ tên', company_name:'Tên công ty', tax_id:'Mã số thuế' })[key]}<input required value={data[key]} onChange={event => setData({ ...data, [key]: event.target.value })}/></label>)}<label>Loại công ty<select value={data.company_type} onChange={event => setData({ ...data, company_type: event.target.value })}>{['Travel Agency','Tour Operator','TMC'].map(value => <option key={value}>{value}</option>)}</select></label><label>Quy mô<input type="number" min={1} required value={data.team_size} onChange={event => setData({ ...data, team_size: Number(event.target.value) })}/></label>{(['location','contact_information'] as const).map(group => <fieldset key={group}><legend>{group === 'location' ? 'Địa chỉ' : 'Liên hệ'}</legend>{Object.entries(data[group]).map(([key,value]) => <label key={key}>{key}<input value={value} onChange={event => setData({ ...data, [group]: { ...data[group], [key]: event.target.value } })}/></label>)}</fieldset>)}<label>Loại tour (chọn nhiều bằng Ctrl/Cmd)<select multiple value={data.tour_types} onChange={event => setData({ ...data, tour_types: Array.from(event.target.selectedOptions).map(option => option.value) })}>{['Cultural/Heritage','Craft Village/Experiential','Culinary','Educational/Study Tour','Corporate/MICE','Family/Leisure','Other'].map(value => <option key={value}>{value}</option>)}</select></label><label>Tài liệu thay thế (PDF/JPG/PNG, tối đa 5 file, 10 MB/file)<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={event => setFiles(Array.from(event.target.files || []))}/></label><button disabled={busy}>{busy ? 'Đang nộp…' : 'Nộp lại hồ sơ'}</button></form>}</section>
}
export default function ReviseRegistration() { return <Suspense fallback={<p>Đang tải…</p>}><RevisionForm/></Suspense> }
