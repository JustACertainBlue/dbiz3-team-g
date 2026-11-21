// Screen 33 (EXP068): "Chi tiết trải nghiệm của xưởng". Mockup hab-mockup-v3/png/33: the public detail (mockup 04) as the owner
// sees it. An experience that is not on the public catalog (archived, provider not verified) keeps the previous page.
import React from 'react'
import Link from 'next/link'
import { Check, CircleCheck, Clock, MapPin, PencilLine } from 'lucide-react'
import { currentServerSession } from '@/lib/auth/server-session'
import { hanoiDate } from '@/lib/booking/clock'
import { paymentsEnabled } from '@/lib/flags'
import { detailView, slotRows, weekNote } from '@/lib/explore/v3-detail'
import { loadExperienceSlots, loadExploreRuntime } from '@/lib/explore/seed-repository'
import { parseSearch } from '@/lib/explore/v3-search'
import Gallery from '@/app/explore/v3/Gallery'
import { vnd } from '@/app/explore/v3/ExperienceCard'
import OwnerSlotTable from '../../../v3/OwnerSlotTable'
import LegacyExperienceDetail from './LegacyExperienceDetail'
import '@/app/explore/v3/explore-v3.css'
import '../../../v3/provider-v3.css'

export const dynamic = 'force-dynamic'
type Params = Record<string, string | string[] | undefined>
const LONG = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
const longDate = (date: string) => `${LONG[new Date(`${date}T00:00:00Z`).getUTCDay()]}, ${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`
const DEFAULT_GUESTS = 10

export default async function ProviderExperienceDetail({ params, searchParams }: { params: { providerId: string; experienceId: string }; searchParams: Params }) {
  const session = await currentServerSession()
  const owner = session.authenticated && session.role === 'Local_Provider' && session.providerId === params.providerId
  const seed = owner ? await loadExploreRuntime() : null
  const slotData = seed ? await loadExperienceSlots() : []
  const query = parseSearch(searchParams)
  // An agency-shaped viewer shows the group price; nothing is looked up for the placeholder id.
  const viewer = { kind: 'agency', agencyId: '__provider-owner__' } as const
  const first = seed ? detailView(seed, params.experienceId, viewer, { date: '', guests: null }, slotData, paymentsEnabled()) : null
  if (!seed || !first || first.providerId !== params.providerId) return <LegacyExperienceDetail params={params} />

  const guests = query.guests ?? Math.min(DEFAULT_GUESTS, first.maxGuests)
  // Day shown: the chosen one, else the nearest day from tomorrow that still has a free slot.
  let date = query.date
  if (!date) {
    for (let step = 1; step <= 30 && !date; step++) {
      const day = hanoiDate(Date.now() + step * 86_400_000)
      if (slotRows(seed, slotData, first.id, day, guests).length) date = day
    }
  }
  const view = detailView(seed, params.experienceId, viewer, { date, guests }, slotData, paymentsEnabled()) ?? first
  const slots = date ? slotRows(seed, slotData, view.id, date, guests) : []
  const week = date ? weekNote(seed, view.providerId, date) : ''
  const id = params.providerId
  const base = `/provider/${id}/experiences`

  return <div className="v3p pv3-root">
    <div className="hab-band"><nav aria-label="Đường dẫn" className="v3-crumbs"><Link href={`/provider/${id}/dashboard`}>Tổng quan</Link><span aria-hidden="true">›</span><Link href={base}>Trải nghiệm của xưởng</Link><span aria-hidden="true">›</span><span aria-current="page">{view.name}</span></nav></div>
    <nav className="v3d-tabs" aria-label="Mục trên trang"><div className="hab-band v3d-tabs__in">
      <a href="#tong-quan">Tổng quan</a><a href="#lich">Giá &amp; lịch trống</a><a href="#bao-gom">Bao gồm &amp; tiện ích</a><a href="#chinh-sach">Chính sách</a><a href="#hoi-dap">Câu hỏi thường gặp</a>
    </div></nav>

    <section id="tong-quan" className="hab-band v3d-sec v3d-sec--top">
      <div className="v3d-titlebar">
        <div><p className="v3d-eyebrow">{view.eyebrow}</p><h1 className="v3d-h1">{view.name}</h1><p className="v3d-provider"><MapPin aria-hidden="true" />{view.providerLine}</p></div>
        <div className="v3d-titleside">
          <span className="pv3-pill-on" role="status">Đang hiển thị công khai</span>
          <Link className="pv3-iconbtn pv3-iconbtn--ring" href={`${base}/${view.id}/edit`} aria-label="Sửa trải nghiệm" title="Sửa trải nghiệm"><PencilLine aria-hidden="true" /></Link>
          <span className="v3d-from"><span className="v3-cap v3-block">Giá từ</span><span><b className="v3d-fromprice">{vnd(view.priceFrom)}</b><span className="v3-cap"> /khách</span></span></span>
        </div>
      </div>
      <div className="v3d-hero">
        <Gallery images={view.images} alt={view.name} maxWidth={804} />
        <aside className="v3d-side"><div className="v3-card v3d-owner">
          <div className="v3d-owner__who"><span className="v3d-avatar" aria-hidden="true">{view.owner.initials}</span><div><p className="v3d-owner__name">{view.owner.name}</p><p className="v3-cap">{view.owner.title}</p></div></div>
          {view.owner.phone && <p className="v3d-owner__phone">Điện thoại <span className="v3-tnum">{view.owner.phone}</span></p>}
        </div></aside>
      </div>

      {view.highlights.length > 0 && <section aria-labelledby="v3d-hl" className="v3d-block">
        <h2 id="v3d-hl" className="v3-h3 v3d-mb">Điểm nổi bật của trải nghiệm</h2>
        <div className="v3d-hls">{view.highlights.map(item => <div key={item.title} className="v3d-hl"><span className="v3d-hl__i" aria-hidden="true"><CircleCheck /></span><span><b>{item.title}</b>{item.sub && <span className="v3d-hl__s">{item.sub}</span>}</span></div>)}</div>
      </section>}

      <div className="v3d-about">
        <div className="v3d-about__main">
          {view.about.length > 0 && <div className="v3d-stack"><h2 className="v3-h2">Về trải nghiệm này</h2>{view.about.map((item, index) => <p key={index} className="v3d-lead">{item.lead && <b>{item.lead}</b>}{item.text}</p>)}</div>}
          {view.suitableFor.length > 0 && <div><h2 className="v3-h3 v3d-mb">Rất hợp cho đoàn của bạn</h2><div className="v3d-gchips">{view.suitableFor.map(term => <span key={term} className="v3d-gchip"><Check aria-hidden="true" />{term}</span>)}</div></div>}
        </div>
        {view.perfect && <aside className="v3d-about__side"><div className="v3d-perfect">
          <p className="v3d-perfect__t">{view.perfect.title}</p>
          {view.perfect.lines.map(line => <div key={line} className="v3d-perfect__i"><Clock aria-hidden="true" /><span>{line}</span></div>)}
          {view.perfect.extras.length > 0 && <><p className="v3d-perfect__t v3d-perfect__t--sm">Có thêm:</p>{view.perfect.extras.map(line => <div key={line} className="v3d-perfect__i"><Check aria-hidden="true" /><span>{line}</span></div>)}</>}
        </div></aside>}
      </div>
    </section>

    <section id="lich" className="hab-band v3d-sec">
      <h2 className="v3-h2">Giá &amp; lịch trống</h2>
      <OwnerSlotTable name={view.name} slots={slots} guests={guests} max={view.maxGuests} price={view.group.price} perGuest={view.group.perGuest} guide={view.group.guide}
        cancel={view.group.cancel} dateLong={date ? longDate(date) : ''} week={week} scheduleHref={`/provider/${id}/dashboard#lich`} editHref={`${base}/${view.id}/edit`} />
    </section>

    {view.includes.length > 0 && <section id="bao-gom" className="hab-band v3d-sec">
      <div className="v3-head"><div><h2 className="v3-h2">Bao gồm &amp; tiện ích của {view.name}</h2><p className="v3-sub">Mọi thứ đoàn nhận được trong một ca {view.durationText}, đã tính trong giá.</p></div><Link className="hab-btn hab-btn--primary" href={`/provider/${id}/dashboard#lich`}>Xem lịch trống</Link></div>
      <div className="v3d-fac">{view.includes.map(group => <div key={group.title} className="v3d-fg"><h3>{group.title}</h3>
        {group.items.length > 0 && <ul>{group.items.map(item => <li key={item}><Check aria-hidden="true" /><span>{item}</span></li>)}</ul>}
        {group.note && <p className="v3d-gnote">{group.note}</p>}</div>)}</div>
    </section>}

    <section id="chinh-sach" className="hab-band v3d-sec">
      <div className="v3-head"><div><h2 className="v3-h2">Chính sách của xưởng</h2><p className="v3-sub">{view.providerLine.split(' · ')[0]} nhận yêu cầu riêng của đoàn, bạn ghi chú khi gửi yêu cầu đặt chỗ.</p></div><Link className="hab-btn hab-btn--primary" href={`/provider/${id}/dashboard#lich`}>Xem lịch trống</Link></div>
      <div className="v3-card v3d-pols"><dl>{view.policies.map(policy => <div key={policy.title} className="v3d-pol"><dt>{policy.title}</dt><dd>
        {policy.title === 'Hình thức thanh toán' && <div><span className="v3d-pay v3d-pay--g">Thanh toán QR</span><span className="v3d-pay">Tài khoản của xưởng</span></div>}
        {policy.rows.map((row, index) => <React.Fragment key={index}>{row.when && <span className="v3d-pst">{row.when}</span>}<span className="v3d-pdesc">{row.what}</span></React.Fragment>)}
      </dd></div>)}</dl></div>
    </section>

    <section id="hoi-dap" className="hab-band v3d-sec v3d-sec--last">
      <h2 className="v3-h2">Câu hỏi thường gặp về {view.name}</h2>
      <div className="v3d-faqg">{[view.faq.slice(0, Math.ceil(view.faq.length / 2)), view.faq.slice(Math.ceil(view.faq.length / 2))].map((column, index) => <div key={index} className="v3d-faqc">
        {column.map(item => <details key={item.q} className="v3d-fq"><summary>{item.q}</summary><p>{item.a}</p></details>)}
      </div>)}</div>
    </section>
  </div>
}
