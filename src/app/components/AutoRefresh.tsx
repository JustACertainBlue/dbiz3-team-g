'use client'

import { useRouter } from 'next/navigation'
import { usePolling } from '@/lib/client/use-polling'

// #157: re-renders a server page (BKG138, SCH141) every 10 s while the tab is visible, so a
// Provider's change shows without a reload (spec-BKG FR-008). Client state such as form inputs stays.
export default function AutoRefresh() {
  const router = useRouter()
  usePolling(() => router.refresh())
  return null
}
