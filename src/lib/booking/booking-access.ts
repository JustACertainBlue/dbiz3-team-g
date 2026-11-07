import { toSessionContext, type SessionLike } from '../auth/session'
import { demoRepository } from '../db/application-store'
import type { DemoRow } from '../demo/types'
import { BookingError } from './create-booking'

export type BookingView = 'provider' | 'agency'

// Loads a Booking for its owning Local Provider (full view) or owning Tour Agency (read-only view).
// Everyone else is denied: BR-001, BR-002, BR-008, BR-014. Seed role_permissions are not consulted (OQ #33).
export async function loadBookingForActor(session: SessionLike, bookingId: string): Promise<{ booking: DemoRow; view: BookingView }> {
  const actor = (await toSessionContext(session))
  const booking = (await demoRepository().find('bookings', row => row.booking_id === bookingId))
  if (!booking) throw new BookingError('NOT_FOUND', 'Booking not found')
  if (actor.authenticated && actor.role === 'Local_Provider' && actor.providerId === booking.provider_id) {
    return { booking, view: 'provider' }
  }
  if (actor.authenticated && actor.role === 'Tour_Agency' && actor.agencyId === booking.agency_id) {
    return { booking, view: 'agency' }
  }
  throw new BookingError('FORBIDDEN', 'Only the Local Provider or Tour Agency of this Booking can open it')
}

// Page gate for BKG135/BKG144/BKG136: the owning Local Provider on its own URL.
export async function canManageBooking(session: SessionLike, providerId: string, booking: DemoRow): Promise<boolean> {
  const actor = (await toSessionContext(session))
  return actor.authenticated && actor.role === 'Local_Provider' && actor.providerId === providerId && booking.provider_id === providerId
}

// Page gate for BKG138: the owning Tour Agency on its own URL.
export async function canViewAgencyBooking(session: SessionLike, agencyId: string, booking: DemoRow): Promise<boolean> {
  const actor = (await toSessionContext(session))
  return actor.authenticated && actor.role === 'Tour_Agency' && actor.agencyId === agencyId && booking.agency_id === agencyId
}

// F-SCHED-10: the list is always the session's own Provider (#67); naming another one is forbidden.
export async function authorizeProviderList(session: SessionLike, requestedProviderId?: string | null): Promise<string> {
  const actor = (await toSessionContext(session))
  if (!actor.authenticated || actor.role !== 'Local_Provider' || !actor.providerId) {
    throw new BookingError('FORBIDDEN', 'Only a Local Provider can list its Bookings')
  }
  if (requestedProviderId && requestedProviderId !== actor.providerId) {
    throw new BookingError('FORBIDDEN', 'A Local Provider can list only its own Bookings')
  }
  return actor.providerId
}

// F-SCHED-01 (#74, #24): the owning Local Provider gets the owner view; an authenticated Tour Agency
// gets the public view of a Verified Provider. An unknown or non-Verified Provider is not found.
export async function authorizeProviderSchedule(session: SessionLike, providerId: string): Promise<'owner' | 'public'> {
  const actor = (await toSessionContext(session))
  if (actor.authenticated && actor.role === 'Local_Provider' && actor.providerId === providerId) return 'owner'
  if (actor.authenticated && actor.role === 'Tour_Agency') {
    const provider = (await demoRepository().find('provider_profiles', row => row.provider_id === providerId))
    if (!provider || provider.verification_status !== 'Verified') throw new BookingError('NOT_FOUND', 'Provider not found')
    return 'public'
  }
  throw new BookingError('FORBIDDEN', 'Only the Local Provider or a Tour Agency can open this schedule')
}

// F-SCHED-02 (#33, BR-002, BR-008): a Tour Agency reads only its own Bookings.
export async function authorizeAgencyList(session: SessionLike): Promise<string> {
  const actor = (await toSessionContext(session))
  if (!actor.authenticated || actor.role !== 'Tour_Agency' || !actor.agencyId) {
    throw new BookingError('FORBIDDEN', 'Only a Tour Agency can list its Bookings')
  }
  return actor.agencyId
}
