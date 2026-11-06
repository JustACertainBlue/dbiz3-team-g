'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DeleteExperiencePage({
  params,
}: {
  params: { providerId: string; experienceId: string }
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/prf/experience/${params.experienceId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi xóa trải nghiệm')
      }
      router.push(`/provider/${params.providerId}/experiences`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="delete-page">
      <div className="delete-part">
        <h1 className="delete-part">Xóa hoặc lưu trữ trải nghiệm</h1>
        <p className="delete-part">
          Bạn có chắc chắn muốn xóa trải nghiệm này?
        </p>
        <div className="delete-part">
          <p className="delete-part">Điều gì sẽ xảy ra?</p>
          <p>• Nếu đang có lượt đặt tour: Thao tác sẽ bị chặn để bảo vệ quyền lợi du khách.</p>
          <p>• Nếu có lượt đặt trong quá khứ: Trải nghiệm sẽ được lưu trữ (archive), không xóa hoàn toàn.</p>
          <p>• Nếu chưa từng có lượt đặt: Trải nghiệm sẽ được xóa vĩnh viễn.</p>
        </div>

        {error && (
          <div className="delete-part">
            {error}
          </div>
        )}

        <div className="delete-part">
          <Link
            href={`/provider/${params.providerId}/experiences`}
            className="delete-part"
          >
            Hủy bỏ
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="delete-part"
          >
            {deleting ? 'Đang xử lý...' : 'Xác nhận xóa'}
          </button>
        </div>
      </div>
      <style jsx>{`.delete-page{max-width:620px;margin:40px auto;padding:30px;background:#fffdf8;border:1px solid #ded8cb;border-radius:18px;color:#203229}.delete-page h1{font:700 30px Georgia,serif;margin-bottom:18px}.delete-page p{margin:12px 0;line-height:1.7}.delete-page button{padding:12px 18px;border:0;border-radius:9px;background:#9d3126;color:white;font:inherit;cursor:pointer}.delete-page button:disabled{opacity:.5}.delete-page a{margin-right:18px;color:#203229}.delete-page [role=alert]{color:#a51f30}@media(max-width:660px){.delete-page{margin:20px 14px;padding:22px}}`}</style>
    </div>
  )
}
