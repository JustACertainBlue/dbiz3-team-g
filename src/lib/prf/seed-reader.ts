import fs from 'node:fs'
import path from 'node:path'

export interface SeedProviderProfile {
  provider_id: string
  user_id: string
  business_name: string
  craft_type: string
  general_description: string
  village_id: string
  verification_status: string
  published_version_no: string | null
  phone_number?: string
  business_email?: string
  [key: string]: unknown
}

export interface SeedExperience {
  experience_id: string
  provider_id: string
  name: string
  description: string
  category: string
  duration_minutes: number
  price_per_person: number
  max_participants: number
  notice_period_hours: number
  archived_at?: string | null
  [key: string]: unknown
}

export interface SeedOperatingHours {
  operating_hours_id: string
  provider_id: string
  weekday: number
  local_start: string
  local_end: string
  is_closed: boolean
  [key: string]: unknown
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
    return entries.map(v => v.trim())
  }

  const headers = parseRow(lines[0])
  return lines.slice(1).map(line => {
    const values = parseRow(line)
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? ''
    })
    return row
  })
}

function getSeedPath(fileName: string): string {
  return path.join(process.cwd(), 'data', 'seed', fileName)
}

export async function loadProviderProfiles(): Promise<SeedProviderProfile[]> {
  const filePath = getSeedPath('provider_profiles.csv')
  const content = fs.readFileSync(filePath, 'utf-8')
  const records = parseCsv(content)

  return records.map(r => ({
    ...r,
    provider_id: r.provider_id,
    user_id: r.user_id,
    business_name: r.business_name,
    craft_type: r.craft_type,
    general_description: r.general_description,
    village_id: r.village_id,
    verification_status: r.verification_status,
    published_version_no: r.published_version_no ? r.published_version_no : null,
  }))
}

export async function loadExperiences(): Promise<SeedExperience[]> {
  const filePath = getSeedPath('experiences.csv')
  const content = fs.readFileSync(filePath, 'utf-8')
  const records = parseCsv(content)

  return records.map(r => ({
    ...r,
    experience_id: r.experience_id,
    provider_id: r.provider_id,
    name: r.title || r.name,
    description: r.description,
    category: r.category,
    duration_minutes: Number(r.duration_minutes || 0),
    price_per_person: Number(r.price_per_person || 0),
    max_participants: Number(r.max_participants || 0),
    notice_period_hours: Number(r.notice_period_hours || 0),
    archived_at: r.archived_at || null,
  }))
}

export async function loadOperatingHours(): Promise<SeedOperatingHours[]> {
  const filePath = getSeedPath('provider_operating_hours.csv')
  const content = fs.readFileSync(filePath, 'utf-8')
  const records = parseCsv(content)

  return records.map(r => ({
    ...r,
    operating_hours_id: r.operating_hours_id,
    provider_id: r.provider_id,
    weekday: Number(r.weekday || 0),
    local_start: r.local_start,
    local_end: r.local_end,
    is_closed: r.is_closed === 'true',
  }))
}

export interface SeedProviderProfileVersion {
  provider_id: string
  version_no: number
  version_status: string
  business_registration_number: string
  business_name: string
  craft_type: string
  artisan_names: string
  location_address: string
  description: string
  contact_information: string
  booking_conditions: string
  submitted_at: string
  published_at?: string | null
  [key: string]: unknown
}

export async function loadProviderProfileVersions(): Promise<SeedProviderProfileVersion[]> {
  const filePath = getSeedPath('provider_profile_versions.csv')
  const content = fs.readFileSync(filePath, 'utf-8')
  const records = parseCsv(content)

  return records.map(r => ({
    ...r,
    provider_id: r.provider_id,
    version_no: Number(r.version_no || 1),
    version_status: r.version_status,
    business_registration_number: r.business_registration_number,
    business_name: r.business_name,
    craft_type: r.craft_type,
    artisan_names: r.artisan_names,
    location_address: r.location_address,
    description: r.description,
    contact_information: r.contact_information,
    booking_conditions: r.booking_conditions,
    submitted_at: r.submitted_at,
    published_at: r.published_at || null,
  }))
}

export interface SeedVillage {
  village_id: string
  source_code: string
  name: string
  district: string
  city_province: string
  is_active: boolean
}

export async function loadVillages(): Promise<SeedVillage[]> {
  const filePath = getSeedPath('villages.csv')
  const content = fs.readFileSync(filePath, 'utf-8')
  const records = parseCsv(content)

  return records.map(r => ({
    village_id: r.village_id,
    source_code: r.source_code,
    name: r.name,
    district: r.district,
    city_province: r.city_province,
    is_active: r.is_active === 'true',
  }))
}

