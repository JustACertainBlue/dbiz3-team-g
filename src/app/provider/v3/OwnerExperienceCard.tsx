// Experience card of screen 30: same markup and classes as the "provider" variant of the explore ResultCard (mockup 24),
// but linked to the owner's own experience page (screen 33).
import React from 'react'
import Link from 'next/link'
import { CalendarClock, Check, Package, Users } from 'lucide-react'
import type { ResultView } from '@/lib/explore/v3-search'
import CoverImage from '@/app/explore/v3/CoverImage'
import { RESULT_SIZES } from '@/app/explore/v3/image-sizes'
import { vnd } from '@/app/explore/v3/ExperienceCard'

const ICONS = [CalendarClock, Users, Package, CalendarClock]

export default function OwnerExperienceCard({ item, href }: { item: ResultView; href: string }) {
  return <article className="v3-card v3r v3r--provider">
    <Link href={href} className="v3r__media" tabIndex={-1} aria-hidden="true"><CoverImage image={item.image} alt="" sizes={RESULT_SIZES} /></Link>
    <div className="v3r__main">
      <div className="v3r__top"><div className="v3r__titles"><h2 className="v3r__name"><Link href={href}>{item.name}</Link></h2></div>{item.craft && <span className="v3r__craft">{item.craft}</span>}</div>
      <div className="v3-ftags">{item.tags.map((tag, index) => { const Icon = tag === 'Mang sản phẩm về' ? Package : ICONS[index] ?? CalendarClock; return <span key={tag} className="v3-ftag"><Icon aria-hidden="true" />{tag}</span> })}</div>
      <div className="v3r__cols">
        <div className="v3r__left">{item.highlights.length > 0 && <ul className="v3-ben" aria-label="Điểm nổi bật">{item.highlights.map(text => <li key={text}><Check aria-hidden="true" /><span>{text}</span></li>)}</ul>}</div>
        <div className="v3r__price">
          {item.price.kind === 'group' && <><p className="v3r__guests">{item.price.guests} khách</p><b className="v3r__total">{vnd(item.price.total)}</b>
            {item.price.old !== null && <span className="v3r__old">{vnd(item.price.old)}</span>}{item.price.note && <span className={item.price.old !== null ? 'v3r__disc' : 'v3r__nodisc'}>{item.price.note}</span>}</>}
          {item.price.kind !== 'group' && <><span className="v3-cap">Giá từ</span><b className="v3r__total">{vnd(item.price.perPerson)}<span className="v3-cap"> /khách</span></b></>}
          {item.included && <p className="v3-cap v3r__incl">Đã gồm vật liệu và người hướng dẫn</p>}
          <Link className="hab-btn hab-btn--primary v3r__cta" href={href}>Xem chi tiết</Link>
        </div>
      </div>
    </div>
  </article>
}
