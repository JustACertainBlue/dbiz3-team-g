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
        throw new Error(data.error || 'Failed to delete experience')
      }
      router.push(`/provider/${params.providerId}/experiences`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4">
        <h1 className="text-lg font-bold text-red-600">Confirm Experience Deletion</h1>
        <p className="text-stone-600 text-sm">
          Are you sure you want to remove this cultural experience listing?
        </p>
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-900 space-y-1">
          <p className="font-semibold">Historical Integrity Rule (BR-019):</p>
          <p>• If active bookings exist: Action is blocked to protect confirmed tour itineraries.</p>
          <p>• If past bookings exist: Experience is archived to preserve historical transaction records.</p>
          <p>• If no prior bookings exist: Experience is permanently removed.</p>
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
            Cancel
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {deleting ? 'Processing...' : 'Confirm Deletion'}
          </button>
        </div>
      </div>
    </div>
  )
}
