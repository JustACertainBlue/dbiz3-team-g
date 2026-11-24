import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  Bus, CalendarDays, CalendarX2, Camera, ChevronDown, Clock, Gift, Globe, GraduationCap, Hand, Handshake, Landmark,
  MapPin, MessageSquareText, Palette, Shirt, ShoppingBag, Smile, Users, type LucideIcon,
} from 'lucide-react'
import { resolveViewer } from '@/lib/explore/catalog'
import { loadExploreRuntime } from '@/lib/explore/seed-repository'
import { parseSearch } from '@/lib/explore/v3-search'
import { villageView } from '@/lib/explore/v3-village'
import { currentServerSession } from '@/lib/auth/server-session'
import { GuestsField } from '@/app/explore/v3/GuestsInput'
import AiBox from '@/app/explore/v3/AiBox'
import ChatButton from '@/app/explore/v3/ChatButton'
import Gallery from '@/app/explore/v3/Gallery'
import ResultCard from '@/app/explore/v3/ResultCard'
import '@/app/explore/v3/explore-v3.css'
import '@/app/explore/v3/village-v3.css'

export const dynamic = 'force-dynamic'

type Params = Record<string, string | string[] | undefined>

const HIGHLIGHT_ICONS: LucideIcon[] = [Landmark, Hand, Palette, ShoppingBag]
const WHY_ICONS: Record<string, LucideIcon> = {
  'Đoàn học sinh': GraduationCap, 'Đoàn gia đình': Users, 'Khách quốc tế': Globe, 'Team building': Handshake,
  'Tour nửa ngày': Clock, 'Tour văn hoá – di sản': Landmark, 'Không cần kinh nghiệm': Smile, 'Sản phẩm mang về': ShoppingBag,
  'Chụp ảnh cùng nghệ nhân': Camera, 'Xem nghệ nhân làm việc': Palette,
}
const NOTE_ICONS: Record<string, LucideIcon> = { trang_phuc: Shirt, san_pham: Gift, gio_den: Clock, ngay_nghi: CalendarX2 }

// UI v3 Đợt 1: VIL030 Village Profile = mockup 03 (pack 19/11/2026; human decisions 2026-11-18 #5, #7, #9 and
// 2026-11-19). Guest and Tour Agency share the page; the Agency sees group prices and can message a workshop.
export default async function VillagePage({ params, searchParams }: { params: { villageId: string }; searchParams: Params }) {
  const seed = await loadExploreRuntime()
  const session = await currentServerSession()
  const viewer = resolveViewer(seed, session.role === 'Tour_Agency' ? session.agencyId : null, true)
  const isAgency = viewer.kind === 'agency'
  const query = parseSearch(searchParams)
  const ex = typeof searchParams.ex === 'string' ? searchParams.ex : ''
  const view = villageView(seed, params.villageId, viewer, { date: query.date, guests: query.guests, ex })
  if (!view) notFound()
  const hasNotes = view.notes.length > 0

  return <div className="v3v">
    <section className="hab-band v3d-sec v3d-sec--top">
      <nav aria-label="Đường dẫn" className="v3-crumbs v3v-crumbs"><Link href="/explore">Trang chủ</Link><span aria-hidden="true">›</span><Link href="/villages">Làng nghề</Link><span aria-hidden="true">›</span><span aria-current="page">{view.name}</span></nav>
      <div className="v3v-head">
        <div>
          <p className="v3d-eyebrow">{view.eyebrow}</p>
          <h1 className="v3d-h1">{view.title}</h1>
          <p className="v3d-provider"><MapPin aria-hidden="true" />{view.place}</p>
        </div>
        {view.experienceCount > 0 && <a className="hab-btn hab-btn--primary" href="#trai-nghiem">Xem trải nghiệm ở làng</a>}
      </div>
      <Gallery images={view.images} alt={view.title} className="v3v-gal" />

      <section aria-labelledby="v3v-hl" className="v3d-block">
        <h2 id="v3v-hl" className="v3-h3 v3d-mb v3v-h3">Điểm nổi bật của làng</h2>
        <div className="v3v-hls">{view.highlights.map((item, index) => {
          const Icon = item.counter ? Hand : HIGHLIGHT_ICONS[index] ?? Landmark
          return <div key={item.title} className="v3v-hl"><span className="v3v-hl__i" aria-hidden="true"><Icon /></span><span><b>{item.title}</b>{item.sub && <span className="v3v-hl__s">{item.sub}</span>}</span></div>
        })}</div>
      </section>

      {view.options.length > 0 && <section aria-labelledby="v3v-av" className="v3d-block">
        <h2 id="v3v-av" className="v3-h3 v3d-mb v3v-h3">Xem lịch trống cho đoàn của bạn</h2>
        <form role="search" aria-label="Chọn trải nghiệm và ngày" className="v3-sbar v3v-sbar" action={`/village/${view.id}#trai-nghiem`} method="get">
          <label className="v3-seg v3-seg--q"><Palette aria-hidden="true" /><span className="v3-sv"><span className="v3-sl">Chọn trải nghiệm ở {view.name}</span>
            <select name="ex" defaultValue={ex}><option value="">Tất cả {view.experienceCount} trải nghiệm</option>{view.options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></span>
            <ChevronDown aria-hidden="true" className="v3-seg__chev" /></label>
          <label className="v3-seg"><CalendarDays aria-hidden="true" /><span className="v3-sv"><span className="v3-sl">Ngày đưa đoàn đi</span>
            <input name="date" type="date" defaultValue={query.date} /></span></label>
          <label className="v3-seg"><Users aria-hidden="true" /><span className="v3-sv"><span className="v3-sl">Số khách trong đoàn</span>
            <GuestsField id="v3v-guests" name="guests" defaultValue={query.guests ? String(query.guests) : ''} max={null} /></span></label>
          <button type="submit" className="v3-sbtn">Xem lịch trống</button>
        </form>
      </section>}
    </section>

    <nav className="v3d-tabs" aria-label="Mục trên trang"><div className="hab-band v3d-tabs__in">
      <a href="#gioi-thieu">Giới thiệu</a><a href="#trai-nghiem">Trải nghiệm ({view.experienceCount})</a><a href="#xuong">Xưởng &amp; nghệ nhân ({view.providers.length})</a>
      {hasNotes && <a href="#luu-y">Lưu ý khi đưa đoàn đến</a>}
    </div></nav>

    <section id="gioi-thieu" className="hab-band v3d-sec v3v-about">
      <div className="v3v-about__main">
        {view.about.length > 0 && <div><h2 className="v3-h2">Về làng nghề</h2>{view.about.map(text => <p key={text} className="v3v-body">{text}</p>)}</div>}
        {view.why.length > 0 && <div><h3 className="v3-h3 v3d-mb">Vì sao nên đưa đoàn đến {view.name}</h3>
          <div className="v3d-gchips">{view.why.map(term => { const Icon = WHY_ICONS[term] ?? Landmark; return <span key={term} className="v3d-gchip"><Icon aria-hidden="true" />{term}</span> })}</div></div>}
        <div id="trai-nghiem" className="v3v-anchor">
          <h2 className="v3-h2">Trải nghiệm ở {view.name}</h2>
          <p className="v3-sub">Giá đã gồm nguyên liệu và người hướng dẫn, tính theo mỗi khách.</p>
          {view.results.length === 0 && <p className="v3-empty">Làng chưa có trải nghiệm đang nhận đoàn.</p>}
          <div className="v3v-results">{view.results.map(item => <ResultCard key={item.id} item={item} query={searchParams} showDistance={false} />)}</div>
          {view.moreHref && <Link href={view.moreHref} className="v3v-more">Xem thêm trải nghiệm ›</Link>}
        </div>
      </div>
      <aside className="v3v-about__side">
        {view.tour && <div className="v3d-perfect">
          {view.tour.title && <p className="v3d-perfect__t">{view.tour.title}</p>}
          {view.tour.lines.map((text, index) => { const Icon = [Bus, Clock][index] ?? Clock; return <div key={text} className="v3d-perfect__i"><Icon aria-hidden="true" /><span>{text}</span></div> })}
          {view.tour.extras.length > 0 && <p className="v3d-perfect__t v3d-perfect__t--sm">Có thêm:</p>}
          {view.tour.extras.map((text, index) => { const Icon = [CalendarDays, Gift][index] ?? Gift; return <div key={text} className="v3d-perfect__i"><Icon aria-hidden="true" /><span>{text}</span></div> })}
          {view.experienceCount > 0 && <a href="#trai-nghiem" className="v3-link">Xem trải nghiệm</a>}
        </div>}
        <div className="v3-card v3v-info"><dl>{view.info.map(row => <div key={row.label} className="v3v-info__r"><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl></div>
      </aside>
    </section>

    {view.providers.length > 0 && <section id="xuong" className="hab-band v3d-sec">
      <h2 className="v3-h2">Xưởng &amp; nghệ nhân</h2>
      <p className="v3-sub">Những người sẽ trực tiếp đón đoàn của bạn.</p>
      <div className="v3v-pgrid">{view.providers.map(provider => <div key={provider.id} className="v3-card v3v-pcard">
        <span className="v3v-pcard__mark" aria-hidden="true">{provider.initials}</span>
        <div className="v3v-pcard__body">
          <p className="v3v-pcard__name">{provider.name}</p>
          {provider.owner && <p className="v3v-pcard__owner">Chủ xưởng: {provider.owner}</p>}
          <p className="v3v-pcard__line">{provider.line}</p>
          <div className="v3v-pcard__acts">
            {isAgency
              ? <ChatButton experienceId={provider.firstExperienceId} className="v3p-chat v3v-chat" label="Nhắn tin cho xưởng"><MessageSquareText aria-hidden="true" /></ChatButton>
              : <Link href="/login" className="v3p-chat v3v-chat" aria-label="Nhắn tin cho xưởng" title="Nhắn tin cho xưởng"><MessageSquareText aria-hidden="true" /></Link>}
            <Link href={`/explore/providers/${provider.id}`} className="v3-link">Xem hồ sơ xưởng</Link>
          </div>
        </div>
      </div>)}</div>
    </section>}

    {view.experienceCount > 0 && <section className="hab-band v3d-sec" aria-labelledby="v3v-ai">
      <h2 id="v3v-ai" className="v3-h2 v3v-aih">Chưa biết chọn trải nghiệm nào ở {view.name}?</h2>
      <AiBox agency={isAgency} title={`Kể yêu cầu của đoàn, AI gợi ý trải nghiệm phù hợp ở ${view.name} cho bạn.`}
        placeholder="VD: đoàn 20 học sinh, sáng Thứ Tư, muốn tự tay làm một sản phẩm…"
        chips={[`Trải nghiệm ở ${view.name} cho 20 học sinh`, 'Trải nghiệm có sản phẩm mang về', 'Trải nghiệm nhận đoàn 30 khách']} guestHints={false} />
    </section>}

    {hasNotes && <section id="luu-y" className="hab-band v3d-sec">
      <h2 className="v3-h2">Lưu ý khi đưa đoàn đến</h2>
      <div className="v3-card v3v-notes"><dl>{view.notes.map(note => { const Icon = NOTE_ICONS[note.key] ?? Clock; return <div key={note.key} className="v3v-notes__r"><dt><Icon aria-hidden="true" />{note.label}</dt><dd>{note.text}</dd></div> })}</dl></div>
    </section>}
    <div className="v3d-sec--last" />
  </div>
}
