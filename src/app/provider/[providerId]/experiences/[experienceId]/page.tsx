'use client'

// EXP068 Experience Detail – Owner View. Gallery from the Experience's images (BR-009 categories);
// BR-016 lightbox: tapping an image opens it full-size with previous / next through the same gallery.
// Image binaries are not stored yet (checklist §3 #1), so each image shows a labelled placeholder.

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { EXPERIENCE_IMAGE_CATEGORIES } from '@/lib/prf/experience-images'
import { closeLightbox, nextImage, openLightbox, previousImage, type LightboxState } from '@/lib/prf/lightbox'

interface ExperienceImage {
  file_id: string
  category: string
  file_name: string
  width_px: number
  height_px: number
}

interface ExperienceDetail {
  experience_id: string
  name: string
  category: string
  description: string
  duration_minutes: number
  price_per_person: number
  max_participants: number
  images: ExperienceImage[]
}

const categoryLabel = (value: string) => EXPERIENCE_IMAGE_CATEGORIES.find(c => c.value === value)?.label ?? value

function Placeholder({ image, large = false }: { image: ExperienceImage; large?: boolean }) {
  return (
    <div style={{
      aspectRatio: '16 / 9', background: '#e7e5e4', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '0.25rem', color: '#44403c', fontSize: large ? '1rem' : '0.72rem', textAlign: 'center', padding: '0.5rem',
      width: large ? 'min(90vw, 960px)' : '100%',
    }}>
      <strong>{categoryLabel(image.category)}</strong>
      <span>{image.file_name}</span>
      <span>{image.width_px}×{image.height_px}</span>
    </div>
  )
}

export default function ExperienceDetailPage({
  params,
}: {
  params: { providerId: string; experienceId: string }
}) {
  const [experience, setExperience] = useState<ExperienceDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<LightboxState>({ open: false, index: 0, count: 0 })

  useEffect(() => {
    fetch(`/api/prf/experience/${params.experienceId}`)
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Không tìm thấy trải nghiệm')))
      .then(setExperience)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Lỗi tải dữ liệu'))
  }, [params.experienceId])

  const onKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') setLightbox(nextImage)
    if (event.key === 'ArrowLeft') setLightbox(previousImage)
    if (event.key === 'Escape') setLightbox(closeLightbox)
  }, [])

  useEffect(() => {
    if (!lightbox.open) return
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox.open, onKey])

  if (error) return <main style={{ padding: '3rem' }}><h1>{error}</h1><Link href={`/provider/${params.providerId}/experiences`}>← Quay lại danh sách</Link></main>
  if (!experience) return <main style={{ padding: '3rem' }}>Đang tải trải nghiệm (EXP068)…</main>

  const images = experience.images ?? []
  const current = images[lightbox.index]
  const button: React.CSSProperties = { background: '#ffffff', border: 'none', padding: '0.5rem 0.9rem', fontWeight: 700, cursor: 'pointer' }

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#78716c', fontWeight: 700 }}>EXP068 · Chi tiết trải nghiệm (chủ sở hữu)</div>
          <h1 style={{ margin: '0.25rem 0 1rem' }}>{experience.name}</h1>
        </div>
        <Link href={`/provider/${params.providerId}/experiences`}>← Quay lại danh sách</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: '#fafaf9', padding: '1rem', marginBottom: '1.5rem' }}>
        <div><div style={{ fontSize: '0.75rem', color: '#78716c' }}>Thời lượng</div><strong>{experience.duration_minutes} phút</strong></div>
        <div><div style={{ fontSize: '0.75rem', color: '#78716c' }}>Giá / người</div><strong>{experience.price_per_person.toLocaleString('vi-VN')} ₫</strong></div>
        <div><div style={{ fontSize: '0.75rem', color: '#78716c' }}>Sức chứa</div><strong>{experience.max_participants} người</strong></div>
      </div>

      <p style={{ lineHeight: 1.6 }}>{experience.description}</p>

      <h2 style={{ fontSize: '0.9rem', textTransform: 'uppercase' }}>Bộ sưu tập hình ảnh ({images.length})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        {images.map((image, index) => (
          <button
            key={image.file_id}
            type="button"
            aria-label={`Mở ảnh ${index + 1}: ${image.file_name}`}
            onClick={() => setLightbox(openLightbox(images.length, index))}
            style={{ border: '1px solid #d6d3d1', padding: 0, cursor: 'pointer', background: 'none' }}
          >
            <Placeholder image={image} />
          </button>
        ))}
      </div>

      {lightbox.open && current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Ảnh ${lightbox.index + 1} / ${lightbox.count}`}
          onClick={() => setLightbox(closeLightbox)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', zIndex: 50 }}
        >
          <div onClick={event => event.stopPropagation()}>
            <Placeholder image={current} large />
          </div>
          <div onClick={event => event.stopPropagation()} style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: '#ffffff' }}>
            <button type="button" style={button} onClick={() => setLightbox(previousImage)}>← Trước</button>
            <span data-testid="lightbox-position">{lightbox.index + 1} / {lightbox.count}</span>
            <button type="button" style={button} onClick={() => setLightbox(nextImage)}>Sau →</button>
            <button type="button" style={button} onClick={() => setLightbox(closeLightbox)}>Đóng</button>
          </div>
        </div>
      )}
    </main>
  )
}
