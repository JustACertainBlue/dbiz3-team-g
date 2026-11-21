// Shared gallery of 03, 04/23 and 24 (human review 2026-11-19, second round): never an empty tile.
// 5+ images: 1 large + 2×2, the fifth tile says "+N ảnh"; 4: 1 large + one wide on top right and 2 below;
// 3: 1 large + 2 stacked; 2: two halves; 1: one full; 0: nothing.
// Step 2B: landscape images come first (stable), so the large tile gets a landscape image when there is one; tile 1 is the
// page's LCP image, the other tiles are eager with fetchpriority=low.
import React from 'react'
import { landscapeFirst, type ImageRef } from '@/lib/prf/media-urls'
import CoverImage from './CoverImage'

export { landscapeFirst }

// Share of the gallery width of each tile, per number of tiles (CSS: .v3g--nN in explore-v3.css).
const SHARE: Record<number, number[]> = { 1: [1], 2: [0.5, 0.5], 3: [2 / 3, 1 / 3, 1 / 3], 4: [0.5, 0.5, 0.25, 0.25], 5: [0.5, 0.25, 0.25, 0.25, 0.25] }
const vw = (share: number) => `${Number((share * 100).toFixed(2))}vw`

/**
 * `sizes` of one tile. object-fit: cover scales a landscape (4:3) image to the tile's height, so a tile needs an image at
 * least height × 4/3 wide however narrow it is: tall tiles (the large one; both tiles of 1–2 images) are 440 px high from
 * 900 px and 280 px below, the others 216 / 136 px. Otherwise the tile's real width: its share of the gallery, which is
 * `maxWidth` px at the widest layout (1100 on 03, 804 on 04/24) and the viewport on narrow screens.
 */
export function gallerySizes(count: number, index: number, maxWidth: number): string {
  const share = SHARE[Math.min(count, 5)][index] ?? 0.25
  const tall = index === 0 || count <= 2
  const [desktopHeight, mobileHeight] = tall ? [440, 280] : [216, 136]
  const desktop = `max(${Math.round(desktopHeight * 4 / 3)}px, min(${Math.round(share * maxWidth)}px, ${vw(share)}))`
  const mobile = `max(${Math.round(mobileHeight * 4 / 3)}px, ${vw(share)})`
  return `(min-width: 900px) ${desktop}, ${mobile}`
}

export default function Gallery({ images, alt, className, maxWidth = 1100 }: { images: ImageRef[]; alt: string; className?: string; maxWidth?: number }) {
  if (!images.length) return null
  const shown = landscapeFirst(images).slice(0, 5)
  const more = images.length - shown.length
  return <div className={`v3g v3g--n${shown.length}${className ? ` ${className}` : ''}`}>
    {shown.map((image, index) => <div key={`${image.url}-${index}`} className={`v3g__t v3g__t${index + 1}`}>
      <CoverImage image={image} alt={index === 0 ? alt : ''} sizes={gallerySizes(shown.length, index, maxWidth)} priority={index === 0 ? 'lcp' : 'low'} />
      {index === shown.length - 1 && more > 0 && <span className="v3d-more">+{more} ảnh</span>}
    </div>)}
  </div>
}
