/**
 * Slice B (linh/prf-fixes-3) – BR-016: tapping a gallery image on EXP068 opens a lightbox with that
 * image, with navigation to the other images of the same gallery. Written before src/lib/prf/lightbox.ts.
 */
import { describe, expect, it } from 'vitest'
import { closeLightbox, nextImage, openLightbox, previousImage } from '@/lib/prf/lightbox'

describe('Slice B | lightboxState (BR-016)', () => {
  it('opens on the tapped image', () => {
    expect(openLightbox(3, 1)).toEqual({ open: true, index: 1, count: 3 })
  })

  it('next and previous browse the same gallery and wrap around', () => {
    const state = openLightbox(3, 2)
    expect(nextImage(state).index).toBe(0)
    expect(previousImage(openLightbox(3, 0)).index).toBe(2)
    expect(nextImage(openLightbox(3, 0)).index).toBe(1)
  })

  it('closing keeps nothing open; next on a closed lightbox does nothing', () => {
    const closed = closeLightbox(openLightbox(3, 1))
    expect(closed.open).toBe(false)
    expect(nextImage(closed)).toEqual(closed)
  })

  it('an index outside the gallery is clamped', () => {
    expect(openLightbox(2, 5).index).toBe(1)
  })
})
