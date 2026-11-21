import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Bus, Check, CircleCheck, Clock, Info, Languages, Mail, MapPin, MessageSquareText, Phone, QrCode, Users, type LucideIcon } from 'lucide-react';
import { resolveViewer } from '../../../../lib/explore/catalog';
import { loadExploreRuntime } from '../../../../lib/explore/seed-repository';
import { defaultCalendarDay, monthCalendar, providerView } from '../../../../lib/explore/v3-provider';
import { parseSearch } from '../../../../lib/explore/v3-search';
import { currentServerSession } from '../../../../lib/auth/server-session';
import { paymentsEnabled } from '../../../../lib/flags';
import ExploreTracker from '../../ExploreTracker';
import CoverImage from '../../v3/CoverImage';
import Gallery from '../../v3/Gallery';
import { CARD_SIZES } from '../../v3/image-sizes';
import ChatButton from '../../v3/ChatButton';
import ResultCard from '../../v3/ResultCard';
import MonthCalendar from './MonthCalendar';
import '../../v3/explore-v3.css';

export const dynamic = 'force-dynamic';

const INFO_ICONS: Record<string, LucideIcon> = {
  'Địa chỉ': MapPin, 'Giờ nhận đoàn': Clock, 'Sức chứa': Users, 'Ngôn ngữ hướng dẫn': Languages, 'Đỗ xe': Bus,
  'Thanh toán': QrCode, 'Điện thoại': Phone, 'Email': Mail,
};

type Params = Record<string, string | string[] | undefined>;

// UI v3 Đợt 1: DSC122 (Tour Agency) / DSC123 (Guest) = mockup 24 (human decisions 2026-11-18 #4, #5, #9, #10).
export default async function ProviderPage({ params, searchParams }: { params: { id: string }; searchParams: Params }) {
  const seed = await loadExploreRuntime();
  const session = await currentServerSession();
  const viewer = resolveViewer(seed, session.role === 'Tour_Agency' ? session.agencyId : null, true);
  const isAgency = viewer.kind === 'agency';
  const query = parseSearch(searchParams);
  const now = new Date();
  const view = providerView(seed, params.id, viewer, now, paymentsEnabled(), { date: query.date, guests: query.guests });
  if (!view) notFound();
  // Preselected day (human review 2026-11-19): the search date when free, else the nearest free day from today.
  const chosen = defaultCalendarDay(seed, view.id, query.date, now);
  const thang = typeof searchParams.thang === 'string' && /^\d{4}-\d{2}$/.test(searchParams.thang) ? searchParams.thang
    : (chosen || query.date || new Date(now.getTime() + 7 * 3_600_000).toISOString()).slice(0, 7);
  const month = monthCalendar(seed, view.id, thang, now);

  return <div className="v3p">
    <ExploreTracker demoAgencyId={isAgency ? viewer.agencyId : undefined} />
    <div className="hab-band"><nav aria-label="Đường dẫn" className="v3-crumbs"><Link href="/explore">Trang chủ</Link><span aria-hidden="true">›</span><Link href={`/village/${view.villageId}`}>{view.villageTitle}</Link><span aria-hidden="true">›</span><span aria-current="page">{view.name}</span></nav></div>
    <nav className="v3d-tabs" aria-label="Mục trên trang"><div className="hab-band v3d-tabs__in">
      <a href="#tong-quan">Tổng quan</a><a href="#trai-nghiem">Trải nghiệm</a><a href="#lich">Lịch trống</a><a href="#thong-tin">Thông tin &amp; liên hệ</a><a href="#hoi-dap">Câu hỏi thường gặp</a>
    </div></nav>

    <section id="tong-quan" className="hab-band v3d-sec v3d-sec--top">
      <div className="v3p-head">
        <div className="v3p-head__who">
          <span className="v3p-mark" aria-hidden="true">{view.initials}</span>
          <div><p className="v3d-eyebrow">{view.eyebrow}</p><h1 className="v3d-h1 v3p-h1">{view.name}</h1><p className="v3d-provider">{view.address}</p></div>
        </div>
        {isAgency && view.firstExperienceId
          ? <ChatButton experienceId={view.firstExperienceId} className="v3p-chat" label="Nhắn tin cho xưởng"><MessageSquareText aria-hidden="true" /></ChatButton>
          : !isAgency && <Link href="/login" className="v3p-chat" aria-label="Nhắn tin cho xưởng" title="Nhắn tin cho xưởng"><MessageSquareText aria-hidden="true" /></Link>}
      </div>
      <div className="v3d-hero">
        <Gallery images={view.images} alt={view.name} maxWidth={804} />
        <aside className="v3d-side">
          <div className="v3-card v3d-owner">
            <div className="v3d-owner__who"><span className="v3d-avatar v3p-avatar" aria-hidden="true">{view.owner.initials}</span><div><p className="v3d-owner__name">{view.owner.name}</p><p className="v3-cap">{view.owner.title}</p></div></div>
            {view.owner.phone && <p className="v3d-owner__phone v3-tnum">{view.owner.phone}</p>}
            {view.owner.email && <p className="v3d-owner__phone v3p-brk">{view.owner.email}</p>}
          </div>
          {view.together && <div className="v3d-perfect v3p-together">
            <p className="v3d-perfect__t v3p-together__t">Bạn và xưởng này</p>
            <div className="v3d-perfect__i"><Check aria-hidden="true" /><span>{view.together.count} lần đặt chỗ, lần gần nhất <b>{view.together.latest}</b> {view.together.status}</span></div>
            <Link href={view.together.href} className="v3-link v3p-together__link">Xem lịch sử đặt chỗ</Link>
          </div>}
        </aside>
      </div>

      {view.highlights.length > 0 && <section aria-labelledby="v3p-hl" className="v3d-block">
        <h2 id="v3p-hl" className="v3-h3 v3d-mb v3p-hl__h">Điểm nổi bật của xưởng</h2>
        <div className="v3p-hls">{view.highlights.map(item => <div key={item.title} className="v3p-hl"><span className="v3p-hl__i" aria-hidden="true"><CircleCheck /></span><span><b>{item.title}</b><span className="v3p-hl__s">{item.sub}</span></span></div>)}</div>
      </section>}

      <div className="v3d-about">
        <div className="v3d-about__main">
          {view.about.length > 0 && <div className="v3d-stack"><h2 className="v3-h2">Giới thiệu xưởng</h2>{view.about.map((item, index) => <p key={index} className="v3d-lead v3p-lead">{item.lead && <b>{item.lead}</b>}{item.text}</p>)}</div>}
        </div>
        {view.suitableFor.length > 0 && <aside className="v3d-about__side"><h2 className="v3-h3 v3d-mb">Xưởng hợp với</h2><div className="v3d-gchips">{view.suitableFor.map(term => <span key={term} className="v3d-gchip"><Check aria-hidden="true" />{term}</span>)}</div></aside>}
      </div>
    </section>

    <section id="trai-nghiem" className="hab-band v3d-sec">
      <div className="v3-head"><div><h2 className="v3-h2">Trải nghiệm của xưởng ({view.experiences.length})</h2></div></div>
      <div className="v3p-exlist">{view.experiences.slice(0, 3).map(item => <ResultCard key={item.id} item={item} query={searchParams} variant="provider" />)}</div>
      {view.experiences.length > 3 && <div className="v3-more-row"><Link href="/explore/search" className="v3-more">Xem tất cả trải nghiệm ›</Link></div>}
    </section>

    <section id="lich" className="hab-band v3d-sec">
      <h2 className="v3-h2 v3d-mb">Lịch trống</h2>
      <MonthCalendar month={month} basePath={`/explore/providers/${view.id}`} isAgency={isAgency} initial={chosen} experiences={view.experiences.map(item => ({ id: item.id, name: item.name }))} />
    </section>

    {view.info.length > 0 && <section id="thong-tin" className="hab-band v3d-sec">
      <h2 className="v3-h2 v3d-mb">Thông tin &amp; liên hệ</h2>
      <div className="v3-card v3p-kv"><div className="v3p-kvg">{view.info.map(row => { const Icon = INFO_ICONS[row.label] ?? Info; return <div key={row.label} className="v3p-kvi"><Icon aria-hidden="true" /><div><b>{row.label}</b><span className={row.label === 'Email' ? 'v3p-brk' : undefined}>{row.value}</span></div></div> })}</div></div>
    </section>}

    {view.similar.length > 0 && <section className="hab-band v3d-sec" aria-labelledby="v3p-sim">
      <div className="v3-head"><div><h2 id="v3p-sim" className="v3-h2">Trải nghiệm tương tự ở làng khác</h2></div></div>
      <div className="v3p-simgrid">{view.similar.map(card => <Link key={card.id} href={`/explore/experiences/${card.id}`} className="v3-card v3p-sim">
        <CoverImage image={card.image} alt="" sizes={CARD_SIZES} className="v3p-sim__img" />
        <span className="v3p-sim__body"><span className="v3-craft">{card.craft}</span><b className="v3p-sim__name">{card.name}</b><span className="v3-cap">{[card.location.split(',')[0], card.meta.split(' · ')[0], card.meta.split(' · ')[1]?.replace('Tối đa', 'tối đa').replace('/ca', '')].filter(Boolean).join(' · ')}</span></span>
      </Link>)}</div><div className="v3-more-row"><Link href="/explore/search" className="v3-more">Xem tất cả ›</Link></div>
    </section>}

    <section id="hoi-dap" className="hab-band v3d-sec v3d-sec--last">
      <h2 className="v3-h2">Câu hỏi thường gặp về xưởng</h2>
      <div className="v3d-faqg">{[view.faq.slice(0, Math.ceil(view.faq.length / 2)), view.faq.slice(Math.ceil(view.faq.length / 2))].map((column, index) => <div key={index} className="v3d-faqc">
        {column.map(item => <details key={item.q} className="v3d-fq"><summary>{item.q}</summary><p>{item.a}</p></details>)}
      </div>)}</div>
    </section>
  </div>;
}

