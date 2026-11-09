import Link from 'next/link';
import MediaImage from '@/app/components/MediaImage';
import { cookies } from 'next/headers';
import { CircleCheck, ImageIcon, Lock, ShieldCheck, SlidersHorizontal, Sparkles } from 'lucide-react';
import { buildExplorePage, eligibleRows, resolveViewer, villageStrip } from '../../lib/explore/catalog';
import { demoRuntime } from '../../lib/explore/demo-runtime';
import { loadExploreRuntime } from '../../lib/explore/seed-repository';
import ExploreTracker from './ExploreTracker';
import { currentServerSession } from '../../lib/auth/server-session';
import './explore-v9.css';
import { categoryLabel, craftLabel } from '../../lib/explore/display-labels';

type Params = { page?: string; category?: string };

// Design wave 4 (Figma "Explore v6", v9 §6c), content per EXP120 (Guest) / EXP017 (Agency): a static hero
// (no slider: screen-spec §9 "no new feature implied by decorative mockup copy"), one ranked list with the
// permitted filter and pagination (no search: spec-EXP Q8/Q11), Guest analytics consent kept (EXP120 #2, SR-004),
// AI Matching for Agency only (EXP120 SR-003), no booking button (BKG BR-002).
function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h && m ? `${h} giờ ${m} phút` : h ? `${h} giờ` : `${m} phút`;
}
const vnd = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;

export default async function ExplorePage({ searchParams }: { searchParams: Params }) {
  const seed = (await loadExploreRuntime());
  const requestedPage = Number(searchParams.page ?? 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const session = (await currentServerSession());
  const viewer = resolveViewer(seed, session.role === 'Tour_Agency' ? session.agencyId : null, true);
  const engine=await demoRuntime();
  const tracked = await engine.sessionFor(cookies().get('explore_session')?.value ?? '');
  const rankOrder = tracked && tracked.agency_id === (viewer.kind === 'agency' ? viewer.agencyId : null)
    ? (await engine.resultsFor(tracked.session_id)).map(row => row.experience_id) : undefined;
  const catalog = buildExplorePage(seed, { page, viewer, category: searchParams.category, rankOrder });
  const carry = searchParams.category ? `&category=${encodeURIComponent(searchParams.category)}` : '';
  const totalPages = Math.ceil(catalog.pagination.total_count / catalog.pagination.page_size);
  const categories = [...new Set(eligibleRows(seed).map(row => row.experience.category))].sort();
  const strip = villageStrip(seed, viewer);
  const heroImage = strip.find(item => item.card.images[0])?.card.images[0]?.storage_key;

  const isAgency = viewer.kind === 'agency';

  return <div className="explore-module xv">
    <section className="xv-hero" aria-label="Giới thiệu">
      <div className="xv-hero__media">
        {heroImage ? <MediaImage src={heroImage} alt="Xưởng thủ công làng nghề Hà Nội" large /> : <span className="xv-placeholder" aria-hidden="true"><ImageIcon size={40} /></span>}
      </div>
      <div className="xv-hero__panel">
        <div className="xv-hero__intro">
          <p className="xv-script">Yêu mến làng nghề</p>
          <h1 className="xv-hero__title">Hà Nội</h1>
          <p className="xv-hero__lead">Cầu nối đại lý du lịch với làng nghề thủ công đã xác minh quanh Hà Nội.</p>
        </div>
        <ul className="xv-strip" aria-label="Làng nghề có trải nghiệm đã xác minh">
          {strip.map(item => <li key={item.village_name}>
            <Link href={`/explore/experiences/${item.card.id}`} className="xv-strip__card" data-exp-action="click_card" data-exp-id={item.card.id} data-provider-id={item.card.provider_id}>
              {item.card.images[0] ? <MediaImage src={item.card.images[0].storage_key} alt={`${item.village_name} — ${item.card.name}`} /> : <span className="xv-placeholder" aria-hidden="true"><ImageIcon size={24} /></span>}
              <span className="xv-verified"><ShieldCheck aria-hidden="true" size={14} />Đã xác minh</span>
              <span className="xv-strip__label"><strong>{item.village_name}</strong><small>{craftLabel(item.craft)}{!isAgency && <> · <Lock aria-hidden="true" size={12} /> Giá ẩn</>}</small></span>
            </Link>
          </li>)}
        </ul>
        <a className="xv-cta" href="#tim-kiem"><span>Khám phá làng nghề</span></a>
      </div>
    </section>

    <ExploreTracker demoAgencyId={isAgency ? viewer.agencyId : undefined} />

    <main className="xv-main">
      <section id="tim-kiem" className="xv-filter" aria-label="Lọc trải nghiệm">
        <SlidersHorizontal aria-hidden="true" size={20} />
        <nav className="xv-chips" aria-label="Lọc theo loại hoạt động">
          <Link className={!searchParams.category ? 'is-selected' : ''} aria-current={!searchParams.category ? 'true' : undefined} href="/explore#tim-kiem">Tất cả</Link>
          {categories.map(category => <Link className={searchParams.category === category ? 'is-selected' : ''} aria-current={searchParams.category === category ? 'true' : undefined} key={category} data-exp-action="apply_filter" data-category={category}
            href={`/explore?category=${encodeURIComponent(category)}#tim-kiem`}>{categoryLabel(category)}</Link>)}
        </nav>
        {isAgency && <Link className="xv-button xv-button--primary" href="/ai-matching"><Sparkles aria-hidden="true" size={18} />Ghép tour AI</Link>}
      </section>

      <section className="xv-section" aria-labelledby="xv-list-title">
        <div className="xv-section__head">
          <h2 id="xv-list-title">Trải nghiệm làng nghề</h2>
          <p><span>{catalog.pagination.total_count} kết quả</span>{isAgency && <span className="xv-chip">Giá hiển thị: ₫ (VND)</span>}</p>
        </div>

        {catalog.experience_cards.length === 0
          ? <div className="xv-empty"><p>Không có trải nghiệm khớp bộ lọc này.</p>{searchParams.category && <Link className="xv-button xv-button--outline" href="/explore#tim-kiem">Xóa bộ lọc</Link>}</div>
          : <ul className="xv-grid" aria-label="Danh sách trải nghiệm">
            {catalog.experience_cards.map(card => <li key={card.id}><article className="xv-card">
              <div className="xv-card__media">
                {card.images[0] ? <MediaImage src={card.images[0].storage_key} alt={card.name} /> : <span className="xv-placeholder" aria-hidden="true"><ImageIcon size={28} /></span>}
              </div>
              <div className="xv-card__body">
                <p className="xv-card__meta"><span className="xv-tag">{card.location.village_name}</span><span>{durationLabel(card.duration_minutes)} · Tối đa {card.capacity.max_pax} khách</span></p>
                <h3>{card.name}</h3>
                <p className="xv-card__provider"><span className="xv-verified xv-verified--inline"><ShieldCheck aria-hidden="true" size={14} />Đã xác minh</span><Link href={`/explore/providers/${card.provider_id}`}>{card.provider_name}</Link></p>
                <p className="xv-card__desc">{card.description}</p>
                <p className="xv-card__type"><CircleCheck aria-hidden="true" size={16} />{categoryLabel(card.type)}</p>
                {card.price === null
                  ? <p className="xv-price xv-price--locked"><Lock aria-hidden="true" size={16} />Đăng nhập để xem giá</p>
                  : <p className="xv-price">{vnd(card.price)}<small>/khách</small></p>}
                <Link className="xv-button xv-button--outline" data-exp-action="click_card" data-exp-id={card.id} data-provider-id={card.provider_id} href={`/explore/experiences/${card.id}`}>Xem chi tiết</Link>
              </div>
            </article></li>)}
          </ul>}

        {totalPages > 1 && <nav className="xv-pagination" aria-label="Phân trang">
          {page > 1 ? <Link href={`/explore?page=${page - 1}${carry}#tim-kiem`}>Trang trước</Link> : <span aria-hidden="true" />}
          <span>Trang {page} / {totalPages}</span>
          {page < totalPages ? <Link href={`/explore?page=${page + 1}${carry}#tim-kiem`}>Trang sau</Link> : <span aria-hidden="true" />}
        </nav>}
      </section>
    </main>
    <footer className="xv-footer"><span>© {new Date().getFullYear()} Hanoi Artisan Bridge</span>{!isAgency && <Link href="/login">Đăng nhập Agency</Link>}</footer>
  </div>;
}
