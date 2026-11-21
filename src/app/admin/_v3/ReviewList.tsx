// Screen 41 Duyệt hồ sơ (list), mockup v3 png/41: Agency and workshop profiles in one list; shared by /admin/agencies and /admin/providers.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentServerSession } from '@/lib/auth/server-session'
import { adminGuestRedirect } from '../admin-page-access'
import { adminScope, loadReviewQueue } from '@/lib/adm/v3-loaders'
import { filterReviewQueue, type QueueKind } from '@/lib/adm/v3-review-queue'
import { formatDate } from '@/lib/adm/v3-accounts'
import { Container, Pagination, StatusPill, Tabs } from '@/app/components/ui'
import QueueFilters from './QueueFilters'
import './admin-v3.css'

export type ReviewSearch = { tab?: string; q?: string; kind?: string; sort?: string; page?: string }

export default async function ReviewList({ basePath, searchParams }: { basePath: string; searchParams: ReviewSearch }) {
  const session = await currentServerSession()
  const guest = adminGuestRedirect(session)
  if (guest) redirect(guest.replace('next=/admin', `next=${basePath}`))
  const scope = adminScope(session)
  if (!scope) return <Container as="main" className="av3"><h1>Duyệt hồ sơ</h1><p className="av3-lead">Đăng nhập bằng tài khoản Sở Du lịch hoặc UBND xã để xem trang này.</p><p><Link href="/login">Đăng nhập</Link></p></Container>

  const { rows } = await loadReviewQueue(session)
  const tab = searchParams.tab === 'processed' ? 'processed' : 'pending'
  const kind = (['registration', 'change', 'workshop'] as const).includes(searchParams.kind as QueueKind) ? (searchParams.kind as QueueKind) : ''
  const f = filterReviewQueue(rows, { tab, q: searchParams.q, kind, sort: searchParams.sort === 'newest' ? 'newest' : 'oldest', page: Number(searchParams.page) || 1 })
  const link = (over: Record<string, string>) => { const sp = new URLSearchParams(); for (const [k, v] of Object.entries({ tab: tab === 'processed' ? 'processed' : '', q: searchParams.q ?? '', kind, sort: searchParams.sort ?? '', ...over })) if (v) sp.set(k, v); return `${basePath}${sp.toString() ? `?${sp}` : ''}` }

  return <Container as="main" className="av3">
    <h1>Duyệt hồ sơ</h1>
    <p className="av3-lead">{scope.adminType === 'HDT' ? 'Hồ sơ đăng ký và đổi thông tin pháp lý của công ty lữ hành. Hồ sơ xác minh xưởng do UBND xã quyết định.' : 'Hồ sơ xác minh xưởng của làng bạn quản lý. UBND xã quyết định duyệt hoặc yêu cầu bổ sung.'}</p>
    <div className="av3-tabs"><Tabs label="Trạng thái hồ sơ" items={[{ href: link({ tab: '', page: '' }), label: `Đang chờ (${f.counts.pending})`, active: tab === 'pending' }, { href: link({ tab: 'processed', page: '' }), label: `Đã xử lý (${f.counts.processed})`, active: tab === 'processed' }]} /></div>
    <div style={{ marginTop: 16 }}><QueueFilters showKind={scope.adminType === 'HDT'} /></div>
    <div className="av3-table-wrap" style={{ marginTop: 16 }}>
      {f.rows.length === 0 ? <p className="av3-empty" style={{ padding: 24 }}>{tab === 'pending' ? 'Không có hồ sơ nào đang chờ.' : 'Chưa có hồ sơ nào được xử lý.'}</p> :
        <table className="av3-table av3-table--review av3-table--stack"><thead><tr><th>Hồ sơ</th><th>Loại hồ sơ</th><th>Ngày gửi</th><th>Trạng thái</th><th><span className="sr-only" style={{ position: 'absolute', left: -9999 }}>Thao tác</span></th></tr></thead>
          <tbody>{f.rows.map(r => <tr key={r.key}>
            <td data-label="Hồ sơ"><span className="av3-name">{r.name}</span><small>{r.subtitle}</small></td>
            <td data-label="Loại hồ sơ"><span className="av3-tag">{r.kindLabel}</span></td>
            <td data-label="Ngày gửi">{formatDate(r.submitted)}</td>
            <td data-label="Trạng thái"><StatusPill tone={r.tone}>{r.statusLabel}</StatusPill>{r.note && <span className="av3-note">{r.note}</span>}</td>
            <td><Link className="av3-ul" href={r.href}>Xem chi tiết</Link></td></tr>)}</tbody></table>}
    </div>
    <Pagination from={f.from} to={f.to} total={f.total} unit="hồ sơ"
      prev={f.page > 1 ? { href: link({ page: String(f.page - 1) }) } : undefined} next={f.page < f.pages ? { href: link({ page: String(f.page + 1) }) } : undefined} />
  </Container>
}
