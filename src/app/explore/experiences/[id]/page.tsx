import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveViewer } from '../../../../lib/explore/catalog';
import { getExperienceDetail } from '../../../../lib/explore/details';
import { loadExploreRuntime } from '../../../../lib/explore/seed-repository';
import ExploreHeader from '../../ExploreHeader';
import ExploreTracker from '../../ExploreTracker';
import { cookies } from 'next/headers';
import { DEMO_SESSION_COOKIE, demoSessionFor } from '../../../../lib/auth/demo-session';
import ExperienceActions from '../../ExperienceActions';

function slotLabel(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function ExperienceEntry({ params }: { params: { id: string } }) {
  const seed = loadExploreRuntime();
  const session = demoSessionFor(cookies().get(DEMO_SESSION_COOKIE)?.value);
  const viewer = resolveViewer(seed, session.role === 'TourAgency' ? session.agencyId : null, true);
  const detail = getExperienceDetail(seed, params.id, viewer);
  if (!detail) notFound();
  const { card } = detail;
  const isAgency = viewer.kind === 'agency';
  const back = '/explore';

  return <div className="explore-module">
    <ExploreTracker demoAgencyId={isAgency ? viewer.agencyId : undefined} detailExperienceId={card.id} />
    <ExploreHeader viewer={viewer.kind} agencyId={isAgency ? viewer.agencyId : undefined} />

    <main className="explore-surface detail-page">
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <Link href={back}>Explore</Link><span>/</span><span>{card.location.village_name}</span><span>/</span><strong>{card.name}</strong>
      </nav>

      <section className="detail-titlebar">
        <div><p className="eyebrow">{card.type} · Verified experience</p><h1>{card.name}</h1>
          <div className="detail-meta"><span>⌖ {card.location.village_name}</span><span>◷ {card.duration_minutes} phút</span><span>Nhóm 1–{card.capacity.max_pax} khách</span></div></div>
        <span className={`mode-badge ${isAgency ? 'mode-badge--agency' : ''}`}>{isAgency ? 'Agency view' : 'Public view'}</span>
      </section>

      <section className="experience-hero-grid">
        <div className="detail-visual detail-visual--main" role="img" aria-label={`Minh họa ${card.name}`}>
          <span className="detail-visual__index">01</span><div className="detail-visual__craft">{card.type}</div><small>Artisan experience · Hanoi</small>
        </div>
        <aside className="access-card">
          <p className="access-card__label">{isAgency ? 'B2B wholesale access' : 'Pricing & access'}</p>
          {isAgency && detail.pricing_breakdown
            ? <><div className="access-price">{detail.pricing_breakdown.price_per_person.toLocaleString('vi-VN')} ₫ <small>/ khách</small></div><p>Giá dành cho doanh nghiệp du lịch đã được xác minh.</p></>
            : <><div className="locked-rate"><span>◇</span><strong>Giá B2B được bảo vệ</strong></div><p>Đăng nhập bằng tài khoản Agency để xem giá hợp đồng và điều kiện hợp tác.</p></>}
          <div className="access-facts"><span><small>Sức chứa</small><strong>Tối đa {card.capacity.max_pax} khách</strong></span><span><small>Thời lượng</small><strong>{card.duration_minutes} phút</strong></span></div>
          {isAgency
            ? <ExperienceActions experienceId={card.id} />
            : <div className="stack-actions"><Link className="button" href="/login">Đăng nhập để liên hệ</Link><Link className="button button--secondary" href="/login">Đăng ký Agency</Link></div>}
        </aside>
      </section>

      <section className="thumbnail-row" aria-label="Bộ sưu tập hình ảnh">
        {[1, 2, 3].map(number => <div key={number} className={`detail-visual detail-visual--thumb detail-visual--tone-${number}`}><span>0{number + 1}</span><small>{number === 1 ? 'Không gian xưởng' : number === 2 ? 'Kỹ thuật thủ công' : 'Thành phẩm'}</small></div>)}
      </section>

      <div className="detail-content-grid">
        <div>
          <section className="story-panel"><p className="section-number">01 · Câu chuyện trải nghiệm</p><h2>Nơi kỹ nghệ truyền thống được sống lại</h2><p className="story-lead">{card.description}</p><p>{detail.provider_public_bio || 'Thông tin giới thiệu đang được đơn vị cung cấp cập nhật.'}</p></section>

          <section className="content-panel"><div className="panel-heading"><div><p className="section-number">02 · Lịch hoạt động</p><h2>Khả năng đón đoàn</h2></div><span className="availability-chip">Cập nhật từ lịch Provider</span></div>
            <div className="availability-summary"><div><strong>{detail.availability_summary.available_slots.length}</strong><span>khoảng còn trống</span></div><div><strong>{detail.availability_summary.operating_hours.length}</strong><span>khung giờ hằng tuần</span></div><div><strong>{detail.availability_summary.blocked_slots.length}</strong><span>khoảng đã có lịch</span></div></div>
            {detail.availability_summary.available_slots.length > 0 && <div className="slot-list">{detail.availability_summary.available_slots.slice(0, 4).map((slot, index) => <div key={index}><span>Ngày có thể tiếp nhận</span><strong>{slotLabel(slot.start_at)} – {slotLabel(slot.end_at)}</strong></div>)}</div>}
          </section>

          {detail.operational_booking_info && <section className="content-panel"><p className="section-number">03 · Điều kiện hợp tác</p><h2>Thông tin vận hành dành cho Agency</h2><div className="info-tiles"><div><small>Thời gian báo trước</small><strong>{detail.operational_booking_info.booking_lead_time} giờ</strong></div><div><small>Địa điểm</small><strong>{detail.experience_location_address}</strong></div></div></section>}
        </div>

        <aside>
          <section className="provider-summary"><p className="section-number">Đơn vị tổ chức</p><div className="provider-monogram">{card.provider_name.slice(0, 2).toUpperCase()}</div><h2>{card.provider_name}</h2><p>{detail.provider_public_bio || 'Đơn vị trải nghiệm làng nghề đã được xác minh.'}</p>
            <Link className="button button--secondary" href={`/explore/providers/${detail.provider_id}`}>Xem hồ sơ Provider →</Link></section>
          {detail.provider_private_contact && <section className="contact-panel"><p className="section-number">Liên hệ hợp tác</p><p>{detail.provider_private_contact.phone}</p><p>{detail.provider_private_contact.email}</p></section>}
        </aside>
      </div>

      <section className="related-section"><div className="section-heading"><div><p className="eyebrow">Tiếp tục khám phá</p><h2>Trải nghiệm liên quan</h2></div><Link href={back}>Xem tất cả →</Link></div>
        {detail.related_experiences.length ? <div className="related-grid">{detail.related_experiences.slice(0, 3).map((related, index) => <Link className="related-card" key={related.id} href={`/explore/experiences/${related.id}`}><div className={`related-card__art related-card__art--${index}`}><span>{related.type}</span></div><div><small>{related.location.village_name}</small><strong>{related.name}</strong><span>{related.duration_minutes} phút · tối đa {related.capacity.max_pax} khách</span></div></Link>)}</div> : <p>Chưa có trải nghiệm liên quan.</p>}
      </section>
    </main>
    <footer className="explore-footer"><div><strong>Hanoi Artisan Bridge</strong><p>Nơi di sản trở thành hành trình đáng nhớ.</p></div><Link href={back}>Quay lại Explore</Link></footer>
  </div>;
}
