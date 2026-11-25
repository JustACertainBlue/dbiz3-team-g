import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { eligibleRows, resolveViewer } from '../../lib/explore/catalog';
import { demoRuntime } from '../../lib/explore/demo-runtime';
import { loadExploreRuntime } from '../../lib/explore/seed-repository';
import { applyQuickFilter, cardView, holdBanner, listableRows, preferenceKeys, QUICK_FILTERS, villageTiles } from '../../lib/explore/v3-home';
import ExploreTracker from './ExploreTracker';
import { currentServerSession } from '../../lib/auth/server-session';
import AppFooter from '../components/footer/AppFooter';
import { footerVisible } from '../components/nav/nav-model';
import SearchBar from './v3/SearchBar';
import AiBox from './v3/AiBox';
import ExperienceCard from './v3/ExperienceCard';
import VillageGrid from './v3/VillageGrid';
import CoverImage from './v3/CoverImage';
import { BANNER_SIZES } from './v3/image-sizes';
import './v3/explore-v3.css';

// Rendered per request (cookies, searchParams, live catalog). Without this, `next build` tries to
// prerender the page and opens a database connection before noticing it is dynamic.
export const dynamic = 'force-dynamic';

type Params = { loc?: string };

// UI v3 Đợt 1: EXP120 Guest = mockup 01, EXP017 Tour Agency = mockup 21 (human decisions 2026-11-18; deviations
// from docs/spec are listed in docs/build/ui-v3-spec-deviations.md). Four cards (Agency: personal ranking order),
// quick filters by duration and capacity, villages with an image, the hold banner for an Agency On hold booking.
export default async function ExplorePage({ searchParams }: { searchParams: Params }) {
  const seed = (await loadExploreRuntime());
  const session = (await currentServerSession());
  const viewer = resolveViewer(seed, session.role === 'Tour_Agency' ? session.agencyId : null, true);
  const isAgency = viewer.kind === 'agency';
  const agencyId = viewer.kind === 'agency' ? viewer.agencyId : null;
  const engine = await demoRuntime();
  const tracked = await engine.sessionFor(cookies().get('explore_session')?.value ?? '');
  const rankOrder = tracked && tracked.agency_id === agencyId ? (await engine.resultsFor(tracked.session_id)).map(row => row.experience_id) : undefined;

  const quick = QUICK_FILTERS.some(item => item.key === searchParams.loc) ? searchParams.loc : undefined;
  let rows = applyQuickFilter(listableRows(seed), quick);
  if (rankOrder) {
    const positions = new Map(rankOrder.map((id, index) => [id, index]));
    rows = [...rows].sort((a, b) => (positions.get(a.experience.experience_id) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.experience.experience_id) ?? Number.MAX_SAFE_INTEGER));
  }
  const keys = preferenceKeys(seed, agencyId);
  const cards = rows.slice(0, 4).map(row => cardView(seed, row, keys));
  const tiles = villageTiles(seed);
  const agency = agencyId ? seed.agency_profiles.find(row => row.agency_id === agencyId) : undefined;
  const person = session.userId ? seed.user_accounts.find(row => row.user_id === session.userId)?.full_name : '';
  const banner = agencyId ? holdBanner(seed, agencyId, new Date()) : null;
  const listId = 'goi-y';

  const filters = <nav className="v3-tabs" aria-label="Lọc nhanh">
    {QUICK_FILTERS.map(item => <Link key={item.label} href={item.key ? `/explore?loc=${item.key}#${listId}` : `/explore#${listId}`}
      className={`v3-tab${quick === item.key ? ' v3-tab--on' : ''}`} aria-current={quick === item.key ? 'true' : undefined}>{item.label}</Link>)}
  </nav>;
  const allExperiences = <Link href="/explore/search" className="v3-more">Xem tất cả trải nghiệm ›</Link>;
  const allVillages = <Link href="/villages" className="v3-more">Xem tất cả làng nghề ›</Link>;

  return <div className="v3x">
    <section className="v3x-hero" aria-label="Giới thiệu">
      <img
        className="v3x-hero__img"
        src="/explore-hero.webp"
        alt="Không gian làng nghề đan lát truyền thống Hà Nội"
        width={1024}
        height={682}
        loading="eager"
        decoding="async"
      />
      <div className="v3x-hero__shade" aria-hidden="true" />
      <div className="v3x-hero__in">
        {isAgency && person && <p className="v3x-hero__eb">Chào {person},</p>}
        {isAgency
          ? <h1 className="v3x-hero__h">Đoàn tiếp theo của bạn<br />muốn làm nghề gì?</h1>
          : <h1 className="v3x-hero__h">Tự tay làm nghề<br />cùng nghệ nhân làng</h1>}
        <p className="v3x-hero__sub">{isAgency ? 'Tìm theo nghề, ngày đi và số khách. Giá từng trải nghiệm hiện ngay trên kết quả.' : 'Gốm, lụa, nón lá, mây tre… cho đoàn khách của bạn, đặt thẳng với xưởng.'}</p>
        <Link className="v3x-hero__btn" href="/villages">Khám phá làng nghề</Link>
      </div>
    </section>
    <div className="hab-band v3x-search"><SearchBar /></div>

    <ExploreTracker demoAgencyId={agencyId ?? undefined} />

    {banner && <section className="hab-band v3x-sec v3x-sec--remind" aria-label="Đặt chỗ đang giữ">
      <div className="v3-remind" role="status">
        {banner.image && <CoverImage image={banner.image} hideEmpty alt="" sizes={BANNER_SIZES} priority="eager" className="v3-remind__img" />}
        <p className="v3-remind__text"><b>{banner.title}</b><br />{banner.note}</p>
        <Link className="hab-btn hab-btn--primary" href={banner.href}>Thanh toán ngay</Link>
      </div>
    </section>}

    <section className="hab-band v3x-sec v3x-sec--ai" aria-labelledby="v3x-ai">
      <div className="v3-head"><div><h2 id="v3x-ai" className="v3-h2">Chưa biết chọn trải nghiệm nào cho đoàn?</h2><p className="v3-sub">Kể cho AI nghe đoàn của bạn cần gì, AI sẽ gợi ý trải nghiệm làng nghề phù hợp.</p></div></div>
      <AiBox agency={isAgency} title="Kể yêu cầu của đoàn bằng lời thường, AI tìm trải nghiệm làng nghề phù hợp cho bạn."
        placeholder="VD: đoàn 20 học sinh, đi buổi sáng, muốn tự làm sản phẩm mang về…"
        chips={isAgency ? ['Đoàn khách Hàn Quốc 15 người', 'Team building 30 người', 'Khách quốc tế, có sản phẩm mang về'] : ['Trải nghiệm cho 20 học sinh', 'Khách quốc tế, có sản phẩm mang về']} />
    </section>

    <section id={listId} className="hab-band v3x-sec" aria-labelledby="v3x-list">
      <div className="v3-head">
        <div><h2 id="v3x-list" className="v3-h2">{isAgency ? `Gợi ý cho ${agency?.company_name ?? 'công ty của bạn'}` : 'Tìm hoạt động cho đoàn khách của bạn?'}</h2>
          {isAgency && <p className="v3-sub">Dựa trên loại tour công ty thường tổ chức và những gì bạn vừa xem.</p>}</div>
        {isAgency && allExperiences}
      </div>
      {filters}
      {cards.length
        ? <div className="v3-xgrid">{cards.map(card => <ExperienceCard key={card.id} card={card} showDetailLink={isAgency} track={isAgency} />)}</div>
        : <p className="v3-empty">Không có trải nghiệm khớp bộ lọc này.</p>}
      {!isAgency && <div className="v3-more-row">{allExperiences}</div>}
    </section>

    {tiles.length > 0 && <section id="lang-nghe" className="hab-band v3x-sec" aria-labelledby="v3x-villages">
      <div className="v3-head"><div><h2 id="v3x-villages" className="v3-h2">{isAgency ? 'Làng nghề đang nhận đoàn' : 'Làng nghề quanh Hà Nội'}</h2></div>{isAgency && allVillages}</div>
      <VillageGrid tiles={tiles} />
      {!isAgency && <div className="v3-more-row">{allVillages}</div>}
    </section>}

    {!isAgency && <section className="hab-band v3x-sec" aria-labelledby="v3x-promo">
      <div className="v3-promo">
        <h2 id="v3x-promo" className="v3-promo__title">Lên tour làng nghề nhanh hơn</h2>
        <p className="v3-promo__text">Có tài khoản công ty lữ hành, bạn xem được giá từng trải nghiệm, nhắn tin thẳng với xưởng và nhờ AI gợi ý trải nghiệm theo yêu cầu của đoàn.</p>
        <div className="v3-promo__row"><Link className="hab-btn hab-btn--primary" href="/register">Đăng ký tài khoản công ty lữ hành</Link>
          <p className="v3-promo__login">Đã có tài khoản? <Link href="/login" className="v3-link">Đăng nhập ngay</Link></p></div>
      </div>
    </section>}

    {footerVisible(session, '/explore') && <AppFooter />}
  </div>;
}
