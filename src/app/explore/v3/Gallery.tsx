// Shared gallery of 03, 04/23 and 24 (human review 2026-11-19, second round): never an empty tile.
// 5+ images: 1 large + 2×2, the fifth tile says "+N ảnh"; 4: 1 large + one wide on top right and 2 below;
// 3: 1 large + 2 stacked; 2: two halves; 1: one full; 0: nothing.
import React from 'react'
import CoverImage from './CoverImage'

export default function Gallery({ images, alt, className }: { images: string[]; alt: string; className?: string }) {
  if (!images.length) return null
  const shown = images.slice(0, 5)
  const more = images.length - shown.length
  return <div className={`v3g v3g--n${shown.length}${className ? ` ${className}` : ''}`}>
    {shown.map((src, index) => <div key={`${src}-${index}`} className={`v3g__t v3g__t${index + 1}`}>
      <CoverImage src={src} alt={index === 0 ? alt : ''} eager />
      {index === shown.length - 1 && more > 0 && <span className="v3d-more">+{more} ảnh</span>}
    </div>)}
  </div>
}
