// ADM079 overview, mockup v3 screen 38 (png/38): the numbers behind the cards, the monthly booking chart, the
// chat-to-completion funnel and the two top-five lists. Pure functions over rows the page already loaded; scope
// (HDT = whole city, UBND = one village) is applied here by `villageId`, never trusted from the client.
import { hanoiDate } from '@/lib/time/hanoi-time'

export type OverviewStatus = 'Completed' | 'Booked' | 'On hold' | 'Cancelled'
export const STATUS_ORDER: OverviewStatus[] = ['Completed', 'Booked', 'On hold', 'Cancelled']

export interface OverviewProvider { provider_id: string; business_name: string; village_id: string; account_status: string; review_status: string }
export interface OverviewAgency { agency_id: string; company_name: string; account_status: string }
export interface OverviewBooking { booking_id: string; provider_id: string; agency_id: string; status: string; created_at: string; group_size: number; source_chat_session_id?: string; agreed_price_total: number }
export interface OverviewStatusChange { booking_id: string; to_status: string; changed_at: string }
export interface OverviewChat { chat_session_id: string; agency_id: string; provider_id: string; created_at: string }

export interface OverviewInput {
  /** null = the whole city (HDT). */
  villageId: string | null
  /** Hanoi dates, YYYY-MM-DD, both included. */
  from: string
  to: string
  today: string
  providers: OverviewProvider[]
  agencies: OverviewAgency[]
  bookings: OverviewBooking[]
  chats: OverviewChat[]
  history: OverviewStatusChange[]
}

export interface MonthBucket { key: string; label: string }
export interface MonthStack extends MonthBucket { counts: Record<OverviewStatus, number>; total: number }
export interface RankRow { id: string; name: string; bookings: number; guests: number }

export function monthRange(from: string, to: string): MonthBucket[] {
  const out: MonthBucket[] = []
  let year = Number(from.slice(0, 4)), month = Number(from.slice(5, 7))
  const endKey = to.slice(0, 7)
  for (let guard = 0; guard < 120; guard++) {
    const key = `${year}-${String(month).padStart(2, '0')}`
    if (key > endKey) break
    out.push({ key, label: `T${month}` })
    if (++month > 12) { month = 1; year++ }
  }
  return out
}

const inRange = (iso: string, from: string, to: string) => { const d = hanoiDate(iso); return d !== '' && d >= from && d <= to }

function top(rows: Map<string, RankRow>): RankRow[] {
  return [...rows.values()].sort((a, b) => b.bookings - a.bookings || b.guests - a.guests || a.name.localeCompare(b.name, 'vi')).slice(0, 5)
}

export function buildOverview(input: OverviewInput) {
  const { villageId, from, to, today } = input
  const providers = villageId ? input.providers.filter(p => p.village_id === villageId) : input.providers
  const providerIds = new Set(providers.map(p => p.provider_id))
  const bookingsAll = villageId ? input.bookings.filter(b => providerIds.has(b.provider_id)) : input.bookings
  const chatsAll = villageId ? input.chats.filter(c => providerIds.has(c.provider_id)) : input.chats

  // An Agency belongs to a village scope when it has a Booking or Chat with a Provider there (same rule as ADM079 #22).
  let agencies = input.agencies
  if (villageId) {
    const relevant = new Set([...bookingsAll.map(b => b.agency_id), ...chatsAll.map(c => c.agency_id)])
    agencies = agencies.filter(a => relevant.has(a.agency_id))
  }

  const bookings = bookingsAll.filter(b => inRange(b.created_at, from, to))
  const chats = chatsAll.filter(c => inRange(c.created_at, from, to))

  const monthly: MonthStack[] = monthRange(from, to).map(m => ({ ...m, counts: { Completed: 0, Booked: 0, 'On hold': 0, Cancelled: 0 }, total: 0 }))
  for (const b of bookings) {
    const slot = monthly.find(m => m.key === hanoiDate(b.created_at).slice(0, 7))
    if (!slot || !(STATUS_ORDER as string[]).includes(b.status)) continue
    slot.counts[b.status as OverviewStatus]++; slot.total++
  }

  const chatIds = new Set(chats.map(c => c.chat_session_id))
  const fromChat = bookings.filter(b => b.source_chat_session_id && chatIds.has(b.source_chat_session_id))
  const chatsWithBooking = new Set(fromChat.map(b => b.source_chat_session_id)).size
  const paid = fromChat.filter(b => b.status === 'Booked' || b.status === 'Completed')
  const completed = fromChat.filter(b => b.status === 'Completed')
  const funnel = {
    chats: chats.length,
    withBooking: chatsWithBooking,
    paid: new Set(paid.map(b => b.source_chat_session_id)).size,
    completed: new Set(completed.map(b => b.source_chat_session_id)).size,
    bookingsPer100Chats: chats.length === 0 ? 0 : Math.round((chatsWithBooking / chats.length) * 100),
  }

  const byProvider = new Map<string, RankRow>(), byAgency = new Map<string, RankRow>()
  for (const b of bookings) {
    if (b.status === 'Cancelled') continue
    const p = providers.find(x => x.provider_id === b.provider_id), a = agencies.find(x => x.agency_id === b.agency_id) ?? input.agencies.find(x => x.agency_id === b.agency_id)
    if (p) { const r = byProvider.get(p.provider_id) ?? { id: p.provider_id, name: p.business_name, bookings: 0, guests: 0 }; r.bookings++; r.guests += b.group_size; byProvider.set(p.provider_id, r) }
    if (a) { const r = byAgency.get(a.agency_id) ?? { id: a.agency_id, name: a.company_name, bookings: 0, guests: 0 }; r.bookings++; r.guests += b.group_size; byAgency.set(a.agency_id, r) }
  }

  // Card "Giao dịch T<m>/<year>": bookings now Booked whose latest move to Booked falls in the month of the end date.
  const txMonth = to.slice(0, 7)
  const bookedAt = new Map<string, string>()
  for (const change of input.history) {
    if (change.to_status !== 'Booked') continue
    const day = hanoiDate(change.changed_at)
    if (day && day > (bookedAt.get(change.booking_id) ?? '')) bookedAt.set(change.booking_id, day)
  }
  const paidInMonth = bookingsAll.filter(b => b.status === 'Booked' && (bookedAt.get(b.booking_id) ?? '').slice(0, 7) === txMonth)
  const transactions = { year: Number(txMonth.slice(0, 4)), month: Number(txMonth.slice(5, 7)), count: paidInMonth.length, total: paidInMonth.reduce((sum, b) => sum + b.agreed_price_total, 0) }

  const month = today.slice(0, 7)
  return {
    cards: {
      agencies: { total: agencies.length, pending: agencies.filter(a => a.account_status === 'Pending Approval').length },
      providers: {
        total: providers.length,
        active: providers.filter(p => p.account_status === 'Active' && p.review_status !== 'Pending Verification').length,
        pending: providers.filter(p => p.review_status === 'Pending Verification').length,
      },
      bookingsThisMonth: bookingsAll.filter(b => hanoiDate(b.created_at).slice(0, 7) === month).length,
      monthNumber: Number(month.slice(5, 7)),
    },
    monthly,
    funnel,
    transactions,
    topProviders: top(byProvider),
    topAgencies: top(byAgency),
  }
}
