import Link from 'next/link';
import MediaImage from '@/app/components/MediaImage';
import { cancellationLines } from '@/lib/prf/experience-terms';
import { notFound } from 'next/navigation';
import { resolveViewer } from '../../../../lib/explore/catalog';
import { getExperienceDetail } from '../../../../lib/explore/details';
import { loadExploreRuntime } from '../../../../lib/explore/seed-repository';
import ExploreTracker from '../../ExploreTracker';
import { currentServerSession } from '../../../../lib/auth/server-session';
import ExperienceActions from '../../ExperienceActions';
import { hasQuoteRequest } from '../../../../lib/demo/commercial-handoff-service';
import { Lock, ShieldCheck } from 'lucide-react';
import '../../explore-v9.css';
import { categoryLabel } from '../../../../lib/explore/display-labels';

function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h && m ? `${h} giờ ${m} phút` : h ? `${h} giờ` : `${m} phút`;
}

function slotLabel(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default async function ExperienceEntry({ params }: { params: { id: string } }) {
  const seed = (await loadExploreRuntime());
  const session = (await currentServerSession());
  const viewer = resolveViewer(seed, session.role === 'Tour_Agency' ? session.agencyId : null, true);
  const detail = getExperienceDetail(seed, params.id, viewer);
  if (!detail) notFound();
  const { card } = detail;
  const isAgency = viewer.kind === 'agency';
  const back = '/explore';

  return <div className="explore-module xv xv-detail-page">
    <ExploreTracker demoAgencyId={isAgency ? viewer.agencyId : undefined} detailExperienceId={card.id} />

    <main className="explore-surface detail-page">
      <nav className="xv-breadcrumb" aria-label="Breadcrumb"><Link href={back}>Quay lại Khám phá</Link><span aria-hidden="true">/</span><span>{card.name}</span></nav>

      <section className="xv-detail">
        <div className="xv-detail__media"><MediaImage src={detail.gallery[0]} alt={card.name} large/></div>
        <aside className="xv-detail__card">
          <h1>{card.name}</h1>
          <p className="xv-detail__provider"><span>{card.provider_name} — {card.location.village_name}</span><span className="xv-verified xv-verified--inline"><ShieldCheck aria-hidden="true" size={16} />Đã xác minh</span></p>
          <dl className="xv-detail__facts">
            <div><dt>Giá</dt><dd>{isAgency && detail.pricing_breakdown ? <>{detail.pricing_breakdown.price_per_person.toLocaleString('vi-VN')} ₫/khách</> : <span className="xv-price--locked"><Lock aria-hidden="true" size={16} />Đăng nhập để xem giá</span>}</dd></div>
            <div><dt>Sức chứa</dt><dd>Tối đa {card.capacity.max_pax} khách</dd></div>
            <div><dt>Thời lượng</dt><dd>{durationLabel(card.duration_minutes)}</dd></div>
            <div><dt>Loại hoạt động</dt><dd>{categoryLabel(card.type)}</dd></div>
          </dl>
          {isAgency
            ? <ExperienceActions experienceId={card.id} quoteSent={(await hasQuoteRequest(session, card.id))} />
            : <div className="stack-actions"><Link className="button" href="/login">Đăng nhập</Link><Link className="button button--secondary" href="/register">Đăng ký Agency</Link></div>}
        </aside>
      </section>

      {detail.gallery.length>1&&<section className="media-gallery-grid" aria-label="Ảnh trải nghiệm">{detail.gallery.slice(1).map((url,index)=><MediaImage key={`${url}-${index}`} src={url} alt={`${card.name} — ảnh ${index+2}`}/>)}</section>}
      {isAgency&&detail.operational_booking_info&&<section className="content-panel"><h2>Điều kiện đặt và huỷ</h2><p>Báo trước tối thiểu {detail.operational_booking_info.booking_lead_time} giờ.</p>{cancellationLines(detail.operational_booking_info.cancellation_policy).map((line,index)=><p key={index}>{line}</p>)}{detail.pricing_breakdown?.group_discounts.map((rule,index)=><p key={index}>Từ {rule.pax_threshold} khách: giảm {rule.discount_percentage}%.</p>)}</section>}
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
            <Link className="button button--secondary" href={`/explore/providers/${detail.provider_id}`}>Xem hồ sơ xưởng →</Link>{isAgency && <Link className="button button--secondary" href={`/explore/providers/${detail.provider_id}/schedule`}>Lịch của xưởng →</Link>}</section>
          {detail.provider_private_contact && <section className="contact-panel"><p className="section-number">Liên hệ hợp tác</p><p>{detail.provider_private_contact.phone}</p><p>{detail.provider_private_contact.email}</p></section>}
        </aside>
      </div>

      <section className="related-section"><div className="section-heading"><div><p className="eyebrow">Tiếp tục khám phá</p><h2>Trải nghiệm liên quan</h2></div><Link href={back}>Xem tất cả →</Link></div>
        {detail.related_experiences.length ? <div className="related-grid">{detail.related_experiences.slice(0, 3).map((related, index) => <Link className="related-card" key={related.id} href={`/explore/experiences/${related.id}`}><div className={`related-card__art related-card__art--${index}`}><MediaImage src={related.images[0]?.storage_key} alt={related.name}/><span>{related.type}</span></div><div><small>{related.location.village_name}</small><strong>{related.name}</strong><span>{related.duration_minutes} phút · tối đa {related.capacity.max_pax} khách</span></div></Link>)}</div> : <p>Chưa có trải nghiệm liên quan.</p>}
      </section>
    </main>
    <footer className="explore-footer"><div><strong>Hanoi Artisan Bridge</strong><p>Nơi di sản trở thành hành trình đáng nhớ.</p></div><Link href={back}>Quay lại Explore</Link></footer>
  </div>;
}
