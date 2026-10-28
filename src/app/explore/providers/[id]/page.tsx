import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveViewer } from '../../../../lib/explore/catalog';
import { getProviderDetail } from '../../../../lib/explore/details';
import { loadExploreRuntime } from '../../../../lib/explore/seed-repository';
import ExploreHeader from '../../ExploreHeader';
import ExploreTracker from '../../ExploreTracker';
import { cookies } from 'next/headers';
import { DEMO_SESSION_COOKIE, demoSessionFor } from '../../../../lib/auth/demo-session';
import ProviderChatAction from '../../ProviderChatAction';

export default function ProviderPage({ params }: { params: { id: string } }) {
  const seed = loadExploreRuntime();
  const session = demoSessionFor(cookies().get(DEMO_SESSION_COOKIE)?.value);
  const viewer = resolveViewer(seed, session.role === 'TourAgency' ? session.agencyId : null, true);
  const detail = getProviderDetail(seed, params.id, viewer);
  if (!detail) notFound();
  const isAgency = viewer.kind === 'agency';

  return <div className="explore-module">
    <ExploreTracker demoAgencyId={isAgency ? viewer.agencyId : undefined} />
    <ExploreHeader viewer={viewer.kind} agencyId={isAgency ? viewer.agencyId : undefined} />

    <main className="explore-surface detail-page provider-page">
      <nav className="detail-breadcrumb" aria-label="Breadcrumb"><Link href="/explore">Explore</Link><span>/</span><span>{detail.village_name}</span><span>/</span><strong>{detail.provider_name}</strong></nav>

      <section className="provider-hero">
        <div className="provider-hero__copy"><span className="verified-provider">✓ Verified heritage provider</span><p className="eyebrow">{detail.village_name} · {detail.craft_type}</p><h1>{detail.provider_name}</h1><p className="hero-lead">{detail.public_bio}</p>
          <div className="provider-hero__actions">{isAgency ? <ProviderChatAction experienceId={detail.experiences[0]?.id} /> : <Link className="button" href="/login">Đăng nhập để hợp tác</Link>}<a className="button button--secondary" href="#experiences">Xem trải nghiệm</a></div></div>
        <div className="provider-portrait" role="img" aria-label={`Minh họa ${detail.provider_name}`}><div className="portrait-seal"><span>Est.</span><strong>HN</strong></div><p>Artisan workshop</p><small>{detail.craft_type}</small></div>
      </section>

      <section className="provider-facts">
        <div><span>⌖</span><small>Địa điểm</small><strong>{detail.location_address}</strong></div>
        <div><span>◇</span><small>Làng nghề</small><strong>{detail.village_name}</strong></div>
        <div><span>✓</span><small>Trạng thái</small><strong>Đã xác minh</strong></div>
      </section>

      <section className="provider-gallery"><div className="provider-gallery__main"><span>Workshop archive</span><strong>{detail.provider_name}</strong></div><div className="provider-gallery__side"><div><span>01</span><small>Không gian làm nghề</small></div><div><span>02</span><small>Nghệ nhân & kỹ thuật</small></div></div></section>

      <section className="provider-story"><div><p className="section-number">Câu chuyện đơn vị</p><h2>Gìn giữ nghề, mở ra những hành trình mới</h2></div><p>{detail.public_bio}</p></section>

      {detail.private_contact && <section className="agency-contact-banner"><div><p className="section-number">Agency collaboration access</p><h2>Kết nối trực tiếp với đơn vị</h2><p>Thông tin này chỉ hiển thị cho doanh nghiệp du lịch đã được xác minh.</p></div><div><strong>{detail.private_contact.phone}</strong><span>{detail.private_contact.email}</span><ProviderChatAction experienceId={detail.experiences[0]?.id} /></div></section>}

      <section id="experiences" className="provider-experiences"><div className="section-heading"><div><p className="eyebrow">Danh mục của Provider</p><h2>Trải nghiệm đang cung cấp</h2></div><span>{detail.experiences.length} trải nghiệm</span></div>
        <div className="provider-experience-grid">{detail.experiences.map((card, index) => <article key={card.id} className="provider-experience-card"><div className={`related-card__art related-card__art--${index % 3}`}><span>{card.type}</span></div><div className="provider-experience-card__body"><p className="card-kicker"><span>{card.duration_minutes} phút</span><span>1–{card.capacity.max_pax} khách</span></p><h3>{card.name}</h3><p>{card.description}</p><div><strong>{card.price === null ? 'Giá dành cho Agency' : `${card.price.toLocaleString('vi-VN')} ₫ / khách`}</strong><Link href={`/explore/experiences/${card.id}`}>Chi tiết →</Link></div></div></article>)}</div>
      </section>

      {!isAgency && <section className="guest-cta"><div><p className="eyebrow">Dành cho công ty du lịch</p><h2>Cần giá B2B, lịch đoàn hoặc trao đổi trực tiếp?</h2><p>Đăng nhập để mở khóa thông tin hợp tác đã được xác minh.</p></div><div><Link className="button" href="/login">Đăng nhập Agency</Link><Link className="button button--secondary" href="/login">Đăng ký tài khoản</Link></div></section>}
    </main>
    <footer className="explore-footer"><div><strong>Hanoi Artisan Bridge</strong><p>Nơi di sản trở thành hành trình đáng nhớ.</p></div><Link href="/explore">Quay lại Explore</Link></footer>
  </div>;
}
