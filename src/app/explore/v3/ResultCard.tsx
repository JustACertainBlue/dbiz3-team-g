// Result card of mockup 02, reused on 03 (village experiences): image, name, village · workshop, craft, tags,
// 3 highlights, price ("Giá từ" or the group price for a Tour Agency) and "Xem lịch trống".
import React from 'react'
import Link from 'next/link'
import { CalendarClock, Check, ChevronRight, Lock, Package, Users } from 'lucide-react'
import type { ResultView } from '@/lib/explore/v3-search'
import CoverImage from './CoverImage'
import { vnd } from './ExperienceCard'

type Params = Record<string, string | string[] | undefined>

export default function ResultCard({ item, query }: { item: ResultView; query: Params }) {
  const keep = new URLSearchParams()
  for (const key of ['date', 'guests']) { const value = query[key]; if (typeof value === 'string' && value) keep.set(key, value); }
  const href = `/explore/experiences/${item.id}${keep.toString() ? `?${keep.toString()}` : ''}`
  const tagIcons = [CalendarClock, Users, Package, CalendarClock]
  return <article className="v3-card v3r">
    <Link href={href} className="v3r__media" tabIndex={-1} aria-hidden="true"><CoverImage src={item.image} alt="" /></Link>
    <div className="v3r__main">
      <div className="v3r__top">
        <div className="v3r__titles">
          <h2 className="v3r__name"><Link href={href}>{item.name}</Link></h2>
          <p className="v3r__where"><Link href={`/village/${item.villageId}`} className="v3r__village">{item.villageLine}</Link><span className="v3r__dot"> · </span><span>{item.providerName}</span></p>
          {item.distance && <p className="v3r__distance">{item.distance}</p>}
        </div>
        {item.craft && <span className="v3r__craft">{item.craft}</span>}
      </div>
      <div className="v3-ftags">{item.tags.map((tag, index) => { const Icon = tag === 'Mang sản phẩm về' ? Package : tagIcons[index] ?? CalendarClock; return <span key={tag} className="v3-ftag"><Icon aria-hidden="true" />{tag}</span> })}</div>
      <div className="v3r__cols">
        <div className="v3r__left">
          {item.highlights.length > 0 && <ul className="v3-ben" aria-label="Điểm nổi bật">{item.highlights.map(text => <li key={text}><Check aria-hidden="true" /><span>{text}</span></li>)}</ul>}
          <p className="v3r__prepay"><b>Không cần trả trước</b>, chỉ thanh toán khi xưởng đã giữ chỗ</p>
          {item.availability && <p className={item.availability.ok ? 'v3-av-ok' : 'v3-av-warn'}>{item.availability.text}</p>}
        </div>
        <div className="v3r__price">
          {item.price.kind === 'group' && <>
            <p className="v3r__guests">{item.price.guests} khách</p>
            <b className="v3r__total">{vnd(item.price.total)}</b>
            {item.price.old !== null && <span className="v3r__old">{vnd(item.price.old)}</span>}
            {item.price.note && <span className={item.price.old !== null ? 'v3r__disc' : 'v3r__nodisc'}>{item.price.note}</span>}
          </>}
          {item.price.kind !== 'group' && <><span className="v3-cap">Giá từ</span><b className="v3r__total">{vnd(item.price.perPerson)}<span className="v3-cap"> /khách</span></b></>}
          {item.price.kind === 'locked' && <Link href="/login" className="v3r__lock"><Lock aria-hidden="true" />Đăng nhập để xem giá đoàn</Link>}
          {item.included && <p className="v3-cap v3r__incl">Đã gồm vật liệu và người hướng dẫn</p>}
          <Link className="hab-btn hab-btn--primary v3r__cta" href={`${href}#lich`}>Xem lịch trống <ChevronRight aria-hidden="true" /></Link>
        </div>
      </div>
    </div>
  </article>
}
