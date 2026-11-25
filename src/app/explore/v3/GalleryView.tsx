'use client'
// Tiles of the shared gallery. A tile whose image fails to load is dropped and the rest re-flow (1-5 tiles); when none is
// left the whole block disappears: never an empty tile (D27, human decisions 2026-11-19 and 2026-11-21).
import React, { useCallback, useState } from 'react'
import type { ImageRef } from '@/lib/prf/media-urls'
import CoverImage from './CoverImage'
import { gallerySizes } from './gallery-sizes'

export default function GalleryView({ images, alt, className, maxWidth }: { images: ImageRef[]; alt: string; className?: string; maxWidth: number }) {
  const [gone, setGone] = useState<string[]>([])
  const drop = useCallback((url: string) => setGone(list => list.includes(url) ? list : [...list, url]), [])
  const usable = images.filter(image => !gone.includes(image.url))
  if (!usable.length) return null
  const shown = usable.slice(0, 5)
  const more = usable.length - shown.length
  return <div className={`v3g v3g--n${shown.length}${className ? ` ${className}` : ''}`}>
    {shown.map((image, index) => <div key={`${image.url}-${index}`} className={`v3g__t v3g__t${index + 1}`}>
      <CoverImage image={image} hideEmpty onNone={() => drop(image.url)} alt={index === 0 ? alt : ''} sizes={gallerySizes(shown.length, index, maxWidth)} priority={index === 0 ? 'lcp' : 'low'} />
      {index === shown.length - 1 && more > 0 && <span className="v3d-more">+{more} ảnh</span>}
    </div>)}
  </div>
}
