'use client'
import { reviewNotice } from '@/lib/auth/review-notice'
import { useEffect, useState } from 'react'
import StatusBadge from '@/app/components/StatusBadge'
type Review = { id: string; kind: string; name: string; status: string; submitted: string; fields: Record<string, unknown>; account: { user_id: string; name: string; email: string; role: string; admin_type?: string; status: string; organization: string; created_at: string; last_login: string } | null; history: { review_id: string; decision: string; comments: string; decided_at: string }[]; documents: { type: string; name: string; available: boolean; href: string | null }[] }
const labels: Record<string,string> = { company_name:'Tên công ty hiện tại', tax_id:'Mã số thuế hiện tại', proposed_company_name:'Tên công ty đề nghị', proposed_tax_id:'Mã số thuế đề nghị', full_name:'Người đại diện', company_type:'Loại công ty', location:'Địa chỉ', contact_information:'Liên hệ', team_size:'Quy mô', tour_types:'Loại tour', submitted_at:'Ngày nộp', version_no:'Phiên bản' }
function readable(value: unknown): string {
  if (typeof value === 'string') { try { const parsed = JSON.parse(value); if (typeof parsed === 'object') return readable(parsed) } catch {} return value || 'Không thay đổi / chưa có' }
  if (Array.isArray(value)) return value.map(readable).join(', ')
  if (value && typeof value === 'object') return Object.values(value).map(readable).join(' · ')
  return String(value ?? '')
}
export default function AgencyReviews() {
  const [items, setItems] = useState<Review[]>([])
  const [selected, setSelected] = useState<Review | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [decision, setDecision] = useState('Approve')
  const [comment, setComment] = useState('')
  async function load() { try { const response = await fetch('/api/auth/agency-reviews'); const body = await response.json(); if (!response.ok) throw new Error(body.error); setItems(body.data) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể tải.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  // #242 (from nguyenthu-0505): the review opens as a modal dialog over the table; backdrop and Escape close it (not while saving).
  useEffect(() => {
    if (!selected) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) setSelected(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, busy])
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!selected) return
    setBusy(true); setError(''); setNotice('')
    try { const response = await fetch('/api/auth/agency-reviews', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:selected.id, kind:selected.kind, decision, comment }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setSelected(null); setNotice(reviewNotice(body.data?.email_delivery_status)); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu.') } finally { setBusy(false) }
  }
  return <main className="review-page"><p>QUẢN TRỊ HDT</p><h1>Thẩm định Agency</h1><p>Đăng ký mới và thay đổi thông tin pháp lý được xử lý riêng. Dữ liệu đã duyệt vẫn có hiệu lực khi chờ thẩm định thay đổi.</p>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {/* #242: every record in one table (newest decisions included); "Xem chi tiết" opens the review dialog. */}
    {loading ? <p>Đang tải…</p> : items.length === 0 ? <p>Không có hồ sơ nào.</p> : <div className="review-table-wrap"><table className="review-table"><thead><tr><th>Loại</th><th>Tên công ty</th><th>Trạng thái</th><th>Ngày nộp</th><th>Thao tác</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td><span className="kind-tag">{item.kind === 'change' ? 'Thay đổi pháp lý' : 'Đăng ký mới'}</span></td><td>{item.name}</td><td><StatusBadge family={item.kind === 'change' ? 'legal' : 'agency'} status={item.status} /></td><td>{item.submitted}</td><td><button className="btn-view" onClick={() => { setSelected(item); setComment(''); setDecision('Approve'); setError('') }}>Xem chi tiết</button></td></tr>)}</tbody></table></div>}
    {selected && <div className="overlay" role="dialog" aria-modal="true" aria-label="Chi tiết hồ sơ" onClick={e => { if (e.target === e.currentTarget && !busy) setSelected(null) }}><section className="review-detail"><h2>{selected.name}</h2><p><StatusBadge family={selected.kind === 'change' ? 'legal' : 'agency'} status={selected.status} /></p><h3>Thông tin tài khoản</h3>{selected.account ? <dl>{Object.entries(selected.account).map(([key,value]) => <div key={key}><dt>{({user_id:'Mã tài khoản',name:'Họ tên',email:'Email',role:'Vai trò',admin_type:'Loại quản trị',status:'Trạng thái',organization:'Tổ chức',created_at:'Ngày tạo',last_login:'Đăng nhập gần nhất'} as Record<string,string>)[key]}</dt><dd>{value || 'Chưa có'}</dd></div>)}</dl> : <p>Chưa có tài khoản liên kết.</p>}<h3>Nội dung đề nghị</h3><dl>{Object.entries(selected.fields).map(([key,value]) => <div key={key}><dt>{labels[key] || key}</dt><dd>{readable(value)}</dd></div>)}</dl><h3>Tài liệu</h3>{selected.documents.length ? selected.documents.map((document,index) => <p key={index}>{document.available && document.href ? <a href={document.href}>{document.name}</a> : document.name} · {document.type}{!document.available && " — chưa có file gốc để tải"}</p>) : <p>Không có tài liệu kèm theo.</p>}<h3>Lịch sử</h3>{selected.history.map(row => <p key={row.review_id}>{row.decided_at} · {row.decision} · {row.comments}</p>)}
      {['Pending Approval','Pending Review'].includes(selected.status) && <form onSubmit={submit}><label>Quyết định<select value={decision} onChange={e => setDecision(e.target.value)} disabled={busy}><option value="Approve">Duyệt</option><option value="Request More Information">Yêu cầu bổ sung</option><option value="Reject">Từ chối</option></select></label><label>Nhận xét{decision !== 'Approve' ? ' (bắt buộc)' : ''}<textarea value={comment} onChange={e => setComment(e.target.value)} required={decision !== 'Approve'} disabled={busy}/></label><button disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu quyết định'}</button></form>}<button disabled={busy} onClick={() => setSelected(null)}>Đóng</button></section></div>}
    <style jsx>{`.review-page{max-width:1180px;margin:auto;padding:32px 24px;color:#203229}.review-page h1{font:700 38px Georgia,serif;margin:12px 0}.review-page>p{margin-bottom:18px}.review-table-wrap{overflow:auto;margin:24px 0;border:1px solid #ded8cb;border-radius:14px;background:#fffdf8}.review-table{border-collapse:collapse;width:100%;min-width:600px}.review-table th,.review-table td{padding:14px 16px;text-align:left;border-bottom:1px solid #ded8cb;font-size:14px}.review-table th{background:#eef2e9;font-weight:700}.review-table tr:last-child td{border-bottom:0}.kind-tag{font-size:11px;font-weight:800;letter-spacing:.08em;color:#9a4a2a;text-transform:uppercase}.btn-view{margin:0;padding:8px 14px;background:#fffdf8;color:#203229}.overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow-y:auto;background:rgba(0,0,0,.45)}.review-detail{width:100%;max-width:680px;margin:auto;padding:32px;border:1px solid #ded8cb;border-radius:16px;background:#fffdf8;box-shadow:0 8px 40px rgba(0,0,0,.18)}.review-detail h3{margin:20px 0 12px}dl>div{display:grid;grid-template-columns:200px 1fr;gap:16px;border-bottom:1px solid #eee;padding:10px 0}dd{overflow-wrap:anywhere}label{display:grid;gap:8px;margin:12px 0}select,textarea,button{font:inherit;padding:12px;border:1px solid #bec9bd;border-radius:8px}textarea{min-height:100px}button{cursor:pointer;margin:8px 8px 8px 0}button:disabled{opacity:.5}[role=alert]{color:#a51f30}[role=status]{color:#355b46}@media(max-width:650px){dl>div{grid-template-columns:1fr}}`}</style>
  </main>
}
