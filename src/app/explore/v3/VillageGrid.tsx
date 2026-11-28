'use client'
// Village grid of mockup 01/21 (human decision 2026-11-18 #7): only villages with an image; the first tile is
// large and spans two rows; at most 7 tiles as in the mockup. A village whose image fails to load KEEPS its tile with
// the neutral frame, like the cards of /villages (human decision 2026-11-28: the PROD bucket can lack objects, and the
// section must never be left with a heading and no tiles). This replaces the earlier "failed image loses its tile" rule.
import React from 'react'
import Link from 'next/link'
import type { VillageTile } from '@/lib/explore/v3-home'
import CoverImage from './CoverImage'
import { VILLAGE_BIG_SIZES, VILLAGE_TILE_SIZES } from './image-sizes'

export default function VillageGrid({ tiles }: { tiles: VillageTile[] }) {
  const shown = tiles.filter(tile => tile.image).slice(0, 7)
  if (!shown.length) return null
  return <div className="v3-vgrid">
    {shown.map((tile, index) => <Link key={tile.village_id} href={`/village/${tile.village_id}`} className={`v3-vtile${index === 0 ? ' v3-vtile--big' : ''}`}>
      <CoverImage image={tile.image} alt="" sizes={index === 0 ? VILLAGE_BIG_SIZES : VILLAGE_TILE_SIZES} className="v3-vtile__img" />
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
