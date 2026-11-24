'use client'
// Screen 38: "Từ ngày / Đến ngày". Changing a date reloads the page with ?from=&to= (the server recalculates; no Apply button in the mockup).
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DateRange({ from, to }: { from: string; to: string }) {
  const router = useRouter(), path = usePathname()
  const [a, setA] = useState(from), [b, setB] = useState(to)
  function go(nextFrom: string, nextTo: string) { if (nextFrom && nextTo) router.replace(`${path}?from=${nextFrom}&to=${nextTo}`) }
  return <div className="av3-range">
    <label>Từ ngày<input type="date" value={a} max={b} onChange={e => { setA(e.target.value); go(e.target.value, b) }} /></label>
    <span aria-hidden="true" className="av3-cap" style={{ paddingBottom: 12 }}>–</span>
    <label>Đến ngày<input type="date" value={b} min={a} onChange={e => { setB(e.target.value); go(a, e.target.value) }} /></label>
  </div>
}
