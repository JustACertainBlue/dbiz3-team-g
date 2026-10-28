import Link from 'next/link';
import { cookies } from 'next/headers';
import { buildExplorePage, eligibleRows, resolveViewer } from '../../lib/explore/catalog';
import { demoRuntime } from '../../lib/explore/demo-runtime';
import { loadExploreRuntime } from '../../lib/explore/seed-repository';
import ExploreTracker from './ExploreTracker';
import ExploreHeader from './ExploreHeader';
import { DEMO_SESSION_COOKIE, demoSessionFor } from '../../lib/auth/demo-session';

type Params = { page?: string; category?: string };

export default function ExplorePage({ searchParams }: { searchParams: Params }) {
  const seed = loadExploreRuntime();
  const requestedPage = Number(searchParams.page ?? 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const session = demoSessionFor(cookies().get(DEMO_SESSION_COOKIE)?.value);
  const viewer = resolveViewer(seed, session.role === 'TourAgency' ? session.agencyId : null, true);
  const tracked = process.env.NODE_ENV !== 'production' ? demoRuntime().sessionFor(cookies().get('explore_session')?.value ?? '') : undefined;
  const rankOrder = tracked && tracked.agency_id === (viewer.kind === 'agency' ? viewer.agencyId : null)
    ? demoRuntime().resultsFor(tracked.session_id).map(row => row.experience_id) : undefined;
  const catalog = buildExplorePage(seed, { page, viewer, category: searchParams.category, rankOrder });
  const carry = searchParams.category ? `&category=${encodeURIComponent(searchParams.category)}` : '';
  const totalPages = Math.ceil(catalog.pagination.total_count / catalog.pagination.page_size);
  const categories = [...new Set(eligibleRows(seed).map(row => row.experience.category))].sort();

  const isAgency = viewer.kind === 'agency';

  return <div className="explore-module">
    <ExploreTracker demoAgencyId={isAgency ? viewer.agencyId : undefined} />
    <ExploreHeader viewer={viewer.kind} agencyId={isAgency ? viewer.agencyId : undefined} />

    <main className="explore-surface">
      <section className="explore-hero">
        <div className="explore-hero__copy">
          <p className="eyebrow">Di sản sống · Trải nghiệm được xác minh</p>
          <h1>Khám phá tinh hoa<br /><em>làng nghề Hà Nội</em></h1>
          <p className="hero-lead">Kết nối hành trình của bạn với nghệ nhân, xưởng thủ công và những câu chuyện văn hóa được gìn giữ qua nhiều thế hệ.</p>
          <div className="hero-stats" aria-label="Tổng quan danh mục">
            <span><strong>{catalog.pagination.total_count}</strong> trải nghiệm</span>
            <span><strong>{new Set(catalog.experience_cards.map(card => card.location.village_name)).size}</strong> làng nghề</span>
            <span><strong>100%</strong> đã xác minh</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-art__sun" />
          <div className="hero-art__arch"><span>Hanoi</span><strong>Craft</strong></div>
          <div className="hero-art__caption">Curated heritage experiences</div>
        </div>
      </section>

      <section className="discovery-bar" aria-label="Tìm và lọc trải nghiệm">
        <div className="search-prompt"><span aria-hidden="true">⌕</span><div><strong>Tìm theo nghề, làng hoặc trải nghiệm</strong><small>Chọn một nhóm bên dưới để bắt đầu khám phá</small></div></div>
        {isAgency && <Link className="matching-cta" href="/ai-matching"><span>✦</span> AI Tour Matching</Link>}
      </section>

      <div className="viewer-strip">
        <div><span className={`mode-badge ${isAgency ? 'mode-badge--agency' : ''}`}>{isAgency ? 'Agency access' : 'Public access'}</span>
          <strong>{isAgency ? 'Giá B2B và thông tin hợp tác đang được hiển thị' : 'Bạn đang xem danh mục công khai'}</strong></div>
        <Link className="mode-switch" href="/login">{isAgency ? 'Đổi tài khoản demo' : 'Đăng nhập Agency'} →</Link>
      </div>

      <section className="catalog-section">
        <div className="section-heading"><div><p className="eyebrow">Bộ sưu tập được tuyển chọn</p><h2>Trải nghiệm nổi bật</h2></div><p>{catalog.pagination.total_count} kết quả phù hợp</p></div>
        <nav className="category-filters" aria-label="Lọc theo loại hoạt động">
          <Link className={!searchParams.category ? 'is-selected' : ''} href="/explore">Tất cả</Link>
          {categories.map(category => <Link className={searchParams.category === category ? 'is-selected' : ''} key={category} data-exp-action="apply_filter" data-category={category}
            href={`/explore?category=${encodeURIComponent(category)}${carry.replace(/&category=[^&]*/, '')}`}>{category}</Link>)}
        </nav>

    {catalog.experience_cards.length === 0 ? <section className="empty"><h2>Chưa có trải nghiệm để hiển thị</h2><p>Hãy quay lại sau khi danh mục được cập nhật.</p></section> :
      <section className="card-grid" aria-label="Danh sách trải nghiệm">
        {catalog.experience_cards.map((card, index) => <article className="experience-card" key={card.id}>
          <div className={`media-placeholder media-placeholder--${index % 4}`} role="img" aria-label={`Minh họa cho ${card.name}`}>
            <span className="verified-tag">✓ Verified experience</span>
            <div className="craft-symbol">{String(index + 1).padStart(2, '0')}</div>
            <small>{card.type}</small>
          </div>
          <div className="card-body">
            <p className="card-kicker"><span>{card.location.village_name}</span><span>{card.duration_minutes} phút</span></p>
            <h2>{card.name}</h2>
            <p className="provider-line">bởi <Link href={`/explore/providers/${card.provider_id}`}>{card.provider_name}</Link></p>
            <p className="card-description">{card.description}</p>
            <div className="card-meta"><span>Nhóm 1–{card.capacity.max_pax}</span><span>{card.type}</span></div>
            <div className="price-row"><div><small>{card.price === null ? 'Quyền truy cập' : 'Giá B2B từ'}</small><p className="price">{card.price === null ? 'Dành cho Agency' : `${card.price.toLocaleString('vi-VN')} ₫`} {card.price !== null && <span>/ khách</span>}</p></div></div>
            <div className="card-actions">
              <Link className="button" data-exp-action="click_card" data-exp-id={card.id} data-provider-id={card.provider_id}
                href={`/explore/experiences/${card.id}`}>Xem chi tiết <span>→</span></Link>
              {!isAgency && <Link className="text-action" href="/login">Đăng nhập để liên hệ</Link>}
            </div>
          </div>
        </article>)}
      </section>}
      </section>
    {totalPages > 1 && <nav className="pagination" aria-label="Phân trang">
      {page > 1 && <Link href={`/explore?page=${page - 1}${carry}`}>Trang trước</Link>}
      <span>Trang {page} / {totalPages}</span>
      {page < totalPages && <Link href={`/explore?page=${page + 1}${carry}`}>Trang sau</Link>}
    </nav>}
    </main>
    <footer className="explore-footer"><div><strong>Hanoi Artisan Bridge</strong><p>Nơi di sản trở thành hành trình đáng nhớ.</p></div><span>Curated B2B heritage platform · Hà Nội</span></footer>
  </div>;
}
