'use client'
// UI v3 image: fills its frame (object-fit cover). Without a servable image, or when loading fails, it shows an
// empty neutral frame: no icon, no text (human decision 2026-11-18 #7).
// Step 2B: src/srcset use the WebP variants (400w, 800w, 1600w) of /api/prf/media; `sizes` is the width the image really
// takes at that position (docs/build/build-log.md, table "vị trí → sizes"); width/height are the stored size, so the browser
// knows the aspect ratio before it loads (the frame itself is still sized by CSS); portrait images keep their upper part.
import React, { useState } from 'react'
import { DEFAULT_VARIANT_WIDTH, isPortrait, variantSrc, variantSrcSet, type ImageRef } from '@/lib/prf/media-urls'

/** lcp: the one largest image of the page (eager, fetchpriority=high, preloaded); eager: other images of the first
 *  screen; low: eager but fetchpriority=low (small gallery tiles, so the LCP image is not slowed); lazy: below the first screen. */
export type ImagePriority = 'lcp' | 'eager' | 'low' | 'lazy'

interface Props {
  image: ImageRef | null | undefined
  alt: string
  sizes: string
  className?: string
  priority?: ImagePriority
  /** Limit the preload of an lcp image to a media query (screen 02: the first card is the LCP image from 900 px only). */
  preloadMedia?: string
}

export default function CoverImage({ image, alt, sizes, className, priority = 'lazy', preloadMedia }: Props) {
  const [failed, setFailed] = useState(false)
  const classes = ['v3-cover', className].filter(Boolean).join(' ')
  if (!image || failed) return <span className={`${classes} v3-cover--empty`} aria-hidden="true" />
  const srcSet = variantSrcSet(image.url)
  const src = variantSrc(image.url, DEFAULT_VARIANT_WIDTH)
  const lcp = priority === 'lcp'
  const sized = image.width > 0 && image.height > 0 ? { width: image.width, height: image.height } : {}
  // @types/react 18 has no fetchPriority; the React that Next ships reads it (it also copies it to the auto-preload hint).
  const hint: Record<string, string> = lcp ? { fetchPriority: 'high' } : priority === 'low' ? { fetchPriority: 'low' } : {}
  return <>
    {lcp && srcSet && <link rel="preload" as="image" href={src} imageSrcSet={srcSet} imageSizes={sizes} media={preloadMedia} {...hint} />}
    <img className={classes} src={src} srcSet={srcSet ?? undefined} sizes={srcSet ? sizes : undefined} alt={alt} {...sized} decoding="async"
      loading={priority === 'lazy' ? 'lazy' : 'eager'} {...hint} style={isPortrait(image) ? { objectPosition: '50% 40%' } : undefined} onError={() => setFailed(true)} />
  </>
}
