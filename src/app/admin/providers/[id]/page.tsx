import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { DEMO_SESSION_COOKIE, demoSessionFor } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import ReviewActions from './ReviewActions'

export const dynamic = 'force-dynamic'

export default function AdminProviderDetail({ params }: { params: { id: string } }) {
  const session = demoSessionFor(cookies().get(DEMO_SESSION_COOKIE)?.value)
  const repository = demoRepository()
  const provider = repository.find('provider_profiles', row => row.provider_id === params.id)
  if (!provider) notFound()
  const allowed = session.role === 'HDT' || (session.role === 'UBND' && session.villageId === provider.village_id)
  if (!allowed) return <main className="admin-detail"><h1>Không có quyền xem hồ sơ này</h1><Link href="/admin/providers">Quay lại danh sách</Link></main>
  const version = repository.find('provider_profile_versions', row => row.provider_id === params.id && row.version_no === provider.current_version_no)
  const village = repository.find('villages', row => row.village_id === provider.village_id)
  const reviews = repository.all('provider_verification_reviews').filter(row => row.provider_id === params.id).sort((a, b) => b.reviewed_at.localeCompare(a.reviewed_at))

  return <main className="admin-detail"><Link href="/admin/providers">← Provider queue</Link><header><p>{village?.name} · {version?.craft_type}</p><h1>{version?.business_name || 'Provider profile'}</h1><mark>{provider.verification_status}</mark></header>
    <div className="admin-detail__grid"><section><h2>Thông tin hồ sơ hiện tại</h2><dl><dt>Mã đăng ký</dt><dd>{version?.business_registration_number}</dd><dt>Địa chỉ</dt><dd>{version?.location_address}</dd><dt>Nghệ nhân</dt><dd>{version?.artisan_names}</dd><dt>Mô tả</dt><dd>{version?.description}</dd><dt>Liên hệ</dt><dd>{version?.contact_information}</dd></dl></section><aside><h2>Lịch sử review</h2>{reviews.length ? reviews.map(review => <article key={review.review_id}><strong>{review.decision}</strong><p>{review.revision_comments || 'Không có nhận xét.'}</p><small>{review.reviewed_at}</small></article>) : <p>Chưa có lần review nào.</p>}</aside></div>
    {session.role === 'UBND' && <ReviewActions providerId={params.id}/>}<style>{detailStyles}</style></main>
}

const detailStyles = `.admin-detail{max-width:1050px;margin:auto;padding:42px 24px 80px;color:#203229}.admin-detail>a{color:#9a4a2a}.admin-detail header{padding:30px 0}.admin-detail header p{color:#9a4a2a;text-transform:uppercase;font-size:11px;font-weight:800}.admin-detail h1{font:600 45px Georgia,serif;margin:8px 0}.admin-detail mark{padding:5px 10px;border-radius:99px;background:#f3dfbd}.admin-detail__grid{display:grid;grid-template-columns:2fr 1fr;gap:22px}.admin-detail__grid>section,.admin-detail__grid>aside,.review-actions{padding:24px;border:1px solid #ddd6ca;border-radius:14px;background:white}.admin-detail dl{display:grid;grid-template-columns:140px 1fr;gap:13px}.admin-detail dt{font-weight:800}.admin-detail dd{margin:0;white-space:pre-wrap}.admin-detail aside article{padding:12px 0;border-top:1px solid #eee}.review-actions{margin-top:22px}.review-actions label{display:grid;gap:8px}.review-actions textarea{min-height:90px;padding:10px}.review-actions div{display:flex;gap:10px;margin-top:14px}.review-actions button{padding:10px 16px;border:0;border-radius:999px;background:#2f5b46;color:white;font-weight:800}.review-actions button+button{background:#a94f2d}@media(max-width:700px){.admin-detail__grid{grid-template-columns:1fr}.admin-detail dl{grid-template-columns:1fr}}`
