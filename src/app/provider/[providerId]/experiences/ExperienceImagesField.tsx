'use client'

// EXP069 / EXP070 image field (slice B). The Provider picks image files; the browser reads their
// type, size and dimensions and checks BR-008 before sending. Uploads use the private media endpoint;
// the API persists bytes privately and returns the durable media URL. Removing the last image of a category is disabled (BR-015).

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import {
  EXPERIENCE_IMAGE_CATEGORIES,
  canRemoveImage,
  imageMetadataError,
} from '@/lib/prf/experience-images'

export interface ExperienceImageItem {
  file_id?: string
  url?: string
  file_name: string
  category: string
  media_type: string
  file_size_bytes: number
  width_px: number
  height_px: number
  previewUrl?: string
}

/** API payload: kept images by file_id, new uploads with their metadata. */
export function toImagesPayload(images: ExperienceImageItem[]) {
  return images.map(image => image.file_id
    ? { file_id: image.file_id }
    : {
        url: image.url, file_name: image.file_name, category: image.category, media_type: image.media_type,
        file_size_bytes: image.file_size_bytes, width_px: image.width_px, height_px: image.height_px,
      })
}

async function readDimensions(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return size
}

const mb = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

export default function ExperienceImagesField({
  images,
  onChange,
  onBusyChange,
}: {
  images: ExperienceImageItem[]
  onChange: (images: ExperienceImageItem[]) => void
  onBusyChange?: (busy:boolean)=>void
}) {
  const params=useParams<{providerId:string}>()
  const [uploading,setUploading]=useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFile = async (category: string, file: File | undefined) => {
    if (!file) return
    setError(null)
    let dimensions = { width: 0, height: 0 }
    try {
      dimensions = await readDimensions(file)
    } catch {
      setError(`${file.name}: không đọc được ảnh (JPG/JPEG/PNG/WEBP).`)
      return
    }
    const item: ExperienceImageItem = {
      url: `upload://${crypto.randomUUID()}/${encodeURIComponent(file.name)}`,
      file_name: file.name,
      category,
      media_type: file.type,
      file_size_bytes: file.size,
      width_px: dimensions.width,
      height_px: dimensions.height,
    }
    const reason = imageMetadataError(item)
    if (reason) {
      setError(`${file.name}: ${reason}`)
      return
    }
    setUploading(true);onBusyChange?.(true)
    try {
      const form=new FormData(); form.set('file',file); form.set('provider_id',params.providerId)
      const response=await fetch('/api/prf/media',{method:'POST',body:form}); const data=await response.json()
      if(!response.ok)throw new Error(data.error)
      onChange([...images,{...data,file_id:undefined,category,previewUrl:data.url}])
    } catch(cause){setError(cause instanceof Error?cause.message:'Không thể tải ảnh.')} finally{setUploading(false);onBusyChange?.(false)}
  }

  const remove = (index: number) => {
    if (!canRemoveImage(images, index)) return
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
        JPG/JPEG/PNG/WEBP, tối đa 10 MB, tối thiểu 1280×720. Mỗi danh mục cần ít nhất một ảnh.
      </p>
      {error && <div role="alert" style={{ color: '#991b1b', fontSize: '0.8rem', fontWeight: 600 }}>{error}</div>}
      {EXPERIENCE_IMAGE_CATEGORIES.map(category => (
        <div key={category.value} className="prf-field-group">
          <label className="prf-label" htmlFor={`image-${category.value}`}>{category.label} *</label>
          {uploading && <p role="status">Đang tải ảnh…</p>}
          {images.map((image, index) => image.category !== category.value ? null : (
            <div key={image.file_id ?? image.url} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
              {(image.previewUrl || image.url?.startsWith('/api/prf/media/'))
                ? <img src={image.previewUrl || image.url} alt={image.file_name} style={{ width: 64, height: 36, objectFit: 'cover' }} />
                : <span aria-hidden style={{ width: 64, height: 36, background: '#f3f4f6', display: 'inline-block' }} />}
              <span>{image.file_name} · {image.width_px}×{image.height_px} · {mb(image.file_size_bytes)}</span>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={!canRemoveImage(images, index)}
                title={canRemoveImage(images, index) ? 'Xóa ảnh' : 'Không thể xóa ảnh cuối cùng của danh mục'}
                className="prf-btn prf-btn-outline"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
              >
                Xóa
              </button>
            </div>
          ))}
          <input
            id={`image-${category.value}`}
            disabled={uploading}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={e => { void addFile(category.value, e.target.files?.[0]); e.target.value = '' }}
            className="prf-input"
          />
        </div>
      ))}
    </div>
  )
}
