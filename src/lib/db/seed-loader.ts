

import { demoRepository } from '@/lib/db/application-store'

export interface Village {
  village_id: string
  village_name: string
  name: string
  district: string
  city_province: string
  is_active: boolean
}

export interface Experience {
  experience_id: string
  provider_id: string
  village_id?: string
  village_name?: string
  name: string
  experience_name?: string
  provider_name?: string
  description: string
  category: string
  experience_type?: string
  craft_type?: string
  duration_minutes: number
  price_per_person: number
  max_participants: number
  notice_period_hours: number
  experience_location_address: string
  provider_verification_status: string
  has_published_profile_version: boolean
  location?: { lat: number; lng: number }
  distance_km?: number
  travel_time_minutes?: number
  provider_quality_rating?: number
}



export async function loadVillages(): Promise<Village[]> {
  const rows = (await demoRepository().all('villages'))


  return rows.map(row => ({
    village_id: row.village_id,
    village_name: row.name,
    name: row.name,
    district: row.district,
    city_province: row.city_province,
    is_active: row.is_active === 'true',
  }))
}

export async function loadExperiences(): Promise<Experience[]> {
  const repository = demoRepository()
  const expRows = (await repository.all('experiences'))
  const providerRows = (await repository.all('provider_profiles'))
  const providerVersions = (await repository.all('provider_profile_versions'))
  const providersMap = new Map(providerRows.map(row => [row.provider_id, row]))

  const experiences: Experience[] = []

  for (const row of expRows) {
    if (row.archived_at) continue

    const prov = providersMap.get(row.provider_id)
    const isVerified = prov?.verification_status === 'Verified' && Boolean(prov?.published_version_no)

    // For general AI matching seed catalog, return verified active experiences
    if (isVerified) {
      const publishedVersion = providerVersions.find(version => version.provider_id === row.provider_id && version.version_no === prov?.published_version_no)
      experiences.push({
        experience_id: row.experience_id,
        provider_id: row.provider_id,
        name: row.name,
        experience_name: row.name,
        provider_name: publishedVersion?.business_name,
        craft_type: publishedVersion?.craft_type || undefined,
        village_id: prov?.village_id,
        description: row.description,
        category: row.category,
        experience_type: row.category,
        duration_minutes: parseInt(row.duration_minutes || '60', 10),
        price_per_person: parseFloat(row.price_per_person || '0'),
        max_participants: parseInt(row.max_participants || '20', 10),
        notice_period_hours: parseInt(row.notice_period_hours || '24', 10),
        experience_location_address: row.experience_location_address,
        provider_verification_status: 'Approved',
        has_published_profile_version: true,
        location: { lat: 20.9994, lng: 105.8888 },
        distance_km: 12,
        travel_time_minutes: 30,
        provider_quality_rating: 0.95,
      })
    }
  }

  return experiences
}

export interface SeedBooking {
  booking_id: string
  agency_id: string
  provider_id: string
  experience_id: string
  source_chat_session_id?: string
  start_at: string
  duration_minutes: number
  group_size: number
  agreed_price_total: number
  status: 'On hold' | 'Booked' | 'Completed' | 'Cancelled'
  created_at: string
  updated_at?: string
  hold_expires_at?: string
  end_at?: string
  arrival_at?: string
}

export interface SeedAgency {
  agency_id: string
  user_id: string
  company_name: string
  company_type?: string
  account_status: string
  created_at: string
}

export interface SeedProvider {
  provider_id: string
  user_id: string
  village_id: string
  verification_status: string
  business_name: string
  craft_type: string
  account_status: string
  created_at: string
}

export interface SeedQuoteRequest {
  quote_request_id: string
  agency_id: string
  experience_id: string
  created_at: string
}

export interface SeedChatSession {
  chat_session_id: string
  agency_id: string
  provider_id: string
  created_at: string
}

// ADM079 loaders read the shared PostgreSQL store, so Bookings, Quote
// Requests and Chats written by BKG, AIT and EXP are visible to the dashboard (A1, BR-007).
export async function loadBookings(): Promise<SeedBooking[]> {
  return (await demoRepository().all('bookings')).map(r => ({
    booking_id: r.booking_id,
    agency_id: r.agency_id,
    provider_id: r.provider_id,
    experience_id: r.experience_id,
    source_chat_session_id: r.source_chat_session_id,
    start_at: r.start_at,
    duration_minutes: parseInt(String(r.duration_minutes || '60'), 10),
    group_size: parseInt(String(r.group_size || '1'), 10),
    agreed_price_total: parseFloat(String(r.agreed_price_total || '0')),
    status: r.status as SeedBooking['status'],
    created_at: r.created_at,
    updated_at: r.updated_at,
    hold_expires_at: r.hold_expires_at,
    end_at: r.end_at,
    arrival_at: r.arrival_at,
  }))
}

export interface SeedBookingStatusHistory {
  booking_id: string
  from_status: string
  to_status: string
  changed_at: string
}

export async function loadBookingStatusHistory(): Promise<SeedBookingStatusHistory[]> {
  return (await demoRepository().all('booking_status_history')).map(r => ({
    booking_id: r.booking_id,
    from_status: r.from_status,
    to_status: r.to_status,
    changed_at: r.changed_at,
  }))
}

async function userStatuses(): Promise<Map<string, string>> {
  return new Map((await demoRepository().all('user_accounts')).map(u => [u.user_id, u.account_status]))
}

export async function loadAgencies(): Promise<SeedAgency[]> {
  const statuses = (await userStatuses())
  return (await demoRepository().all('agency_profiles')).map(r => ({
    agency_id: r.agency_id,
    user_id: r.user_id,
    company_name: r.company_name,
    company_type: r.company_type,
    account_status: statuses.get(r.user_id) || 'Approved',
    created_at: r.created_at,
  }))
}

export async function loadProviders(): Promise<SeedProvider[]> {
  const repository = demoRepository()
  const versionsMap = new Map<string, { business_name: string; craft_type: string }>()
  for (const v of (await repository.all('provider_profile_versions'))) {
    if (!versionsMap.has(v.provider_id) || v.version_status === 'Verified') {
      versionsMap.set(v.provider_id, { business_name: v.business_name, craft_type: v.craft_type })
    }
  }
  const statuses = (await userStatuses())

  return (await repository.all('provider_profiles')).map(r => {
    const ver = versionsMap.get(r.provider_id)
    return {
      provider_id: r.provider_id,
      user_id: r.user_id,
      village_id: r.village_id,
      verification_status: r.verification_status,
      business_name: ver?.business_name || r.provider_id,
      craft_type: ver?.craft_type || '',
      account_status: statuses.get(r.user_id) === 'Disabled' ? 'Disabled' : 'Active',
      created_at: r.created_at,
    }
  })
}

// Quote Request → Provider: a Quote Request belongs to the Provider of its Experience (spec-ADM #22).
export async function loadExperienceProviderMap(): Promise<Map<string, string>> {
  return new Map((await demoRepository().all('experiences')).map(e => [e.experience_id, e.provider_id]))
}

export async function loadQuoteRequests(): Promise<SeedQuoteRequest[]> {
  return (await demoRepository().all('quote_requests')).map(r => ({
    quote_request_id: r.quote_request_id,
    agency_id: r.agency_id,
    experience_id: r.experience_id,
    created_at: r.created_at,
  }))
}

export async function loadChatSessions(): Promise<SeedChatSession[]> {
  return (await demoRepository().all('chat_sessions')).map(r => ({
    chat_session_id: r.chat_session_id,
    agency_id: r.agency_id,
    provider_id: r.provider_id,
    created_at: r.started_at || r.created_at,
  }))
}
