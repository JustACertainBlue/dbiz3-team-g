// Experience card of mockup 01/21 (and the workshop page 24): image, craft label, name, place, duration/capacity,
// the first 3 highlight titles, "Gợi ý vì" (Agency, when preferences match) and "Giá từ … /khách" for everyone.
import React from 'react'
import Link from 'next/link'
import { Check, MapPin, Sparkles } from 'lucide-react'
import type { CardView } from '@/lib/explore/v3-home'
import CoverImage from './CoverImage'

export const vnd = (value: number) => `${value.toLocaleString('vi-VN')} ₫`

export default function ExperienceCard({ card, showDetailLink, track }: { card: CardView; showDetailLink: boolean; track?: boolean }) {
  const href = `/explore/experiences/${card.id}`
  const data = track ? { 'data-exp-action': 'click_card', 'data-exp-id': card.id, 'data-provider-id': card.providerId } : {}
  return <article className="v3-card v3-xcard">
    <CoverImage src={card.image} alt={card.name} className="v3-xcard__img" />
    <div className="v3-xcard__body">
      {card.craft && <p className="v3-craft">{card.craft}</p>}
      <h3 className="v3-h3"><Link href={href} className="v3-xcard__title" {...data}>{card.name}</Link></h3>
      <p className="v3-xcard__place"><MapPin aria-hidden="true" />{card.location}</p>
      <p className="v3-xcard__meta">{card.meta}</p>
      {card.highlights.length > 0 && <ul className="v3-ben" aria-label="Điểm nổi bật">{card.highlights.map(text => <li key={text}><Check aria-hidden="true" /><span>{text}</span></li>)}</ul>}
      {card.why && <p className="v3-why"><Sparkles aria-hidden="true" /><span>{card.why}</span></p>}
      <div className="v3-xcard__foot">
        <span><span className="v3-cap v3-block">Giá từ</span><b className="v3-price">{vnd(card.priceFrom)}</b><span className="v3-cap"> /khách</span></span>
        {showDetailLink && <Link href={href} className="v3-link" {...data}>Xem chi tiết</Link>}
      </div>
    </div>
  </article>
}
