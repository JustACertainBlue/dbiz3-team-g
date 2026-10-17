import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveViewer } from '../../../../lib/explore/catalog';
import { getExperienceDetail } from '../../../../lib/explore/details';
import { loadExploreSeed } from '../../../../lib/explore/seed-repository';
import ExploreTracker from '../../ExploreTracker';

export default function ExperienceEntry({ params, searchParams }: {
  params: { id: string }; searchParams: { demo_agency_id?: string }
}) {
  const seed = loadExploreSeed();
  const viewer = resolveViewer(seed, searchParams.demo_agency_id, process.env.NODE_ENV !== 'production');
  const detail = getExperienceDetail(seed, params.id, viewer);
  if (!detail) notFound();
  const { card } = detail;
  const back = viewer.kind === 'agency' ? `/explore?demo_agency_id=${encodeURIComponent(viewer.agencyId)}` : '/explore';
  const agencyQuery = viewer.kind === 'agency' ? `?demo_agency_id=${encodeURIComponent(viewer.agencyId)}` : '';
  return <div className="explore-surface detail-entry">
    <ExploreTracker demoAgencyId={viewer.kind === 'agency' ? viewer.agencyId : undefined} detailExperienceId={card.id} />
    <Link href={back}>← Quay lại Explore</Link>
    <p className="eyebrow">{card.location.village_name} · {card.type}</p>
    <h1>{card.name}</h1>
    <p>{card.description}</p>
    <p><Link href={`/explore/providers/${detail.provider_id}${agencyQuery}`}>Xem thông tin {card.provider_name}</Link></p>
    <section><h2>Hình ảnh</h2>{detail.gallery.length ? <p>{detail.gallery.length} ảnh đã được ghi nhận; tệp ảnh mẫu chưa được cung cấp.</p> : <p>Chưa có ảnh để hiển thị.</p>}</section>
    <dl><dt>Đơn vị cung cấp</dt><dd>{card.provider_name}</dd>
      <dt>Thời lượng</dt><dd>{card.duration_minutes} phút</dd>
      <dt>Sức chứa</dt><dd>1–{card.capacity.max_pax} khách</dd>
      <dt>Giá</dt><dd>{card.price === null ? 'Chỉ hiển thị cho doanh nghiệp du lịch' : `${card.price.toLocaleString('vi-VN')} ₫ / khách`}</dd></dl>
    <section><h2>Giới thiệu đơn vị cung cấp</h2><p>{detail.provider_public_bio || 'Chưa có giới thiệu.'}</p></section>
    <section><h2>Lịch công khai</h2>
      <p>{detail.availability_summary.operating_hours.length} khung giờ hoạt động hằng tuần; {detail.availability_summary.available_slots.length} khoảng còn trống; {detail.availability_summary.blocked_slots.length} lịch đang giữ chỗ hoặc đã đặt.</p>
      <h3>Khoảng còn trống trong 30 ngày tới</h3>
      <ul>{detail.availability_summary.available_slots.map((slot, index) => <li key={index}>{slot.start_at} – {slot.end_at}</li>)}</ul>
      <h3>Khoảng đã có lịch</h3>
      <ul>{detail.availability_summary.blocked_slots.map((slot, index) => <li key={index}>{slot.start_at} – {slot.end_at}: {slot.status}</li>)}</ul>
    </section>
    {detail.pricing_breakdown && <section><h2>Giá và ưu đãi nhóm</h2><p>{detail.pricing_breakdown.price_per_person.toLocaleString('vi-VN')} ₫ / khách</p>
      <ul>{detail.pricing_breakdown.group_discounts.map(rule => <li key={rule.pax_threshold}>Từ {rule.pax_threshold} khách: giảm {rule.discount_percentage}%</li>)}</ul></section>}
    {detail.operational_booking_info && <section><h2>Điều kiện đặt trải nghiệm</h2><p>Đặt trước ít nhất {detail.operational_booking_info.booking_lead_time} giờ.</p>
      <p>Chính sách hủy: {JSON.stringify(detail.operational_booking_info.cancellation_policy)}</p></section>}
    {detail.provider_private_contact && <section><h2>Liên hệ đơn vị cung cấp</h2><p>{detail.provider_private_contact.phone} {detail.provider_private_contact.email}</p></section>}
    <section><h2>Trải nghiệm liên quan</h2>{detail.related_experiences.length ? <ul>{detail.related_experiences.map(related => <li key={related.id}><Link href={`/explore/experiences/${related.id}${agencyQuery}`}>{related.name}</Link> — {related.provider_name}</li>)}</ul> : <p>Chưa có trải nghiệm liên quan.</p>}</section>
    <section><h2>Khám phá nghề khác</h2>{detail.other_craft_suggestions.length ? <ul>{detail.other_craft_suggestions.map(suggestion => <li key={suggestion.id}><Link href={`/explore/experiences/${suggestion.id}${agencyQuery}`}>{suggestion.name}</Link> — {suggestion.type}</li>)}</ul> : <p>Chưa có gợi ý khác.</p>}</section>
    {viewer.kind === 'guest' && <p><Link href="/login">Đăng nhập để yêu cầu báo giá hoặc Chat</Link></p>}
    {viewer.kind === 'agency' && <p className="muted">Yêu cầu báo giá và Chat sẽ khả dụng sau khi tích hợp xác thực và hội thoại.</p>}
  </div>;
}
