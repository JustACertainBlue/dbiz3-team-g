// Village grid of mockup 01/21 (human decision 2026-11-18 #7): only villages with an image; the first tile is
// large and spans two rows; at most 7 tiles as in the mockup.
import Link from 'next/link'
import type { VillageTile } from '@/lib/explore/v3-home'
import CoverImage from './CoverImage'

export default function VillageGrid({ tiles }: { tiles: VillageTile[] }) {
  return <div className="v3-vgrid">
    {tiles.slice(0, 7).map((tile, index) => <Link key={tile.village_id} href={`/village/${tile.village_id}`} className={`v3-vtile${index === 0 ? ' v3-vtile--big' : ''}`}>
      <CoverImage src={tile.image} alt="" className="v3-vtile__img" />
      <span className="v3-vtile__shade" aria-hidden="true" />
      <span className="v3-vtile__text">
        <span className="v3-vtile__name">{tile.name}</span>
        {index === 0
          ? <><span className="v3-vtile__sub">{[tile.craft, [tile.name, tile.area].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</span>
              <span className="v3-vtile__sub">{tile.providers} xưởng đang nhận đoàn</span></>
          : <span className="v3-vtile__sub v3-vtile__sub--sm">{[tile.craft, tile.area].filter(Boolean).join(' · ')}</span>}
      </span>
    </Link>)}
  </div>
}
