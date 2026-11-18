import React from 'react'
import Link from 'next/link'
import { House, MapPin } from 'lucide-react'
import { loadExploreRuntime } from '@/lib/explore/seed-repository'
import { VILLAGE_PAGE_SIZE, villageList } from '@/lib/explore/v3-village'
import Pagination from '@/app/components/ui/Pagination'
import CoverImage from '@/app/explore/v3/CoverImage'
import '@/app/explore/v3/explore-v3.css'
import '@/app/explore/v3/village-v3.css'

export const dynamic = 'force-dynamic'

type Params = Record<string, string | string[] | undefined>

// UI v3 Đợt 1: screen 03a, village list (mockup pack 19/11/2026). Guest and Tour Agency share it (only the bar
// differs). Filter by the village's main craft (`nghe`), 9 villages per page; villages without an image are left out.
export default async function VillagesPage({ searchParams }: { searchParams: Params }) {
  const seed = await loadExploreRuntime()
  const list = villageList(seed, searchParams)
  const href = (craft: string, page = 1) => {
    const params = new URLSearchParams()
    if (craft) params.set('nghe', craft)
    if (page > 1) params.set('page', String(page))
    return params.size ? `/villages?${params}` : '/villages'
  }
  const from = (list.page - 1) * VILLAGE_PAGE_SIZE + 1
  const to = from + list.items.length - 1
  const pages = Math.ceil(list.total / VILLAGE_PAGE_SIZE)

  return <section className="hab-band v3d-sec v3d-sec--top v3l">
    <nav aria-label="Đường dẫn" className="v3-crumbs v3v-crumbs"><Link href="/explore">Trang chủ</Link><span aria-hidden="true">›</span><span aria-current="page">Làng nghề</span></nav>
    <h1 className="v3-h1 v3l-h1">Làng nghề quanh Hà Nội</h1>
    <p className="v3l-sub">{list.all} làng đang nhận đoàn. Chọn một làng để xem trải nghiệm, xưởng và những lưu ý khi đưa đoàn đến.</p>
    <nav className="v3l-chips" aria-label="Lọc theo nghề">
      <Link className="v3l-chip" href={href('')} aria-current={list.craft === '' ? 'page' : undefined}>Tất cả ({list.all})</Link>
      {list.facets.map(facet => <Link key={facet.value} className="v3l-chip" href={href(facet.value)} aria-current={list.craft === facet.value ? 'page' : undefined}>{facet.label} ({facet.n})</Link>)}
    </nav>
    {list.items.length === 0 && <p className="v3-empty">Chưa có làng nghề đang nhận đoàn.</p>}
    <div className="v3l-grid">{list.items.map(card => <Link key={card.village_id} href={`/village/${card.village_id}`} className="v3-card v3l-card">
      <CoverImage src={card.image} alt="" className="v3l-card__img" />
      <span className="v3l-card__body">
        <h2 className="v3l-card__name">{card.name}</h2>
        <p className="v3l-card__craft">{[card.craft, card.area].filter(Boolean).join(' · ')}</p>
        <p className="v3l-card__meta"><House aria-hidden="true" />{card.providers} xưởng · {card.experiences} trải nghiệm</p>
        {card.distance && <p className="v3l-card__meta v3l-card__dist"><MapPin aria-hidden="true" />{card.distance}</p>}
      </span>
    </Link>)}</div>
    {list.total > 0 && <Pagination from={from} to={to} total={list.total} unit="làng nghề"
      prev={list.page > 1 ? { href: href(list.craft, list.page - 1) } : undefined} next={list.page < pages ? { href: href(list.craft, list.page + 1) } : undefined} />}
  </section>
}
