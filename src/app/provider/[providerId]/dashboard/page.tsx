import { providerCompletion } from '@/lib/prf/provider-completion'
import Link from 'next/link'
import { sessionDisplayName } from '@/lib/auth/session'
import { currentServerSession } from '@/lib/auth/server-session'
import { canOpenCreateBooking } from '@/lib/booking/create-booking'
import { BOOKING_STATUSES, providerBookingSummary } from '@/lib/booking/list-bookings'
import { bookingDetailStyles } from '../bookings/[bookingId]/BookingDetailView'
import { demoRepository } from '@/lib/db/application-store'
import StatusBadge from '@/app/components/StatusBadge'

export const dynamic = 'force-dynamic'

// Screen DSH018 Local Provider Dashboard — only the "Own booking action summary" panel in this
// slice (#65). The profile, schedule and conversation panels come with their own modules.
export default async function ProviderDashboardPage({ params }: { params: { providerId: string } }) {
  const session = (await currentServerSession())
  if (!(await canOpenCreateBooking(session, params.providerId))) {
    return <main className="bkg-page bkg-state"><h1>Local Provider Dashboard</h1><p>Chỉ Local Provider sở hữu hồ sơ này mới xem được Dashboard.</p><Link href="/login">Đăng nhập</Link><style>{bookingDetailStyles}</style></main>
  }
  const summary = await providerBookingSummary(session)
  const repository = demoRepository()
  const profile = (await repository.find('provider_profiles', row => row.provider_id === params.providerId))
  const version=profile && (await repository.find('provider_profile_versions',row=>row.provider_id===params.providerId && row.version_no===profile.current_version_no))
  const certificate=(await repository.find('provider_version_documents',row=>row.provider_id===params.providerId && row.version_no===profile?.current_version_no && row.document_type==='Business Registration Certificate'))
  const completion=providerCompletion(version,Boolean(certificate))
  const review=(await repository.all('provider_verification_reviews')).filter(row=>row.provider_id===params.providerId && row.version_no===profile?.current_version_no).sort((a,b)=>b.reviewed_at.localeCompare(a.reviewed_at))[0]
  const currentStatus=profile?.published_version_no && profile.current_version_no!==profile.published_version_no?version?.version_status:profile?.verification_status
  const upcoming = (await repository.all('bookings')).filter(row => row.provider_id === params.providerId && ['On hold', 'Booked'].includes(row.status) && Date.parse(row.start_at) >= Date.now()).sort((a, b) => a.start_at.localeCompare(b.start_at)).slice(0, 3)
  const participants = (await repository.all('chat_participants')).filter(row => row.user_id === session.userId)
  const chats = (await repository.all('chat_sessions')).filter(row => row.provider_id === params.providerId && participants.some(participant => participant.chat_session_id === row.chat_session_id)).sort((a, b) => b.last_message_at.localeCompare(a.last_message_at)).slice(0, 3)
  return <main className="bkg-page provider-dashboard">
    <header><p>HANOI ARTISAN BRIDGE</p><h1>Tổng quan hoạt động</h1><span>{(await sessionDisplayName(session))}</span></header>
    <section className="bkg-panel" style={{ marginTop: 24 }}><h2>Hồ sơ xưởng</h2><p>Trạng thái thẩm định: {currentStatus ? <StatusBadge family="provider" status={currentStatus} /> : <strong>Chưa có hồ sơ</strong>}</p><p>Hoàn thiện hồ sơ: <strong>{completion.percentage}%</strong></p><progress aria-label="Mức độ hoàn thiện hồ sơ" value={completion.percentage} max={100}/>{completion.missing.length>0&&<p>Cần bổ sung: {completion.missing.join(", ")}.</p>}{review?.revision_comments&&<p><strong>Yêu cầu từ UBND:</strong> {review.revision_comments}</p>}{profile?.published_version_no && profile.current_version_no!==profile.published_version_no && <p>Phiên bản đã xác minh vẫn hiển thị công khai trong khi chờ duyệt bản sửa.</p>}<Link href={`/provider/${params.providerId}/edit`}>Cập nhật hồ sơ →</Link></section>
    <section className="bkg-panel" style={{ marginTop: 24 }}>
      <h2>Tổng quan booking</h2>
      <dl>
        {BOOKING_STATUSES.map(status => <div className="booking-metric" key={status}><dt><StatusBadge family="booking" status={status} /></dt><dd>{summary.status_counts[status]}</dd></div>)}
      </dl>
      <p><strong>⚑ {summary.requires_action_count} Booking cần xử lý</strong></p>
      <p className="bkg-actions"><Link className="bkg-link-btn" href={`/provider/${params.providerId}/bookings?date_from=&status=&date_to=&page=1`}>Xem tất cả booking</Link></p>
    </section>
    <section className="bkg-panel" style={{ marginTop: 24 }}><h2>Lịch đón đoàn sắp tới</h2>{upcoming.length ? upcoming.map(booking => <p key={booking.booking_id}><Link href={`/provider/${params.providerId}/bookings/${booking.booking_id}`}>{new Date(booking.start_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · {booking.group_size} khách · {booking.status}</Link></p>) : <p>Chưa có đoàn sắp tới. <Link href={`/provider/${params.providerId}/schedule`}>Xem lịch hoạt động</Link></p>}</section>
    <section className="bkg-panel" style={{ marginTop: 24 }}><h2>Hội thoại gần đây</h2>{chats.length ? (await Promise.all(chats.map(async chat => <p key={chat.chat_session_id}><Link href={`/messages?chat_session_id=${encodeURIComponent(chat.chat_session_id)}`}>{(await repository.find('agency_profiles', row => row.agency_id === chat.agency_id))?.company_name || 'Agency'} · {chat.status === 'Open' ? 'Đang trao đổi' : chat.status === 'Active' ? 'Đang trao đổi' : 'Đã đóng'} · {participants.find(row => row.chat_session_id === chat.chat_session_id)?.unread_count || '0'} tin chưa đọc</Link></p>))) : <p>Chưa có hội thoại.</p>}</section>
    <section className="provider-modules" aria-labelledby="provider-modules-title">
      <h2 id="provider-modules-title">Quản lý hoạt động của xưởng</h2>
      {/* screen-spec-DSH018 §3 #6–#10, in spec order (#128): PRF127 stays in the avatar menu ("My Business"). */}
      <div className="provider-module-grid">
        <Link href={`/provider/${params.providerId}/edit`}><strong>Chỉnh sửa hồ sơ</strong><span>Cập nhật thông tin và gửi lại nội dung cần xác minh.</span></Link>
        <Link href={`/provider/${params.providerId}/experiences`}><strong>Trải nghiệm</strong><span>Quản lý danh mục trải nghiệm đang cung cấp.</span></Link>
        <Link href={`/provider/${params.providerId}/bookings`}><strong>Đặt đoàn</strong><span>Theo dõi và xử lý các booking của xưởng.</span></Link>
        <Link href={`/provider/${params.providerId}/schedule`}><strong>Lịch hoạt động</strong><span>Xem lịch hoạt động và các khung giờ đã được giữ.</span></Link>
        <Link href="/messages"><strong>Hộp thư</strong><span>Trao đổi với các công ty du lịch.</span></Link>
      </div>
    </section>
    <style>{bookingDetailStyles}</style>
    <style dangerouslySetInnerHTML={{ __html: providerDashboardStyles }} />
  </main>
}

const providerDashboardStyles = `.provider-modules{margin-top:24px}.provider-modules h2{font:600 28px Georgia,serif;margin:0 0 16px}.provider-module-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.provider-module-grid a{display:flex;min-height:112px;flex-direction:column;gap:8px;padding:20px;border:1px solid #ddd6ca;border-radius:14px;background:#fff;color:#1e2f27;text-decoration:none;transition:transform .15s,border-color .15s}.provider-module-grid a:hover{transform:translateY(-2px);border-color:#9a4a2a}.provider-module-grid strong{font-size:17px}.provider-module-grid span{color:#66746d;line-height:1.5;font-size:13px}@media(max-width:850px){.provider-module-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.provider-module-grid{grid-template-columns:1fr}}`
