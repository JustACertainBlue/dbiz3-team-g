// VER146 / ADM145 Chi tiết hồ sơ xưởng, mockup v3 screen 41a (png/41a). HDT views, UBND of the same village decides.
import { objectExists } from '@/lib/storage/object-store'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import MediaImage from '@/app/components/MediaImage'
import { mediaUrl } from '@/lib/prf/media-urls'
import { currentServerSession } from '@/lib/auth/server-session'
import { demoRepository } from '@/lib/db/application-store'
import { providerReviewState, reviewHistoryRows } from '@/lib/prf/provider-review-view'
import { hanoiClock } from '@/lib/time/hanoi-time'
import { adminGuestRedirect } from '../../admin-page-access'
import { formatDate } from '@/lib/adm/v3-accounts'
import { fileSize, readable } from '../../_v3/profile-format'
import DecisionForm from '../../_v3/DecisionForm'
import { Button, Container, StatusPill } from '@/app/components/ui'
import '../../_v3/admin-v3.css'

export const dynamic = 'force-dynamic'

export default async function AdminProviderDetail({ params }: { params: { id: string } }) {
  const session = await currentServerSession()
  const guest = adminGuestRedirect(session)
  if (guest) redirect(guest)
  const listHref = session.adminType === 'UBND' ? '/admin/providers' : '/admin/agencies'
  const back = <Link href={listHref} className="av3-back">‹ Danh sách hồ sơ</Link>
  const repository = demoRepository()
  const provider = await repository.find('provider_profiles', row => row.provider_id === params.id)
  const allowed = provider && session.role === 'ADMIN' && (session.adminType === 'HDT' || (session.adminType === 'UBND' && session.assignedVillageId === provider.village_id))
  if (!provider || !allowed) return <Container as="main" className="av3">{back}<h1>Không xem được hồ sơ này</h1><p className="av3-lead">Hồ sơ không tồn tại hoặc nằm ngoài phạm vi bạn quản lý.</p></Container>

  const version = await repository.find('provider_profile_versions', row => row.provider_id === params.id && row.version_no === provider.current_version_no)
  const village = await repository.find('villages', row => row.village_id === provider.village_id)
  const reviews = reviewHistoryRows((await repository.all('provider_verification_reviews')).filter(row => row.provider_id === params.id))
  const certificateLink = await repository.find('provider_version_documents', row => row.provider_id === params.id && row.version_no === version?.version_no && row.document_type === 'Business Registration Certificate')
  const certificate = certificateLink && await repository.find('stored_files', row => row.file_id === certificateLink.file_id)
  const certificateAvailable = Boolean(certificate && certificate.storage_key === `prf-media/${certificate.file_id}` && await objectExists(certificate.storage_key))
  const mediaRows = (await repository.all('provider_version_media')).filter(row => row.provider_id === params.id && row.version_no === version?.version_no).sort((a, b) => Number(a.display_order) - Number(b.display_order))
  const images = (await Promise.all(mediaRows.map(async row => { const file = await repository.find('stored_files', item => item.file_id === row.file_id); return file ? [file] : [] }))).flat()
  const state = providerReviewState(provider, await repository.all('provider_profile_versions'))
  const account = await repository.find('user_accounts', row => row.user_id === provider.user_id)
  let contact: Record<string, unknown> = {}; try { contact = JSON.parse(String(version?.contact_information || '{}')) } catch { /* keep empty */ }
  const pending = state.review_status === 'Pending Verification'
  const canDecide = pending && session.adminType === 'UBND'
  const tone = pending ? 'warn' : state.review_status === 'Verified' ? 'success' : 'warn'
  const rows: Array<[string, string]> = [
    ['Mã đăng ký kinh doanh', String(version?.business_registration_number || '')], ['Làng nghề', String(village?.name || '')], ['Nghề', String(version?.craft_type || '')],
    ['Địa chỉ', String(version?.location_address || '')], ['Nghệ nhân', readable(version?.artisan_names)],
    ['Liên hệ', [contact.phone_number, contact.business_email].filter(Boolean).join(' · ')], ['Mô tả', String(version?.description || '')],
  ]

  return <Container as="main" className="av3">
    {back}
    <div className="av3-stack" style={{ marginTop: 8 }}>
      <section className="av3-card" aria-labelledby="av3-name">
        <div className="av3-profile-head"><div><h1 id="av3-name" style={{ fontSize: 30, lineHeight: '38px' }}>{String(version?.business_name || 'Hồ sơ xưởng')}</h1>
          <p className="av3-lead">Xác minh xưởng · phiên bản {String(version?.version_no ?? '')}{version?.submitted_at ? ` · gửi ${hanoiClock(String(version.submitted_at))}, ${formatDate(String(version.submitted_at))}` : ''} · <StatusPill tone={tone}>{pending ? (session.adminType === 'HDT' ? 'Chờ UBND xã duyệt' : 'Chờ duyệt') : state.label}</StatusPill></p></div>
          {account && <Button href={`/admin/users/${account.user_id}`} variant="secondary" size="sm">Thông tin tài khoản</Button>}</div>
        {pending && session.adminType === 'HDT' && <p className="av3-notice">Sở chỉ xem hồ sơ này, UBND xã quyết định.</p>}
        <dl className="av3-dl">{rows.map(([k, v]) => <div className="av3-kv" key={k}><dt>{k}</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{v || 'Chưa có'}</dd></div>)}</dl>
      </section>

      <section className="av3-card" aria-labelledby="av3-docs"><h2 id="av3-docs">Giấy tờ đính kèm</h2>
        <div className="av3-docs">{certificate ? <div className="av3-doc"><span><b>{String(certificate.file_name)}</b>{fileSize(certificate.file_size_bytes) ? ` · ${fileSize(certificate.file_size_bytes)}` : ''}{!certificateAvailable && <span className="av3-cap"> · chưa có file gốc để mở</span>}</span>
          {certificateAvailable && <a className="av3-ul" href={mediaUrl(String(certificate.storage_key))} target="_blank" rel="noreferrer" aria-label={`Mở ${String(certificate.file_name)}`}>Mở</a>}</div> : <p className="av3-empty" style={{ padding: 0 }}>Hồ sơ chưa có giấy đăng ký kinh doanh.</p>}</div>
        {images.length > 0 && <><h3 style={{ marginTop: 24 }}>Ảnh xưởng</h3><div className="av3-gallery">{images.map(file => <MediaImage key={String(file.file_id)} src={mediaUrl(String(file.storage_key))} alt={String(file.file_name)} />)}</div></>}
      </section>

      {canDecide && <DecisionForm target={{ type: 'provider', id: params.id }} backHref="/admin/providers" />}

      {reviews.length > 0 && <section className="av3-card" aria-labelledby="av3-hist"><h2 id="av3-hist">Lịch sử thẩm định</h2><ul className="av3-hist">{reviews.map(r => <li key={r.review_id}><span><b>{r.heading}</b> · {formatDate(r.reviewed_at)}{r.comments ? ` · ${r.comments}` : ''}</span></li>)}</ul></section>}
    </div>
  </Container>
}
