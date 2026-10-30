import type { ActorSession } from '../auth/demo-session'
import { demoRepository } from '../demo/json-repository'
import type { DemoRow } from '../demo/types'
import { BookingError } from './create-booking'

export type BookingView = 'provider' | 'agency'

// Loads a Booking for its owning Local Provider (full view) or owning Tour Agency (read-only view).
// Everyone else is denied: BR-001, BR-002, BR-008, BR-014. Seed role_permissions are not consulted (OQ #33).
export function loadBookingForActor(session: ActorSession, bookingId: string): { booking: DemoRow; view: BookingView } {
  const booking = demoRepository().find('bookings', row => row.booking_id === bookingId)
  if (!booking) throw new BookingError('NOT_FOUND', 'Booking not found')
  if (session.authenticated && session.role === 'LocalProvider' && session.providerId === booking.provider_id) {
    return { booking, view: 'provider' }
  }
  if (session.authenticated && session.role === 'TourAgency' && session.agencyId === booking.agency_id) {
    return { booking, view: 'agency' }
  }
  throw new BookingError('FORBIDDEN', 'Only the Local Provider or Tour Agency of this Booking can open it')
}

// Page gate for BKG135/BKG144/BKG136: the owning Local Provider on its own URL.
export function canManageBooking(session: ActorSession, providerId: string, booking: DemoRow): boolean {
  return session.authenticated && session.role === 'LocalProvider' && session.providerId === providerId && booking.provider_id === providerId
}

// Page gate for BKG138: the owning Tour Agency on its own URL.
export function canViewAgencyBooking(session: ActorSession, agencyId: string, booking: DemoRow): boolean {
  return session.authenticated && session.role === 'TourAgency' && session.agencyId === agencyId && booking.agency_id === agencyId
}

// F-SCHED-10: the list is always the session's own Provider (#67); naming another one is forbidden.
export function authorizeProviderList(session: ActorSession, requestedProviderId?: string | null): string {
  if (!session.authenticated || session.role !== 'LocalProvider' || !session.providerId) {
    throw new BookingError('FORBIDDEN', 'Only a Local Provider can list its Bookings')
  }
  if (requestedProviderId && requestedProviderId !== session.providerId) {
    throw new BookingError('FORBIDDEN', 'A Local Provider can list only its own Bookings')
  }
  return session.providerId
}
