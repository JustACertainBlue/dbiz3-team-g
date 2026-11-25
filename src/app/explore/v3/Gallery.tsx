// Shared gallery of 03, 04/23 and 24 (human review 2026-11-19, second round): never an empty tile.
// 5+ images: 1 large + 2×2, the fifth tile says "+N ảnh"; 4: 1 large + one wide on top right and 2 below;
// 3: 1 large + 2 stacked; 2: two halves; 1: one full; 0: nothing.
// Step 2B: landscape images come first (stable), so the large tile gets a landscape image when there is one; tile 1 is the
// page's LCP image, the other tiles are eager with fetchpriority=low.
import React from 'react'
import { landscapeFirst, type ImageRef } from '@/lib/prf/media-urls'
import GalleryView from './GalleryView'
import { gallerySizes } from './gallery-sizes'

export { landscapeFirst, gallerySizes }

export default function Gallery({ images, alt, className, maxWidth = 1100 }: { images: ImageRef[]; alt: string; className?: string; maxWidth?: number }) {
  if (!images.length) return null
  return <GalleryView images={landscapeFirst(images)} alt={alt} className={className} maxWidth={maxWidth} />
}
