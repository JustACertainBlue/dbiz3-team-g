import Link from 'next/link';
import { cookies } from 'next/headers';
import { buildExplorePage, eligibleRows, resolveViewer } from '../../lib/explore/catalog';
import { demoRuntime } from '../../lib/explore/demo-runtime';
import { loadExploreSeed } from '../../lib/explore/seed-repository';
import ExploreTracker from './ExploreTracker';

type Params = { page?: string; demo_agency_id?: string; category?: string };

export default function ExplorePage({ searchParams }: { searchParams: Params }) {
  const seed = loadExploreSeed();
  const requestedPage = Number(searchParams.page ?? 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const viewer = resolveViewer(seed, searchParams.demo_agency_id, process.env.NODE_ENV !== 'production');
  const tracked = process.env.NODE_ENV !== 'production' ? demoRuntime().sessionFor(cookies().get('explore_session')?.value ?? '') : undefined;
  const rankOrder = tracked && tracked.agency_id === (viewer.kind === 'agency' ? viewer.agencyId : null)
    ? demoRuntime().resultsFor(tracked.session_id).map(row => row.experience_id) : undefined;
  const catalog = buildExplorePage(seed, { page, viewer, category: searchParams.category, rankOrder });
  const demoAgency = process.env.NODE_ENV !== 'production'
    ? seed.agency_profiles.find(row => resolveViewer(seed, row.agency_id, true).kind === 'agency')
    : undefined;
  const carry = `${viewer.kind === 'agency' ? `&demo_agency_id=${encodeURIComponent(viewer.agencyId)}` : ''}${searchParams.category ? `&category=${encodeURIComponent(searchParams.category)}` : ''}`;
  const totalPages = Math.ceil(catalog.pagination.total_count / catalog.pagination.page_size);
  const categories = [...new Set(eligibleRows(seed).map(row => row.experience.category))].sort();

  return <main>
    <ExploreTracker demoAgencyId={viewer.kind === 'agency' ? viewer.agencyId : undefined} />
    <header className="masthead">
      <div><p className="eyebrow">Hanoi Artisan Bridge</p><h1>Khám phá trải nghiệm làng nghề</h1>
        <p className="muted">Những hoạt động từ các hộ kinh doanh đã được xác minh.</p></div>
      <div className="viewer-panel">
        <strong>{viewer.kind === 'agency' ? 'Chế độ doanh nghiệp du lịch' : 'Chế độ khách'}</strong>
        {demoAgency && <p><Link href={viewer.kind === 'agency' ? '/explore' : `/explore?demo_agency_id=${encodeURIComponent(demoAgency.agency_id)}`}>
          {viewer.kind === 'agency' ? 'Xem như khách' : 'Dùng doanh nghiệp mẫu'}
        </Link></p>}
        {demoAgency && <small>Dữ liệu giả phục vụ bản chạy thử; chưa phải đăng nhập.</small>}
      </div>
    </header>
    <nav className="category-filters" aria-label="Lọc theo loại hoạt động">
      <Link href={`/explore${viewer.kind === 'agency' ? `?demo_agency_id=${encodeURIComponent(viewer.agencyId)}` : ''}`}>Tất cả</Link>
      {categories.map(category => <Link key={category} data-exp-action="apply_filter" data-category={category}
        href={`/explore?category=${encodeURIComponent(category)}${carry.replace(/&category=[^&]*/, '')}`}>{category}</Link>)}
    </nav>
    <p className="count">{catalog.pagination.total_count} trải nghiệm phù hợp</p>
    {catalog.experience_cards.length === 0 ? <section className="empty"><h2>Chưa có trải nghiệm để hiển thị</h2><p>Hãy quay lại sau khi danh mục được cập nhật.</p></section> :
      <section className="card-grid" aria-label="Danh sách trải nghiệm">
        {catalog.experience_cards.map(card => <article className="experience-card" key={card.id}>
          <div className="media-placeholder" role="img" aria-label={`Ảnh minh họa chưa có cho ${card.name}`}>
            <span>{card.type}</span><small>Chưa có ảnh hiển thị</small>
          </div>
          <div className="card-body">
            <p className="eyebrow">{card.location.village_name}</p>
            <h2>{card.name}</h2>
            <p className="muted"><Link href={`/explore/providers/${card.provider_id}${viewer.kind === 'agency' ? `?demo_agency_id=${encodeURIComponent(viewer.agencyId)}` : ''}`}>{card.provider_name}</Link> · {card.duration_minutes} phút · 1–{card.capacity.max_pax} khách</p>
            <p>{card.description}</p>
            <p className="price">{card.price === null ? 'Đăng nhập để xem giá' : `${card.price.toLocaleString('vi-VN')} ₫ / khách`}</p>
            <details data-exp-action="expand_preview" data-exp-id={card.id} data-provider-id={card.provider_id}><summary>Xem nhanh</summary><p>{card.description}</p><p>Sức chứa: 1–{card.capacity.max_pax} khách</p></details>
            <div className="card-actions">
              <Link className="button" data-exp-action="click_card" data-exp-id={card.id} data-provider-id={card.provider_id}
                href={`/explore/experiences/${card.id}${viewer.kind === 'agency' ? `?demo_agency_id=${encodeURIComponent(viewer.agencyId)}` : ''}`}>Xem chi tiết</Link>
              {viewer.kind === 'guest' && <><Link href="/login">Yêu cầu báo giá</Link><Link href="/login">Chat</Link></>}
              {viewer.kind === 'agency' && <span className="muted">Báo giá và Chat hiện chưa khả dụng</span>}
            </div>
          </div>
        </article>)}
      </section>}
    {totalPages > 1 && <nav className="pagination" aria-label="Phân trang">
      {page > 1 && <Link href={`/explore?page=${page - 1}${carry}`}>Trang trước</Link>}
      <span>Trang {page} / {totalPages}</span>
      {page < totalPages && <Link href={`/explore?page=${page + 1}${carry}`}>Trang sau</Link>}
    </nav>}
  </main>;
}
