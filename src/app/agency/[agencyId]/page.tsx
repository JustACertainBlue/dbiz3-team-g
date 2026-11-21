'use client'

// Screen 28 (mockup v3 png/28): company profile. Same data as before (GET /api/prf/agency/[agencyId]).
// The old page showed invented figures (licence number, "13+ years", client demographics); the mockup has none of them, so they are gone.
import React, { useEffect, useState } from 'react'
import CompanyProfileView, { type AgencyData } from '../../auth-v3/CompanyProfileView'
import '../../auth-v3/auth-v3.css'

export default function AgencyProfilePage({ params }: { params: { agencyId: string } }) {
  const [agency, setAgency] = useState<AgencyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/prf/agency/${params.agencyId}`)
        if (res.ok) setAgency(await res.json())
      } catch {
        // shows the empty state below
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.agencyId])

  if (loading) return <main className="av3-page"><p>Đang tải hồ sơ công ty…</p></main>
  if (!agency) return <main className="av3-page"><h1 className="av3-h1">Hồ sơ công ty</h1><p className="av3-lead">Không tìm thấy hồ sơ công ty này.</p></main>
  return <CompanyProfileView agency={agency} agencyId={params.agencyId} />
}
