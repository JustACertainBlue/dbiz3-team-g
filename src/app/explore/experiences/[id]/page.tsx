import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUp, Check, CircleCheck, Clock, Info, Lock, MapPin, Sparkles, WandSparkles } from 'lucide-react';
import { resolveViewer } from '../../../../lib/explore/catalog';
import { detailView, slotRows, weekNote } from '../../../../lib/explore/v3-detail';
import { loadExperienceSlots, loadExploreRuntime } from '../../../../lib/explore/seed-repository';
import { parseSearch } from '../../../../lib/explore/v3-search';
import { currentServerSession } from '../../../../lib/auth/server-session';
import { paymentsEnabled } from '../../../../lib/flags';
import ExploreTracker from '../../ExploreTracker';
import SearchBar from '../../v3/SearchBar';
import Gallery from '../../v3/Gallery';
import AiBox from '../../v3/AiBox';
import ChatButton from '../../v3/ChatButton';
import ShareButton from '../../v3/ShareButton';
import { vnd } from '../../v3/ExperienceCard';
import SlotTable from './SlotTable';
import RequestButton from '../../v3/RequestButton';
import { GuestsField } from '../../v3/GuestsInput';
import '../../v3/explore-v3.css';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

// UI v3 Đợt 1: DSC033 Tour Agency = mockup 04, DSC124 Guest = mockup 23 (human decisions 2026-11-18 #3, #4, #5, #9, #10).
export default async function ExperienceEntry({ params, searchParams }: { params: { id: string }; searchParams: Params }) {
  const seed = await loadExploreRuntime();
  const session = await currentServerSession();
  const viewer = resolveViewer(seed, session.role === 'Tour_Agency' ? session.agencyId : null, true);
  const isAgency = viewer.kind === 'agency';
  const query = parseSearch(searchParams);
  const slotData = await loadExperienceSlots();
  const view = detailView(seed, params.id, viewer, { date: query.date, guests: query.guests }, slotData, paymentsEnabled());
  if (!view) notFound();
  const slots = slotRows(seed, slotData, view.id, query.date, query.guests);
  const week = query.date ? weekNote(seed, view.providerId, query.date) : '';
  const dateLong = query.date ? `${view.group.dateText.split(' ')[0]} ${view.group.dateText.split(' ')[1]}, ${query.date.slice(8, 10)}/${query.date.slice(5, 7)}/${query.date.slice(0, 4)}` : '';
  const aiHref = (text: string) => isAgency ? `/ai-matching?prompt=${encodeURIComponent(text)}` : '/login';
  const groupTitle = view.group.guests ? `Gợi ý cho đoàn ${view.group.guests} khách của bạn` : 'Gợi ý cho đoàn của bạn';

  return <div className="v3p">
    <ExploreTracker demoAgencyId={isAgency ? viewer.agencyId : undefined} detailExperienceId={view.id} />
    <div className="hab-band v3s-top">
      <SearchBar q={query.q} date={query.date} guests={query.guests ? String(query.guests) : ''} label="Sửa tìm kiếm" />
      <nav aria-label="Đường dẫn" className="v3-crumbs"><Link href="/explore">Trang chủ</Link><span aria-hidden="true">›</span><Link href="/explore/search">Khám phá</Link><span aria-hidden="true">›</span><Link href={`/village/${view.villageId}`}>{view.villageName}</Link><span aria-hidden="true">›</span><span aria-current="page">{view.name}</span></nav>
    </div>
    <nav className="v3d-tabs" aria-label="Mục trên trang"><div className="hab-band v3d-tabs__in">
      <a href="#tong-quan">Tổng quan</a><a href="#lich">Giá &amp; lịch trống</a><a href="#bao-gom">Bao gồm &amp; tiện ích</a><a href="#chinh-sach">Chính sách</a><a href="#hoi-dap">Câu hỏi thường gặp</a>
    </div></nav>

    <section id="tong-quan" className="hab-band v3d-sec v3d-sec--top">
      <div className="v3d-titlebar">
        <div><p className="v3d-eyebrow">{view.eyebrow}</p><h1 className="v3d-h1">{view.name}</h1><p className="v3d-provider"><MapPin aria-hidden="true" />{view.providerLine}</p></div>
        <div className="v3d-titleside">
          <ShareButton title={view.name} />
          <span className="v3d-from"><span className="v3-cap v3-block">Giá từ</span><span><b className="v3d-fromprice">{vnd(view.priceFrom)}</b><span className="v3-cap"> /khách</span></span></span>
          {isAgency ? <a className="hab-btn hab-btn--primary" href="#lich">Xem lịch &amp; đặt chỗ</a> : <Link className="hab-btn hab-btn--primary" href="/login">Đăng nhập để đặt chỗ</Link>}
        </div>
      </div>
      <div className="v3d-hero">
        <Gallery images={view.images} alt={view.name} maxWidth={804} />
        <aside className="v3d-side">
          <div className="v3-card v3d-owner">
            <div className="v3d-owner__who"><span className="v3d-avatar" aria-hidden="true">{view.owner.initials}</span><div><p className="v3d-owner__name">{view.owner.name}</p><p className="v3-cap">{view.owner.title}</p></div></div>
            {view.owner.phone && <p className="v3d-owner__phone">Điện thoại <span className="v3-tnum">{view.owner.phone}</span></p>}
            {isAgency ? <ChatButton experienceId={view.id} /> : <Link className="hab-btn hab-btn--secondary hab-btn--sm" href={`/explore/providers/${view.providerId}`}>Xem hồ sơ xưởng</Link>}
          </div>
          <form className="v3d-aimini" aria-label="Ghép tour AI" action={isAgency ? '/ai-matching' : '/login'} method="get">
            <span className="v3-aibrand"><span className="v3-dotm" aria-hidden="true"><WandSparkles /></span><b>Ghép tour AI</b></span>
            <p className="v3d-aimini__t">Kể yêu cầu của đoàn, AI gợi ý trải nghiệm hợp với đoàn.</p>
            <label className="v3d-aimini__in"><span className="v3-sr">Yêu cầu của đoàn</span><input name={isAgency ? 'prompt' : undefined} placeholder="VD: 20 học sinh, 25/11" /><button type="submit" className="v3-aisend" aria-label="Gửi cho Ghép tour AI"><ArrowUp /></button></label>
            {['Trải nghiệm cho đoàn học sinh', 'Trải nghiệm nhận đoàn 30 khách'].map(text => <Link key={text} className="v3d-aimini__q" href={aiHref(text)}><Sparkles aria-hidden="true" />{text}</Link>)}
          </form>
        </aside>
      </div>

      {view.highlights.length > 0 && <section aria-labelledby="v3d-hl" className="v3d-block">
        <h2 id="v3d-hl" className="v3-h3 v3d-mb">Điểm nổi bật của trải nghiệm</h2>
        <div className="v3d-hls">{view.highlights.map(item => <div key={item.title} className="v3d-hl"><span className="v3d-hl__i" aria-hidden="true"><CircleCheck /></span><span><b>{item.title}</b>{item.sub && <span className="v3d-hl__s">{item.sub}</span>}</span></div>)}</div>
      </section>}

      <section aria-labelledby="v3d-rec" className="v3d-block">
        <div className="v3d-rec">
          <h2 id="v3d-rec" className="v3d-rec__h">{groupTitle}</h2>
          <div className="v3d-rec__b">
            <div>
              <p className="v3d-rec__name">{view.group.guests ? `${view.group.guests} × ` : ''}<a href="#lich">{view.name}</a></p>
              <p className="v3d-rec__sub">{view.providerLine.split(' · ')[0]} · 1 ca {view.durationText}</p>
              {view.group.perGuest.length > 0 && <><p className="v3d-rec__each">Mỗi khách có:</p><div>{view.group.perGuest.map(item => <span key={item} className="v3-mini">{item}</span>)}</div></>}
            </div>
            <div>
              {view.group.guide && <p className="v3d-rl v3d-rl--ok"><Check aria-hidden="true" />Có nghệ nhân hướng dẫn cả buổi</p>}
              {view.group.cancel && <p className="v3d-rl"><Info aria-hidden="true" /><span><b>{view.group.cancel.split(':')[0]}:</b>{view.group.cancel.slice(view.group.cancel.indexOf(':') + 1)}</span></p>}
              <p className="v3d-rl v3d-rl--ok"><Check aria-hidden="true" /><span><b>Không cần trả trước</b>, chỉ thanh toán khi xưởng đã giữ chỗ</span></p>
            </div>
            <div className="v3d-rec__price">
              {(view.group.dateText || view.group.guests) && <p className="v3d-rec__when">{[view.group.dateText, view.group.guests ? `${view.group.guests} khách` : ''].filter(Boolean).join(' · ')}</p>}
              {view.group.price.kind === 'group' && <><b className="v3r__total">{vnd(view.group.price.total)}</b>
                {view.group.price.old !== null && <span className="v3r__old">{vnd(view.group.price.old)}</span>}
                {view.group.price.old !== null && <span className="v3r__disc v3d-save">Tiết kiệm {view.group.price.note.replace(/\D+/g, '')}% giá đoàn</span>}
                {view.group.price.old === null && view.group.price.note && <span className="v3r__nodisc">{view.group.price.note}</span>}</>}
              {view.group.price.kind === 'locked' && <><p className="v3-cap">Giá cho đoàn {view.group.guests} khách</p><Link href="/login" className="v3r__lock"><Lock aria-hidden="true" />Đăng nhập để xem giá đoàn</Link></>}
              {view.group.price.kind === 'from' && <><span className="v3-cap">Giá từ</span><b className="v3r__total">{vnd(view.group.price.perPerson)}<span className="v3-cap"> /khách</span></b></>}
              {isAgency
                ? <><RequestButton experiences={[{ id: view.id, name: view.name, max: view.maxGuests }]} date={query.date} guests={query.guests} className="hab-btn hab-btn--primary v3d-req" /><p className="v3-cap">Đừng lo, gửi yêu cầu chưa mất phí. Xưởng nhận lời mới giữ chỗ.</p></>
                : <><Link className="hab-btn hab-btn--primary v3d-req" href="/login">Đăng nhập để đặt chỗ</Link><p className="v3-cap">Chưa có tài khoản? <Link className="v3-link" href="/register">Đăng ký tài khoản công ty lữ hành</Link></p></>}
            </div>
          </div>
        </div>
      </section>

      <div className="v3d-about">
        <div className="v3d-about__main">
          {view.about.length > 0 && <div className="v3d-stack"><h2 className="v3-h2">Về trải nghiệm này</h2>{view.about.map((item, index) => <p key={index} className="v3d-lead">{item.lead && <b>{item.lead}</b>}{item.text}</p>)}</div>}
          {view.suitableFor.length > 0 && <div><h2 className="v3-h3 v3d-mb">Rất hợp cho đoàn của bạn</h2><div className="v3d-gchips">{view.suitableFor.map(term => <span key={term} className="v3d-gchip"><Check aria-hidden="true" />{term}</span>)}</div></div>}
        </div>
        {view.halfDay && <aside className="v3d-about__side"><div className="v3d-perfect">
          <p className="v3d-perfect__t">Hoàn hảo cho tour nửa ngày!</p>
          {view.halfDay.lines.map(line => <div key={line} className="v3d-perfect__i"><Clock aria-hidden="true" /><span>{line}</span></div>)}
          {view.halfDay.extras.length > 0 && <><p className="v3d-perfect__t v3d-perfect__t--sm">Có thêm:</p>{view.halfDay.extras.map(line => <div key={line} className="v3d-perfect__i"><Check aria-hidden="true" /><span>{line}</span></div>)}</>}
          <a className="hab-btn hab-btn--primary" href="#lich">Chọn ngày</a>
        </div></aside>}
      </div>
    </section>

    <section id="lich" className="hab-band v3d-sec">
      <h2 className="v3-h2">Giá &amp; lịch trống</h2>
      <form role="search" aria-label="Đổi ngày và số khách" className="v3-sbar v3d-change" action={`/explore/experiences/${view.id}#lich`} method="get">
        <label className="v3-seg"><span className="v3-sv"><span className="v3-sl">Chọn ngày</span><input type="date" name="date" defaultValue={query.date} /></span></label>
        <label className="v3-seg"><span className="v3-sv"><span className="v3-sl">Số khách trong đoàn</span><GuestsField id="v3d-guests" name="guests" defaultValue={query.guests ? String(query.guests) : ''} max={view.maxGuests} /></span></label>
        <button type="submit" className="v3-sbtn v3d-change__btn">Thay đổi tìm kiếm</button>
      </form>
      <SlotTable experienceId={view.id} date={query.date} name={view.name} slots={slots} guests={query.guests} max={view.maxGuests} price={view.group.price} perGuest={view.group.perGuest} guide={view.group.guide}
        cancel={view.group.cancel} isAgency={isAgency} dateLong={dateLong} week={week} />
    </section>

    {view.includes.length > 0 && <section id="bao-gom" className="hab-band v3d-sec">
      <div className="v3-head"><div><h2 className="v3-h2">Bao gồm &amp; tiện ích của {view.name}</h2><p className="v3-sub">Mọi thứ đoàn nhận được trong một ca {view.durationText}, đã tính trong giá.</p></div><a className="hab-btn hab-btn--primary" href="#lich">Xem lịch trống</a></div>
      <div className="v3d-fac">{view.includes.map(group => <div key={group.title} className="v3d-fg"><h3>{group.title}</h3>
        {group.items.length > 0 && <ul>{group.items.map(item => <li key={item}><Check aria-hidden="true" /><span>{item}</span></li>)}</ul>}
        {group.note && <p className="v3d-gnote">{group.note}</p>}</div>)}</div>
    </section>}

    <section id="chinh-sach" className="hab-band v3d-sec">
      <div className="v3-head"><div><h2 className="v3-h2">Chính sách của xưởng</h2><p className="v3-sub">{view.providerLine.split(' · ')[0]} nhận yêu cầu riêng của đoàn, bạn ghi chú khi gửi yêu cầu đặt chỗ.</p></div><a className="hab-btn hab-btn--primary" href="#lich">Xem lịch trống</a></div>
      <div className="v3-card v3d-pols"><dl>{view.policies.map(policy => <div key={policy.title} className="v3d-pol"><dt>{policy.title}</dt><dd>
        {policy.title === 'Hình thức thanh toán' && <div><span className="v3d-pay v3d-pay--g">Thanh toán QR</span><span className="v3d-pay">Tài khoản của xưởng</span></div>}
        {policy.rows.map((row, index) => <React.Fragment key={index}>{row.when && <span className="v3d-pst">{row.when}</span>}<span className="v3d-pdesc">{row.what}</span></React.Fragment>)}
      </dd></div>)}</dl></div>
    </section>

    <section className="hab-band v3d-sec" aria-labelledby="v3d-ai">
      <div className="v3-head"><div><h2 id="v3d-ai" className="v3-h2">Chưa tìm được hoạt động phù hợp tại Làng {view.villageName}?</h2></div></div>
      <AiBox agency={isAgency} title="Kể cho AI nghe đoàn của bạn cần gì, AI sẽ gợi ý trải nghiệm phù hợp nhất cho đoàn."
        placeholder={`VD: đoàn 20 học sinh, muốn tự làm sản phẩm mang về…`}
        chips={[`Trải nghiệm khác ở ${view.villageName}`, 'Trải nghiệm cho 20 học sinh', 'Trải nghiệm tương tự ở làng nghề khác']} />
    </section>

    <section id="hoi-dap" className="hab-band v3d-sec v3d-sec--last">
      <h2 className="v3-h2">Câu hỏi thường gặp về {view.name}</h2>
      <div className="v3d-faqg">{[view.faq.slice(0, Math.ceil(view.faq.length / 2)), view.faq.slice(Math.ceil(view.faq.length / 2))].map((column, index) => <div key={index} className="v3d-faqc">
        {column.map(item => <details key={item.q} className="v3d-fq"><summary>{item.q}</summary><p>{item.a}</p></details>)}
      </div>)}</div>
    </section>
  </div>;
}
