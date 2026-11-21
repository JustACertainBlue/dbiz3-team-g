// VER146 Chi tiết hồ sơ Agency, mockup v3 screen 41a (png/41a): registration or legal-information change, HDT only.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentServerSession } from '@/lib/auth/server-session'
import { agencyReviews } from '@/lib/auth/agency-review'
import { demoRepository } from '@/lib/db/application-store'
import { hanoiClock } from '@/lib/time/hanoi-time'
import { adminGuestRedirect } from '../../admin-page-access'
import { formatDate } from '@/lib/adm/v3-accounts'
import { COMPANY_TYPE, fileSize, readable } from '../../_v3/profile-format'
import DecisionForm from '../../_v3/DecisionForm'
import { Button, Container, StatusPill } from '@/app/components/ui'
import '../../_v3/admin-v3.css'

export const dynamic = 'force-dynamic'

export default async function AgencyProfilePage({ params }: { params: { id: string } }) {
  const session = await currentServerSession()
  const guest = adminGuestRedirect(session)
  if (guest) redirect(guest)
  const back = <Link href="/admin/agencies" className="av3-back">‹ Danh sách hồ sơ</Link>
  let item: Awaited<ReturnType<typeof agencyReviews>>[number] | undefined
  try { item = (await agencyReviews(session)).find(r => r.id === params.id) } catch { item = undefined }
  if (!item) return <Container as="main" className="av3">{back}<h1>Không xem được hồ sơ này</h1><p className="av3-lead">Hồ sơ không tồn tại hoặc chỉ Sở Du lịch được xem hồ sơ công ty lữ hành.</p></Container>

  const files = await demoRepository().all('stored_files')
  const f = item.fields as Record<string, unknown>
  const pending = item.status === 'Pending Approval' || item.status === 'Pending Review'
  const rows: Array<[string, React.ReactNode]> = item.kind === 'change'
    ? [['Tên công ty', f.proposed_company_name ? <><span className="av3-old">{String(f.company_name)}</span><span className="av3-new">{String(f.proposed_company_name)}</span></> : String(f.company_name || '')],
      ['Mã số thuế', f.proposed_tax_id ? <><span className="av3-old">{String(f.tax_id)}</span><span className="av3-new">{String(f.proposed_tax_id)}</span></> : String(f.tax_id || '')]]
    : [['Mã số thuế', readable(f.tax_id)], ['Loại hình', COMPANY_TYPE[String(f.company_type)] ?? readable(f.company_type)], ['Địa chỉ', readable(f.location)],
      ['Người liên hệ', readable(f.full_name)], ['Loại tour', readable(f.tour_types, '; ')]]
  const submitted = `gửi ${hanoiClock(item.submitted)}, ${formatDate(item.submitted)}`

  return <Container as="main" className="av3">
    {back}
    <div className="av3-stack" style={{ marginTop: 8 }}>
      <section className="av3-card" aria-labelledby="av3-name">
        <div className="av3-profile-head"><div><h1 id="av3-name" style={{ fontSize: 30, lineHeight: '38px' }}>{item.name}</h1>
          <p className="av3-lead">{item.kind === 'change' ? 'Đổi thông tin pháp lý' : 'Đăng ký mới'} · {submitted} · <StatusPill tone={pending ? 'warn' : item.status === 'Approved' ? 'success' : 'danger'}>{pending ? 'Chờ duyệt' : item.status === 'Approved' ? 'Đã duyệt' : 'Từ chối'}</StatusPill></p></div>
          {item.account && <Button href={`/admin/users/${item.account.user_id}`} variant="secondary" size="sm">Thông tin tài khoản</Button>}</div>
        <dl className="av3-dl">{rows.map(([k, v]) => <div className="av3-kv" key={k}><dt>{k}</dt><dd>{v || 'Chưa có'}</dd></div>)}</dl>
      </section>

      {item.documents.length > 0 && <section className="av3-card" aria-labelledby="av3-docs"><h2 id="av3-docs">Giấy tờ đính kèm</h2>
        <div className="av3-docs">{item.documents.map((d, i) => { const id = d.href?.split('/').pop(); const size = fileSize(files.find(x => x.file_id === id)?.file_size_bytes); return <div className="av3-doc" key={i}>
          <span><b>{d.name}</b>{size ? ` · ${size}` : ''}{!d.available && <span className="av3-cap"> · chưa có file gốc để mở</span>}</span>
          {d.available && d.href && <a className="av3-ul" href={d.href} target="_blank" rel="noreferrer" aria-label={`Mở ${d.name}`}>Mở</a>}</div> })}</div></section>}

      {pending ? <DecisionForm target={{ type: 'agency', id: item.id, kind: item.kind === 'change' ? 'change' : 'registration' }} backHref="/admin/agencies" />
        : item.history.length > 0 && <section className="av3-card" aria-labelledby="av3-hist"><h2 id="av3-hist">Lịch sử quyết định</h2><ul className="av3-hist">{item.history.map(h => <li key={String(h.review_id)}><span><b>{({ Approve: 'Đã duyệt', Reject: 'Từ chối', 'Request More Information': 'Yêu cầu bổ sung' } as Record<string, string>)[String(h.decision)] ?? String(h.decision)}</b> · {formatDate(String(h.decided_at))}{h.comments ? ` · ${String(h.comments)}` : ''}</span></li>)}</ul></section>}
    </div>
  </Container>
}
