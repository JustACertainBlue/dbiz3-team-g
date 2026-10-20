import fs from 'node:fs'
import path from 'node:path'

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

function parseCsv(content: string): Array<Record<string, string>> {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length === 0) return []

  const parseRow = (row: string): string[] => {
    const entries: string[] = []
    let current = ''
    let insideQuote = false

    for (let i = 0; i < row.length; i++) {
      const char = row[i]
      if (char === '"') {
        if (insideQuote && row[i + 1] === '"') {
          current += '"'
          i++
        } else {
          insideQuote = !insideQuote
        }
      } else if (char === ',' && !insideQuote) {
        entries.push(current)
        current = ''
      } else {
        current += char
      }
    }
    entries.push(current)
    return entries
  }

  const headers = parseRow(lines[0])
  const results: Array<Record<string, string>> = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] !== undefined ? values[index].trim() : ''
    })
    results.push(row)
  }

  return results
}

/** Fallback used only when data/seed/villages.csv is absent (e.g. CI without data package). */
const CANONICAL_VILLAGES: Village[] = [
  {
    village_id: '20896522-6235-5699-aeaf-f48b8150d895',
    village_name: 'Bát Tràng',
    name: 'Bát Tràng',
    district: 'Gia Lâm',
    city_province: 'Hà Nội',
    is_active: true,
  },
  {
    village_id: 'c0d0d95f-d59c-5c35-946a-f397e380dd14',
    village_name: 'Vạn Phúc',
    name: 'Vạn Phúc',
    district: 'Hà Đông',
    city_province: 'Hà Nội',
    is_active: true,
  },
  {
    village_id: '688d408b-9d98-5b66-bfa7-659a67462108',
    village_name: 'Chuông',
    name: 'Chuông',
    district: 'Thanh Oai',
    city_province: 'Hà Nội',
    is_active: true,
  },
  {
    village_id: 'b1017646-ec89-58d1-aaa9-df783b1c2506',
    village_name: 'Quất Động',
    name: 'Quất Động',
    district: 'Thường Tín',
    city_province: 'Hà Nội',
    is_active: true,
  },
]

export async function loadVillages(): Promise<Village[]> {
  const seedPath = path.join(process.cwd(), 'data', 'seed', 'villages.csv')
  if (!fs.existsSync(seedPath)) {
    return CANONICAL_VILLAGES
  }

  const csv = fs.readFileSync(seedPath, 'utf-8')
  const rows = parseCsv(csv)

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
  const expPath = path.join(process.cwd(), 'data', 'seed', 'experiences.csv')
  const provPath = path.join(process.cwd(), 'data', 'seed', 'provider_profiles.csv')

  if (!fs.existsSync(expPath)) {
    return []
  }

  const expCsv = fs.readFileSync(expPath, 'utf-8')
  const expRows = parseCsv(expCsv)

  const providersMap = new Map<string, { status: string; publishedVersion: string }>()
  if (fs.existsSync(provPath)) {
    const provCsv = fs.readFileSync(provPath, 'utf-8')
    const provRows = parseCsv(provCsv)
    for (const p of provRows) {
      providersMap.set(p.provider_id, {
        status: p.verification_status,
        publishedVersion: p.published_version_no,
      })
    }
  }

  const experiences: Experience[] = []

  for (const row of expRows) {
    if (row.archived_at) continue

    const prov = providersMap.get(row.provider_id)
    const isVerified = prov?.status === 'Verified' && !!prov?.publishedVersion

    // For general AI matching seed catalog, return verified active experiences
    if (isVerified) {
      experiences.push({
        experience_id: row.experience_id,
        provider_id: row.provider_id,
        name: row.name,
        experience_name: row.name,
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
}

export interface SeedProvider {
  provider_id: string
  user_id: string
  village_id: string
  verification_status: string
  business_name: string
  craft_type: string
  account_status: string
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

export async function loadBookings(): Promise<SeedBooking[]> {
  const filePath = path.join(process.cwd(), 'data', 'seed', 'bookings.csv')
  if (!fs.existsSync(filePath)) return []

  const csv = fs.readFileSync(filePath, 'utf-8')
  const rows = parseCsv(csv)

  return rows.map(r => ({
    booking_id: r.booking_id,
    agency_id: r.agency_id,
    provider_id: r.provider_id,
    experience_id: r.experience_id,
    source_chat_session_id: r.source_chat_session_id,
    start_at: r.start_at,
    duration_minutes: parseInt(r.duration_minutes || '60', 10),
    group_size: parseInt(r.group_size || '1', 10),
    agreed_price_total: parseFloat(r.agreed_price_total || '0'),
    status: r.status as SeedBooking['status'],
    created_at: r.created_at,
    updated_at: r.updated_at,
    hold_expires_at: r.hold_expires_at,
    end_at: r.end_at,
    arrival_at: r.arrival_at,
  }))
}

export async function loadAgencies(): Promise<SeedAgency[]> {
  const agencyPath = path.join(process.cwd(), 'data', 'seed', 'agency_profiles.csv')
  const usersPath = path.join(process.cwd(), 'data', 'seed', 'user_accounts.csv')

  if (!fs.existsSync(agencyPath)) return []

  const agencyRows = parseCsv(fs.readFileSync(agencyPath, 'utf-8'))
  const userStatusMap = new Map<string, string>()

  if (fs.existsSync(usersPath)) {
    const userRows = parseCsv(fs.readFileSync(usersPath, 'utf-8'))
    for (const u of userRows) {
      userStatusMap.set(u.user_id, u.account_status)
    }
  }

  return agencyRows.map(r => ({
    agency_id: r.agency_id,
    user_id: r.user_id,
    company_name: r.company_name,
    company_type: r.company_type,
    account_status: userStatusMap.get(r.user_id) || 'Approved',
  }))
}

export async function loadProviders(): Promise<SeedProvider[]> {
  const provPath = path.join(process.cwd(), 'data', 'seed', 'provider_profiles.csv')
  const versionsPath = path.join(process.cwd(), 'data', 'seed', 'provider_profile_versions.csv')
  const usersPath = path.join(process.cwd(), 'data', 'seed', 'user_accounts.csv')

  if (!fs.existsSync(provPath)) return []

  const provRows = parseCsv(fs.readFileSync(provPath, 'utf-8'))
  const versionsMap = new Map<string, { business_name: string; craft_type: string }>()

  if (fs.existsSync(versionsPath)) {
    const verRows = parseCsv(fs.readFileSync(versionsPath, 'utf-8'))
    for (const v of verRows) {
      if (!versionsMap.has(v.provider_id) || v.version_status === 'Verified') {
        versionsMap.set(v.provider_id, {
          business_name: v.business_name,
          craft_type: v.craft_type,
        })
      }
    }
  }

  const userStatusMap = new Map<string, string>()
  if (fs.existsSync(usersPath)) {
    const userRows = parseCsv(fs.readFileSync(usersPath, 'utf-8'))
    for (const u of userRows) {
      userStatusMap.set(u.user_id, u.account_status)
    }
  }

  return provRows.map(r => {
    const ver = versionsMap.get(r.provider_id)
    return {
      provider_id: r.provider_id,
      user_id: r.user_id,
      village_id: r.village_id,
      verification_status: r.verification_status,
      business_name: ver?.business_name || 'Local Artisan Workshop',
      craft_type: ver?.craft_type || 'General Craft',
      account_status: userStatusMap.get(r.user_id) === 'Disabled' ? 'Disabled' : 'Active',
    }
  })
}

export async function loadQuoteRequests(): Promise<SeedQuoteRequest[]> {
  const filePath = path.join(process.cwd(), 'data', 'seed', 'quote_requests.csv')
  if (!fs.existsSync(filePath)) return []

  const rows = parseCsv(fs.readFileSync(filePath, 'utf-8'))
  return rows.map(r => ({
    quote_request_id: r.quote_request_id,
    agency_id: r.agency_id,
    experience_id: r.experience_id,
    created_at: r.created_at,
  }))
}

export async function loadChatSessions(): Promise<SeedChatSession[]> {
  const filePath = path.join(process.cwd(), 'data', 'seed', 'chat_sessions.csv')
  if (!fs.existsSync(filePath)) return []

  const rows = parseCsv(fs.readFileSync(filePath, 'utf-8'))
  return rows.map(r => ({
    chat_session_id: r.chat_session_id,
    agency_id: r.agency_id,
    provider_id: r.provider_id,
    created_at: r.started_at || r.created_at || new Date().toISOString(),
  }))
}

