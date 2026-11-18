import React, { Suspense } from 'react';
import Link from 'next/link';
import { Info, Sparkles } from 'lucide-react';
import { resolveViewer } from '../../../lib/explore/catalog';
import { loadExploreRuntime } from '../../../lib/explore/seed-repository';
import { currentServerSession } from '../../../lib/auth/server-session';
import { parseSearch, PAGE_SIZE, searchExperiences, searchSubtitle, SORT_OPTIONS } from '../../../lib/explore/v3-search';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../v3/SearchBar';
import ResultCard from '../v3/ResultCard';
import FilterPanel, { SortSelect } from './FilterPanel';
import '../v3/explore-v3.css';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

// UI v3 Đợt 1, mockup 02 (human decision 2026-11-18 #1; deviation from spec-EXP Q8/Q11, docs/build/ui-v3-spec-deviations.md #2).
export default async function SearchPage({ searchParams }: { searchParams: Params }) {
  const seed = await loadExploreRuntime();
  const session = await currentServerSession();
  const viewer = resolveViewer(seed, session.role === 'Tour_Agency' ? session.agencyId : null, true);
  const isAgency = viewer.kind === 'agency';
  const query = parseSearch(searchParams);
  const result = searchExperiences(seed, query, viewer);
  const subtitle = searchSubtitle(query);
  const dateLabel = query.date ? `${query.date.slice(8, 10)}/${query.date.slice(5, 7)}` : '';
  const pageHref = (page: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) for (const item of Array.isArray(value) ? value : value ? [value] : []) if (key !== 'page') next.append(key, item);
    next.set('page', String(page));
    return `/explore/search?${next.toString()}`;
  };
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const from = result.total ? (result.page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(result.page * PAGE_SIZE, result.total);
  const aiAction = isAgency ? '/ai-matching' : '/login';

  return <div className="v3p">
    <section className="hab-band v3s-top">
      <SearchBar q={query.q} date={query.date} guests={query.guests ? String(query.guests) : ''} label="Sửa tìm kiếm" />
      <nav aria-label="Đường dẫn" className="v3-crumbs"><Link href="/explore">Trang chủ</Link><span aria-hidden="true">›</span><Link href="/explore">Khám phá</Link><span aria-hidden="true">›</span><span aria-current="page">Tất cả trải nghiệm</span></nav>
    </section>
    <section className="hab-band v3s-body">
      <aside aria-label="Bộ lọc" className="v3s-aside">
        <form className="v3-card v3-need" action={aiAction} method="get">
          <label htmlFor="v3-need" className="v3-need__label"><Sparkles aria-hidden="true" />Mô tả điều đoàn cần</label>
          <textarea id="v3-need" name={isAgency ? 'prompt' : undefined} rows={3} placeholder="VD: đoàn 10 học sinh lớp 6, muốn tự làm sản phẩm mang về, đi trong buổi sáng" />
          <button type="submit" className="hab-btn hab-btn--secondary hab-btn--sm">Nhờ AI gợi ý</button>
        </form>
        <Suspense fallback={null}>
          <FilterPanel crafts={result.facets.crafts} durations={result.facets.durations} villages={result.facets.villages}
            fit={result.facets.fit} cap15={result.facets.cap15} free={result.facets.free} guests={query.guests} dateLabel={dateLabel} />
        </Suspense>
        <div className="v3-card v3-tryai">
          <p className="v3-h3 v3-tryai__title">Chưa thấy trải nghiệm phù hợp?</p>
          <Link className="hab-btn hab-btn--primary v3-tryai__btn" href={aiAction}>Thử Ghép tour AI</Link>
          <p className="v3-tryai__text">Kể cho AI nghe đoàn bạn cần gì (số khách, độ tuổi, thời gian), AI sẽ gợi ý trải nghiệm hợp với đoàn.</p>
        </div>
      </aside>
      <div className="v3s-results">
        <div className="v3s-head">
          <div><h1 className="v3-h1 v3s-h1">Trải nghiệm thủ công quanh Hà Nội: {result.total} kết quả</h1>{subtitle && <p className="v3s-subtitle">{subtitle}</p>}</div>
          <Suspense fallback={null}><SortSelect value={query.sort} options={SORT_OPTIONS} /></Suspense>
        </div>
        <p className="v3-cap v3s-note"><Info aria-hidden="true" />Thứ tự dựa trên mức khớp với từ khóa, ngày và số khách bạn chọn. Không có vị trí trả tiền.</p>
        {result.items.length === 0 && <p className="v3-empty">Không có trải nghiệm khớp tìm kiếm này.</p>}
        {result.items.map(item => <ResultCard key={item.id} item={item} query={searchParams} />)}
        {result.total > 0 && <Pagination from={from} to={to} total={result.total} unit="trải nghiệm"
          prev={result.page > 1 ? { href: pageHref(result.page - 1) } : undefined} next={result.page < totalPages ? { href: pageHref(result.page + 1) } : undefined} />}
      </div>
    </section>
  </div>;
}
