'use client'
// False while the server HTML is on screen, true once React has taken over. Submit buttons wait for it, so a native submit
// (a click or Enter) can never reach the browser's own form handling before onSubmit exists.
import { useEffect, useState } from 'react'

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])
  return hydrated
}
