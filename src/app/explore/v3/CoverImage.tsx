'use client'
// UI v3 image: fills its frame (object-fit cover). Without a servable image, or when loading fails, it shows an
// empty neutral frame: no icon, no text (human decision 2026-11-18 #7).
import React, { useState } from 'react'

export default function CoverImage({ src, alt, className, eager = false }: { src: string | null | undefined; alt: string; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false)
  const classes = ['v3-cover', className].filter(Boolean).join(' ')
  if (!src || failed) return <span className={`${classes} v3-cover--empty`} aria-hidden="true" />
  return <img className={classes} src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} />
}
