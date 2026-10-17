'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface ExperienceDetail {
  experience_id: string
  name: string
  category: string
  description: string
  duration_minutes: number
  price_per_person: number
  max_participants: number
}

export default function ExperienceDetailPage({
  params,
}: {
  params: { providerId: string; experienceId: string }
}) {
  const [experience, setExperience] = useState<ExperienceDetail | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/prf/experience/${params.experienceId}`)
        if (res.ok) {
          const data = await res.json()
          setExperience(data)
        }
      } catch {
        // default
      }
    }
    load()
  }, [params.experienceId])

  const sampleImages = [
    { url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261', label: 'Nghệ nhân đang làm việc' },
    { url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61', label: 'Không gian trải nghiệm' },
    { url: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa', label: 'Sản phẩm hoàn thiện' },
  ]

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-amber-900 text-white p-6 sm:p-8 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase bg-amber-800 text-amber-200 px-2 py-0.5 rounded-full font-semibold">
              Chi tiết trải nghiệm (Chủ sở hữu)
            </span>
            <h1 className="text-2xl font-serif font-bold mt-2">
              {experience?.name || 'Nặn gốm Bát Tràng'}
            </h1>
          </div>
          <Link
            href={`/provider/${params.providerId}/experiences`}
            className="text-xs text-amber-200 hover:text-white underline"
          >
            ← Quay lại danh sách
          </Link>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-3 gap-4 bg-stone-50 p-4 rounded-xl text-center">
            <div>
              <span className="text-xs text-stone-500 block">Thời lượng</span>
              <span className="font-bold text-stone-800">{experience?.duration_minutes || 90} phút</span>
            </div>
            <div>
              <span className="text-xs text-stone-500 block">Giá / người</span>
              <span className="font-bold text-amber-900">
                {(experience?.price_per_person || 150000).toLocaleString('vi-VN')} VND
              </span>
            </div>
            <div>
              <span className="text-xs text-stone-500 block">Sức chứa</span>
              <span className="font-bold text-stone-800">{experience?.max_participants || 12} người</span>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-stone-700 uppercase mb-2">Bộ sưu tập hình ảnh (BR-016 Lightbox)</h2>
            <div className="grid grid-cols-3 gap-3">
              {sampleImages.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedImage(img.url)}
                  className="cursor-pointer group relative aspect-video bg-stone-100 rounded-lg overflow-hidden border border-stone-200 hover:opacity-90 transition"
                >
                  <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] p-1 truncate text-center">
                    {img.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {selectedImage && (
            <div
              onClick={() => setSelectedImage(null)}
              className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 cursor-pointer"
            >
              <img src={selectedImage} alt="Enlarged" className="max-w-full max-h-[80vh] rounded-lg shadow-2xl" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
