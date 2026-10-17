import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveViewer } from '../../../../lib/explore/catalog';
import { getProviderDetail } from '../../../../lib/explore/details';
import { loadExploreSeed } from '../../../../lib/explore/seed-repository';
import ExploreTracker from '../../ExploreTracker';

export default function ProviderPage({ params, searchParams }: {
  params: { id: string }; searchParams: { demo_agency_id?: string }
}) {
  const seed = loadExploreSeed();
  const viewer = resolveViewer(seed, searchParams.demo_agency_id, process.env.NODE_ENV !== 'production');
  const detail = getProviderDetail(seed, params.id, viewer);
  if (!detail) notFound();
  const agencyQuery = viewer.kind === 'agency' ? `?demo_agency_id=${encodeURIComponent(viewer.agencyId)}` : '';
  return <main className="detail-entry">
    <ExploreTracker demoAgencyId={viewer.kind === 'agency' ? viewer.agencyId : undefined} />
    <Link href={`/explore${agencyQuery}`}>← Quay lại Explore</Link>
    <p className="eyebrow">{detail.village_name} · {detail.craft_type}</p>
    <h1>{detail.provider_name}</h1>
    <p>{detail.public_bio}</p>
    <p>{detail.location_address}</p>
    <section><h2>Hình ảnh đơn vị</h2><p>{detail.public_images.length ? `${detail.public_images.length} ảnh đã được ghi nhận; tệp ảnh mẫu chưa được cung cấp.` : 'Chưa có ảnh để hiển thị.'}</p></section>
    {detail.private_contact && <section><h2>Thông tin liên hệ</h2><p>{detail.private_contact.phone} {detail.private_contact.email}</p></section>}
    <section><h2>Trải nghiệm</h2><ul>{detail.experiences.map(card => <li key={card.id}>
      <Link href={`/explore/experiences/${card.id}${agencyQuery}`}>{card.name}</Link> · {card.duration_minutes} phút · {card.price === null ? 'Giá chỉ hiển thị cho doanh nghiệp du lịch' : `${card.price.toLocaleString('vi-VN')} ₫ / khách`}
    </li>)}</ul></section>
  </main>;
}
