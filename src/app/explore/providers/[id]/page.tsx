import Link from 'next/link';
import MediaImage from '@/app/components/MediaImage';
import { notFound } from 'next/navigation';
import { resolveViewer } from '../../../../lib/explore/catalog';
import { getProviderDetail } from '../../../../lib/explore/details';
import { loadExploreRuntime } from '../../../../lib/explore/seed-repository';
import ExploreTracker from '../../ExploreTracker';
import { currentServerSession } from '../../../../lib/auth/server-session';
import ProviderChatAction from '../../ProviderChatAction';

export default function ProviderPage({ params }: { params: { id: string } }) {
  const seed = loadExploreRuntime();
  const session = currentServerSession();
  const viewer = resolveViewer(seed, session.role === 'Tour_Agency' ? session.agencyId : null, true);
  const detail = getProviderDetail(seed, params.id, viewer);
  if (!detail) notFound();
  const isAgency = viewer.kind === 'agency';

  return <div className="explore-module">
    <ExploreTracker demoAgencyId={isAgency ? viewer.agencyId : undefined} />

    <main className="explore-surface detail-page provider-page">
      <nav className="detail-breadcrumb" aria-label="Breadcrumb"><Link href="/explore">Explore</Link><span>/</span><span>{detail.village_name}</span><span>/</span><strong>{detail.provider_name}</strong></nav>

      <section className="provider-hero">
        <div className="provider-hero__copy"><span className="verified-provider">✓ Xưởng đã xác minh</span><p className="eyebrow">{detail.village_name} · {detail.craft_type}</p><h1>{detail.provider_name}</h1><p className="hero-lead">{detail.public_bio}</p>
          <div className="provider-hero__actions">{isAgency ? <><ProviderChatAction choices={detail.experiences.map(item=>({id:item.id,name:item.name}))} /><Link className="button button--secondary" href={`/explore/providers/${params.id}/schedule`}>Xem lịch trống</Link></> : <Link className="button" href="/login">Đăng nhập để hợp tác</Link>}<a className="button button--secondary" href="#experiences">Xem trải nghiệm</a></div></div>
        <MediaImage src={detail.public_images[0]} alt={detail.provider_name}/>
      </section>

      <section className="provider-facts">
        <div><span>⌖</span><small>Địa điểm</small><strong>{detail.location_address}</strong></div>
        <div><span>◇</span><small>Làng nghề</small><Link href={`/village/${detail.village_id}`}>{detail.village_name} →</Link></div>
        <div><span>✓</span><small>Trạng thái</small><strong>Đã xác minh</strong></div>
      </section>

      <section className="media-gallery-grid" aria-label="Hình ảnh xưởng">{detail.public_images.length?detail.public_images.map((url,index)=><MediaImage key={url} src={url} alt={`Ảnh xưởng ${index+1}`}/>):<MediaImage alt={detail.provider_name}/>}</section>

      <section className="provider-story"><div><p className="section-number">Câu chuyện đơn vị</p><h2>Gìn giữ nghề, mở ra những hành trình mới</h2></div><p>{detail.public_bio}</p></section>

      {detail.private_contact && <section className="agency-contact-banner"><div><p className="section-number">Thông tin hợp tác</p><h2>Kết nối trực tiếp với đơn vị</h2><p>Thông tin này chỉ hiển thị cho doanh nghiệp du lịch đã được xác minh.</p></div><div><strong>{detail.private_contact.phone}</strong><span>{detail.private_contact.email}</span><ProviderChatAction choices={detail.experiences.map(item=>({id:item.id,name:item.name}))} /></div></section>}

      <section id="experiences" className="provider-experiences"><div className="section-heading"><div><p className="eyebrow">Danh mục của xưởng</p><h2>Trải nghiệm đang cung cấp</h2></div><span>{detail.experiences.length} trải nghiệm</span></div>
        <div className="provider-experience-grid">{!detail.experiences.length&&<p>Chưa có trải nghiệm đang cung cấp.</p>}{detail.experiences.map((card, index) => <article key={card.id} className="provider-experience-card"><MediaImage src={card.images[0]?.storage_key} alt={card.name}/><div className="provider-experience-card__body"><p className="card-kicker"><span>{card.duration_minutes} phút</span><span>1–{card.capacity.max_pax} khách</span></p><h3>{card.name}</h3><p>{card.description}</p><div><strong>{card.price === null ? 'Giá dành cho Agency' : `${card.price.toLocaleString('vi-VN')} ₫ / khách`}</strong><Link href={`/explore/experiences/${card.id}`}>Chi tiết →</Link></div></div></article>)}</div>
      </section>

      {!isAgency && <section className="guest-cta"><div><p className="eyebrow">Dành cho công ty du lịch</p><h2>Cần giá B2B, lịch đoàn hoặc trao đổi trực tiếp?</h2><p>Đăng nhập để mở khóa thông tin hợp tác đã được xác minh.</p></div><div><Link className="button" href="/login">Đăng nhập Agency</Link><Link className="button button--secondary" href="/register">Đăng ký tài khoản</Link></div></section>}
    </main>
    <footer className="explore-footer"><div><strong>Hanoi Artisan Bridge</strong><p>Nơi di sản trở thành hành trình đáng nhớ.</p></div><Link href="/explore">Quay lại Explore</Link></footer>
  </div>;
}
