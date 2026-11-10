import Link from 'next/link'
import { sessionDisplayName } from '@/lib/auth/session'
import { currentServerSession } from '@/lib/auth/server-session'
import { demoRepository } from '@/lib/db/application-store'
import { adminProviderQueue } from '@/lib/prf/provider-review-view'

export const dynamic = 'force-dynamic'

export default async function AdminProvidersPage() {
  const session = (await currentServerSession())
  if (session.role !== 'ADMIN' || !session.adminType) {
    return <main className="admin-state"><h1>Provider review</h1><p>Đăng nhập bằng tài khoản UBND Admin hoặc HDT Admin để truy cập.</p><Link href="/login">Đăng nhập</Link></main>
  }
  const repository = demoRepository()
  // PRF Q32 / BR-007: status, counts and order follow the version under review (an open revision of a
  // published provider is Pending / Revision Required although the provider itself stays Verified).
  const { rows: providers, counts } = adminProviderQueue(
    (await repository.all('provider_profiles')), (await repository.all('provider_profile_versions')), (await repository.all('villages')),
    session.adminType === 'HDT' ? null : (session.assignedVillageId ?? ''),
  )

  return <main className="admin-review"><header><p>HANOI ARTISAN BRIDGE · ADMIN</p><h1>Provider verification queue</h1><span>{(await sessionDisplayName(session))} · {session.adminType === 'UBND' ? 'Phạm vi một làng nghề' : 'Theo dõi toàn Hà Nội'}</span></header>
    <section className="admin-summary"><div><strong>{providers.length}</strong><span>Tổng Provider trong phạm vi</span></div><div><strong>{counts.pending}</strong><span>Chờ thẩm định</span></div><div><strong>{counts.revision}</strong><span>Cần chỉnh sửa</span></div></section>
    <section className="admin-table"><div className="admin-row admin-row--head"><span>Provider</span><span>Làng nghề</span><span>Trạng thái</span><span>Thao tác</span></div>
      {providers.map(item => <div className="admin-row" key={item.provider.provider_id}><span><strong>{item.version?.business_name || item.provider.provider_id}</strong><small>{item.version?.craft_type || 'Chưa khai báo nghề'}</small></span><span>{item.village?.name || 'Không xác định'}</span><span><mark data-status={item.state.review_status}>{item.state.label}</mark></span><span><Link href={`/admin/providers/${item.provider.provider_id}`}>Xem hồ sơ →</Link></span></div>)}
    </section><style dangerouslySetInnerHTML={{ __html: adminStyles }} /></main>
}

const adminStyles = `.admin-review,.admin-state{max-width:1120px;margin:auto;padding:42px 24px 80px;color:#1e2f27}.admin-review header p{font-size:11px;letter-spacing:.14em;color:#9a4a2a;font-weight:800}.admin-review h1{font:600 44px Georgia,serif;margin:8px 0}.admin-review header span{color:#66746d}.admin-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:28px 0}.admin-summary div{display:grid;padding:20px;background:#f4efe5;border-radius:14px}.admin-summary strong{font:600 30px Georgia,serif}.admin-summary span,.admin-row small{color:#66746d}.admin-table{border:1px solid #ddd6ca;border-radius:14px;overflow:hidden}.admin-row{display:grid;grid-template-columns:2fr 1.2fr 1fr .8fr;gap:14px;align-items:center;padding:15px 18px;border-top:1px solid #eee;background:white}.admin-row:first-child{border:0}.admin-row>span:first-child{display:grid;gap:4px}.admin-row--head{background:#243b30;color:white;font-size:12px;text-transform:uppercase;font-weight:800}.admin-row mark{padding:4px 8px;border-radius:999px;background:#f3dfbd}.admin-row a{color:#9a4a2a;font-weight:800}.admin-state{text-align:center}@media(max-width:720px){.admin-summary{grid-template-columns:1fr}.admin-row{grid-template-columns:1fr}.admin-row--head{display:none}}`
