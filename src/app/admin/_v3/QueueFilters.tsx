'use client'
// Screen 41 filter bar: search, kind and sort write to the URL (?q=&kind=&sort=); the server re-renders the list.
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Select } from '@/app/components/ui'

export default function QueueFilters({ showKind }: { showKind: boolean }) {
  const router = useRouter(), path = usePathname(), params = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const timer = useRef<ReturnType<typeof setTimeout>>()
  function push(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(next)) { if (v) sp.set(k, v); else sp.delete(k) }
    sp.delete('page')
    router.replace(`${path}${sp.toString() ? `?${sp}` : ''}`)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  return <section className={`av3-card av3-filters ${showKind ? 'av3-filters--3' : 'av3-filters--2'}`} aria-label="Bộ lọc hồ sơ" style={{ padding: 24 }}>
    <label className="av3-field">Tìm<input type="search" placeholder="Tên công ty hoặc xưởng" value={q} onChange={e => { setQ(e.target.value); clearTimeout(timer.current); const v = e.target.value; timer.current = setTimeout(() => push({ q: v }), 350) }} /></label>
    {showKind && <label className="av3-field">Loại hồ sơ<Select value={params.get('kind') ?? ''} onChange={e => push({ kind: e.target.value })}><option value="">Tất cả</option><option value="registration">Đăng ký mới</option><option value="change">Đổi thông tin pháp lý</option><option value="workshop">Xác minh xưởng</option></Select></label>}
    <label className="av3-field">Sắp xếp<Select value={params.get('sort') ?? 'oldest'} onChange={e => push({ sort: e.target.value === 'oldest' ? '' : e.target.value })}><option value="oldest">Gửi sớm nhất trước</option><option value="newest">Gửi mới nhất trước</option></Select></label>
  </section>
}
