'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentRole } from '@/lib/prf/client-session'

export default function HomePage() {
  const router = useRouter()
  const villageId = '20896522-6235-5699-aeaf-f48b8150d895'

  useEffect(() => {
    const role = getCurrentRole()
    if (role === 'LocalProvider' || role === 'UBND') {
      router.replace(`/village/${villageId}`)
    } else {
      router.replace('/explore')
    }
  }, [router])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '80vh', fontFamily: 'sans-serif', color: '#6b7280', fontSize: '0.9rem',
    }}>
      Đang chuyển tiếp vào màn hình chính của vai trò...
    </div>
  )
}
