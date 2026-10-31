import Link from 'next/link'
import { Fragment } from 'react'
import { cookies } from 'next/headers'
import { DEMO_SESSION_COOKIE, demoSessionFor } from '@/lib/auth/demo-session'
import { canOpenCreateBooking } from '@/lib/booking/create-booking'
import { BOOKING_STATUSES, providerBookingSummary } from '@/lib/booking/list-bookings'
import { bookingDetailStyles } from '../bookings/[bookingId]/BookingDetailView'

export const dynamic = 'force-dynamic'

// Screen DSH018 Local Provider Dashboard — only the "Own booking action summary" panel in this
// slice (#65). The profile, schedule and conversation panels come with their own modules.
export default async function ProviderDashboardPage({ params }: { params: { providerId: string } }) {
  const session = demoSessionFor(cookies().get(DEMO_SESSION_COOKIE)?.value)
  if (!canOpenCreateBooking(session, params.providerId)) {
    return <main className="bkg-page bkg-state"><h1>Local Provider Dashboard</h1><p>Chỉ Local Provider sở hữu hồ sơ này mới xem được Dashboard.</p><Link href="/login">Chọn tài khoản demo</Link><style>{bookingDetailStyles}</style></main>
  }
  const summary = await providerBookingSummary(session)
  return <main className="bkg-page">
    <header><p>HANOI ARTISAN BRIDGE · DSH018</p><h1>Local Provider Dashboard</h1><span>{session.displayName}</span></header>
    <section className="bkg-panel" style={{ marginTop: 24 }}>
      <h2>Own booking action summary</h2>
      <dl>
        {BOOKING_STATUSES.map(status => <Fragment key={status}><dt>{status}</dt><dd>{summary.status_counts[status]}</dd></Fragment>)}
      </dl>
      <p><strong>⚑ {summary.requires_action_count} Booking cần xử lý</strong></p>
      <p className="bkg-actions"><Link className="bkg-link-btn" href={`/provider/${params.providerId}/bookings`}>Bookings</Link></p>
    </section>
    <style>{bookingDetailStyles}</style>
  </main>
}
