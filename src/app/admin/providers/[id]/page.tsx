import Link from 'next/link'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import MediaImage from '@/app/components/MediaImage'
import { mediaUrl } from '@/lib/prf/media-urls'
import { notFound } from 'next/navigation'
import { currentServerSession } from '@/lib/auth/server-session'
import { demoRepository } from '@/lib/db/application-store'
import ReviewActions from './ReviewActions'

export const dynamic = 'force-dynamic'

export default async function AdminProviderDetail({ params }: { params: { id: string } }) {
  const session = (await currentServerSession())
  const repository = demoRepository()
  const provider = (await repository.find('provider_profiles', row => row.provider_id === params.id))
  if (!provider) notFound()
  const allowed = session.role === 'ADMIN' && (
    session.adminType === 'HDT'
    || (session.adminType === 'UBND' && session.assignedVillageId === provider.village_id)
  )
  if (!allowed) return <main className="admin-detail"><h1>Không có quyền xem hồ sơ này</h1><Link href="/admin/providers">Quay lại danh sách</Link></main>
  const version = (await repository.find('provider_profile_versions', row => row.provider_id === params.id && row.version_no === provider.current_version_no))
  const village = (await repository.find('villages', row => row.village_id === provider.village_id))
  const reviews = (await repository.all('provider_verification_reviews')).filter(row => row.provider_id === params.id).sort((a, b) => b.reviewed_at.localeCompare(a.reviewed_at))

  const certificateLink=(await repository.find('provider_version_documents',row=>row.provider_id===params.id && row.version_no===version?.version_no && row.document_type==='Business Registration Certificate'))
  const certificate=certificateLink && (await repository.find('stored_files',row=>row.file_id===certificateLink.file_id))
  const certificateAvailable=certificate && certificate.storage_key===`prf-media/${certificate.file_id}` && existsSync(join(process.cwd(),'.demo-data','prf-media',certificate.file_id))
  const images=(await Promise.all((await repository.all('provider_version_media')).filter(row=>row.provider_id===params.id && row.version_no===version?.version_no).sort((a,b)=>Number(a.display_order)-Number(b.display_order)).map(async row=>{const file=(await repository.find('stored_files',item=>item.file_id===row.file_id));return file?[file]:[]}))).flat()
  const currentStatus=provider.published_version_no && provider.current_version_no!==provider.published_version_no?version?.version_status:provider.verification_status
  let contact:Record<string,unknown>={};try{contact=JSON.parse(version?.contact_information||'{}')}catch{}
  let artisans:string[]=[];try{artisans=JSON.parse(version?.artisan_names||'[]')}catch{}

  return <main className="admin-detail"><Link href="/admin/providers">← Hồ sơ chờ thẩm định</Link><header><p>{village?.name} · {version?.craft_type}</p><h1>{version?.business_name || 'Hồ sơ xưởng'}</h1><mark>{currentStatus}</mark><p>Đang xem phiên bản {version?.version_no}{provider.published_version_no ? ` · Bản công khai: ${provider.published_version_no}` : ' · Chưa có bản công khai'}</p></header>
    <div className="admin-detail__grid"><section><h2>Thông tin hồ sơ hiện tại</h2><dl><dt>Mã đăng ký</dt><dd>{version?.business_registration_number}</dd><dt>Địa chỉ</dt><dd>{version?.location_address}</dd><dt>Nghệ nhân</dt><dd>{artisans.join(', ') || 'Chưa bổ sung'}</dd><dt>Mô tả</dt><dd>{version?.description}</dd><dt>Liên hệ</dt><dd>{String(contact.phone_number || '')} · {String(contact.business_email || '')}</dd></dl></section><aside><h2>Lịch sử thẩm định</h2>{reviews.length ? reviews.map(review => <article key={review.review_id}><strong>{review.decision}</strong><p>{review.revision_comments || 'Không có nhận xét.'}</p><small>{review.reviewed_at}</small></article>) : <p>Chưa có lần thẩm định nào.</p>}</aside></div>
    <section className="review-actions"><h2>Giấy đăng ký kinh doanh · phiên bản {version?.version_no}</h2>{certificateAvailable && certificate?<a href={mediaUrl(certificate.storage_key)}>{certificate.file_name}</a>:<p>{certificate?'Dữ liệu hiện chỉ có thông tin file; chưa có file gốc để xem.':'Hồ sơ chưa có giấy đăng ký kinh doanh.'}</p>}<h2>Ảnh xưởng</h2><div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16}}>{images.map(file=><MediaImage key={file.file_id} src={mediaUrl(file.storage_key)} alt={file.file_name}/>)}</div>{!images.length&&<p>Chưa có ảnh xưởng.</p>}</section>
    {session.adminType === 'UBND' && currentStatus === 'Pending Verification' && <ReviewActions providerId={params.id}/>}<style>{detailStyles}</style></main>
}

const detailStyles = `.admin-detail{max-width:1050px;margin:auto;padding:42px 24px 80px;color:#203229}.admin-detail>a{color:#9a4a2a}.admin-detail header{padding:30px 0}.admin-detail header p{color:#9a4a2a;text-transform:uppercase;font-size:11px;font-weight:800}.admin-detail h1{font:600 45px Georgia,serif;margin:8px 0}.admin-detail mark{padding:5px 10px;border-radius:99px;background:#f3dfbd}.admin-detail__grid{display:grid;grid-template-columns:2fr 1fr;gap:22px}.admin-detail__grid>section,.admin-detail__grid>aside,.review-actions{padding:24px;border:1px solid #ddd6ca;border-radius:14px;background:white}.admin-detail dl{display:grid;grid-template-columns:140px 1fr;gap:13px}.admin-detail dt{font-weight:800}.admin-detail dd{margin:0;white-space:pre-wrap}.admin-detail aside article{padding:12px 0;border-top:1px solid #eee}.review-actions{margin-top:22px}.review-actions label{display:grid;gap:8px}.review-actions textarea{min-height:90px;padding:10px}.review-actions div{display:flex;gap:10px;margin-top:14px}.review-actions button{padding:10px 16px;border:0;border-radius:999px;background:#2f5b46;color:white;font-weight:800}.review-actions button+button{background:#a94f2d}@media(max-width:700px){.admin-detail__grid{grid-template-columns:1fr}.admin-detail dl{grid-template-columns:1fr}}`
