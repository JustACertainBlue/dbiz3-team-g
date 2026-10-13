import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findExperienceCard, resolveViewer } from '../../../../lib/explore/catalog';
import { loadExploreSeed } from '../../../../lib/explore/seed-repository';

export default function ExperienceEntry({ params, searchParams }: {
  params: { id: string }; searchParams: { demo_agency_id?: string }
}) {
  const seed = loadExploreSeed();
  const viewer = resolveViewer(seed, searchParams.demo_agency_id, process.env.NODE_ENV !== 'production');
  const card = findExperienceCard(seed, params.id, viewer);
  if (!card) notFound();
  const back = viewer.kind === 'agency' ? `/explore?demo_agency_id=${encodeURIComponent(viewer.agencyId)}` : '/explore';
  return <main className="detail-entry">
    <Link href={back}>← Quay lại Explore</Link>
    <p className="eyebrow">{card.location.village_name} · {card.type}</p>
    <h1>{card.name}</h1>
    <p>{card.description}</p>
    <dl><dt>Đơn vị cung cấp</dt><dd>{card.provider_name}</dd>
      <dt>Thời lượng</dt><dd>{card.duration_minutes} phút</dd>
      <dt>Sức chứa</dt><dd>1–{card.capacity.max_pax} khách</dd>
      <dt>Giá</dt><dd>{card.price === null ? 'Chỉ hiển thị cho doanh nghiệp du lịch' : `${card.price.toLocaleString('vi-VN')} ₫ / khách`}</dd></dl>
    <p className="muted">Thông tin lịch hoạt động và các điều kiện chi tiết đang được cập nhật.</p>
    {viewer.kind === 'guest' && <p><Link href="/login">Đăng nhập để yêu cầu báo giá hoặc Chat</Link></p>}
  </main>;
}
