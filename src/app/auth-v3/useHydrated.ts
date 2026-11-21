'use client'
import { useEffect, useState } from 'react'

/** False in the server HTML and until the client has hydrated. Submit buttons stay disabled until then, so no form can be sent as a plain GET/POST by the browser. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])
  return hydrated
}
