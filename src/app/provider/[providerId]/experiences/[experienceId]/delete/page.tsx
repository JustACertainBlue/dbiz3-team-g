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
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4">
        <h1 className="text-lg font-bold text-red-600">Xác nhận xóa trải nghiệm</h1>
        <p className="text-stone-600 text-sm">
          Bạn có chắc chắn muốn xóa trải nghiệm này?
        </p>
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-900 space-y-1">
          <p className="font-semibold">Quy tắc quản lý lịch sử (BR-019):</p>
          <p>• Nếu đang có lượt đặt tour: Thao tác sẽ bị chặn để bảo vệ quyền lợi du khách.</p>
          <p>• Nếu có lượt đặt trong quá khứ: Trải nghiệm sẽ được lưu trữ (archive), không xóa hoàn toàn.</p>
          <p>• Nếu chưa từng có lượt đặt: Trải nghiệm sẽ được xóa vĩnh viễn.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href={`/provider/${params.providerId}/experiences`}
            className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg text-sm font-medium"
          >
            Hủy bỏ
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {deleting ? 'Đang xử lý...' : 'Xác nhận xóa'}
          </button>
        </div>
      </div>
    </div>
  )
}
