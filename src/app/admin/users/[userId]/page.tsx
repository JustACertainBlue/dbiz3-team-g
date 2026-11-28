// ADM118 / VER119 Thông tin tài khoản, mockup v3 screen 40 (png/40). Read only; the list is scoped by listAccounts().
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentServerSession } from '@/lib/auth/server-session'
import { listAccounts } from '@/lib/auth/admin-accounts'
import { demoRepository } from '@/lib/db/application-store'
import { adminGuestRedirect } from '../../admin-page-access'
import { accountStatusView, formatDate, formatLastLogin, roleLabel } from '@/lib/adm/v3-accounts'
import { Container } from '@/app/components/ui'
import { statusLabel } from '@/lib/status-labels'
import '../../_v3/admin-v3.css'

export const dynamic = 'force-dynamic'

const STATUS_WORD: Record<string, string> = { Approved: statusLabel('agency', 'Approved'), Active: 'Đang hoạt động', Disabled: 'Đã tắt', 'Pending Approval': 'Chờ duyệt', Rejected: 'Bị từ chối' }

export default async function AccountInfoPage({ params }: { params: { userId: string } }) {
  const session = await currentServerSession()
  const guest = adminGuestRedirect(session)
  if (guest) redirect(guest)
  let account: Awaited<ReturnType<typeof listAccounts>>[number] | undefined
  try { account = (await listAccounts(session)).find(a => a.user_id === params.userId) } catch { account = undefined }
  if (!account) return <Container as="main" className="av3"><Link href="/admin/users" className="av3-back">‹ Quản lý tài khoản</Link><h1>Không xem được tài khoản này</h1><p className="av3-lead">Tài khoản không tồn tại hoặc nằm ngoài phạm vi bạn quản lý.</p></Container>

  const repo = demoRepository()
  const [history, users, registrations] = await Promise.all([repo.all('account_status_history'), repo.all('user_accounts'), repo.all('agency_registration_requests')])
  const actor = (id: string | undefined) => { const u = users.find(x => x.user_id === id); return !u ? '' : u.role_code === 'ADMIN' ? (u.admin_type === 'UBND' ? 'UBND xã' : 'Sở Du lịch') : u.full_name }
  const entries = history.filter(h => h.user_id === account!.user_id).sort((a, b) => String(b.changed_at).localeCompare(String(a.changed_at)))
    .map(h => ({ id: String(h.history_id), text: [STATUS_WORD[h.to_status] ?? h.to_status, actor(h.changed_by) || h.reason, formatDate(h.changed_at)].filter(Boolean) as string[] }))
  const registration = registrations.find(r => r.agency_user_id === account!.user_id)
  const profile = account.provider_id ? `/admin/providers/${account.provider_id}` : registration ? `/admin/agencies/${registration.registration_request_id}` : null
  const v = accountStatusView(account.status)

  return <Container as="main" className="av3">
    <Link href="/admin/users" className="av3-back">‹ Quản lý tài khoản</Link>
    <h1 style={{ marginTop: 12 }}>{account.name}</h1>
    <p className="av3-lead">{account.organization} · {roleLabel(account.role, account.admin_type)}</p>
    <div className="av3-row2 av3-row2--wide" style={{ gridTemplateColumns: '2.4fr 1fr', alignItems: 'start' }}>
      <section className="av3-card" aria-labelledby="av3-sys"><h2 id="av3-sys">Thông tin hệ thống</h2>
        <dl className="av3-dl">
          <div className="av3-kv"><dt>Mã tài khoản</dt><dd title={account.user_id}>{account.user_id.slice(0, 18)}…</dd></div>
          <div className="av3-kv"><dt>Email</dt><dd>{account.email}</dd></div>
          <div className="av3-kv"><dt>Vai trò</dt><dd>{roleLabel(account.role, account.admin_type)}</dd></div>
          <div className="av3-kv"><dt>Trạng thái</dt><dd style={{ color: v.group === 'active' ? 'var(--c-success)' : undefined }}>{v.label}</dd></div>
          <div className="av3-kv"><dt>Ngày đăng ký</dt><dd>{formatDate(account.created_date)}</dd></div>
          <div className="av3-kv"><dt>Đăng nhập gần nhất</dt><dd>{formatLastLogin(account.last_login)}</dd></div>
        </dl>
        {profile && <p className="av3-cardlink"><Link href={profile} className="av3-ul">Xem hồ sơ đã nộp ›</Link></p>}
      </section>
      <section className="av3-card" aria-labelledby="av3-hist"><h2 id="av3-hist">Lịch sử trạng thái</h2>
        {entries.length === 0 ? <p className="av3-empty">Chưa có thay đổi trạng thái.</p> : <ul className="av3-hist">{entries.map(e => <li key={e.id}><span><b>{e.text[0]}</b>{e.text.slice(1).map(t => ` · ${t}`).join('')}</span></li>)}</ul>}
      </section>
    </div>
  </Container>
}
