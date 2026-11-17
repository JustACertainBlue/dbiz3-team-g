import { readFileSync } from 'node:fs'
import path from 'node:path'
import rawLookup from './village-coordinate-lookup.json'

export type VillageCoordinatePrecision =
  | 'plus_code'
  | 'district_centroid'
  | 'manual_gmaps'
  | 'approximate'

export type VillageLocationSource =
  | 'from_plus_code'
  | 'district_fallback'
  | 'manual_gmaps'
  | 'approximate'

export interface VillageAttributeValue {
  value: unknown
  source: string
  verified_status: string
}

export interface VillageGeo {
  lat: number
  lng: number
  precision: VillageCoordinatePrecision
  source?: string
  verified_status?: string
}

export interface VillageEnrichmentRecord {
  geo?: VillageGeo
  attributes?: Record<string, VillageAttributeValue>
}

export interface ManualVillageCoordinate {
  lat: number
  lng: number
  source: 'manual' | 'manual_gmaps'
}

export interface VillageCoordinateLookup {
  by_village_id?: Record<string, VillageEnrichmentRecord>
  by_normalized_name?: Record<string, VillageEnrichmentRecord>
  manual_by_normalized_key?: Record<string, ManualVillageCoordinate>
}

export interface VillageCoordinateAssignment {
  location?: { lat: number; lng: number }
  location_source?: VillageLocationSource
  village_attributes?: Record<string, VillageAttributeValue>
}

export const VILLAGE_FIELD_REGISTRY = {
  geo: {
    key: 'geo',
    type: 'coordinates',
    filterable: true,
    embeddable: false,
  },
} as const

export const HANOI_BOUNDS = {
  south: 20.55,
  north: 21.45,
  west: 105.25,
  east: 106.05,
} as const

export function normalizeVillageName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isValidCoordinates(value: unknown): value is { lat: number; lng: number } {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return typeof entry.lat === 'number'
    && Number.isFinite(entry.lat)
    && entry.lat >= -90
    && entry.lat <= 90
    && typeof entry.lng === 'number'
    && Number.isFinite(entry.lng)
    && entry.lng >= -180
    && entry.lng <= 180
}

function isInHanoi(value: { lat: number; lng: number }): boolean {
  return value.lat >= HANOI_BOUNDS.south
    && value.lat <= HANOI_BOUNDS.north
    && value.lng >= HANOI_BOUNDS.west
    && value.lng <= HANOI_BOUNDS.east
}

function isValidGeo(value: unknown): value is VillageGeo {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return isValidCoordinates(value)
    && isInHanoi(value)
    && (
      entry.precision === 'plus_code'
      || entry.precision === 'district_centroid'
      || entry.precision === 'manual_gmaps'
      || entry.precision === 'approximate'
    )
}

function parseManualCoordinates(csv: string): Record<string, ManualVillageCoordinate> {
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/)
  if (!headerLine) return {}
  const headers = headerLine.split(',').map(value => value.trim())
  const keyIndex = headers.indexOf('normalized_key')
  const latIndex = headers.indexOf('lat')
  const lngIndex = headers.indexOf('lng')
  const sourceIndex = headers.indexOf('source')
  if ([keyIndex, latIndex, lngIndex, sourceIndex].some(index => index < 0)) {
    throw new Error('manual_village_coords.csv must have normalized_key, lat, lng, and source columns.')
  }

  const records: Record<string, ManualVillageCoordinate> = {}
  for (const line of lines) {
    if (!line.trim()) continue
    const values = line.split(',').map(value => value.trim())
    const key = normalizeVillageName(values[keyIndex] ?? '')
    const coordinates = {
      lat: Number(values[latIndex]),
      lng: Number(values[lngIndex]),
    }
    if (
      !key
      || !['manual', 'manual_gmaps'].includes(values[sourceIndex] ?? '')
      || !Number.isFinite(coordinates.lat)
      || !Number.isFinite(coordinates.lng)
      || !isInHanoi(coordinates)
      || records[key]
    ) {
      throw new Error(`Invalid or duplicate manual village coordinate row for "${key}".`)
    }
    records[key] = {
      ...coordinates,
      source: values[sourceIndex] as ManualVillageCoordinate['source'],
    }
  }
  return records
}

function loadManualCoordinates(): Record<string, ManualVillageCoordinate> {
  const manualPath = path.join(
    process.cwd(),
    'src',
    'lib',
    'matching',
    'manual_village_coords.csv',
  )
  return parseManualCoordinates(readFileSync(manualPath, 'utf8'))
}

const importedLookup = rawLookup as VillageCoordinateLookup
export const DEFAULT_VILLAGE_COORDINATE_LOOKUP: VillageCoordinateLookup = {
  ...importedLookup,
  manual_by_normalized_key: loadManualCoordinates(),
}

function locationSource(precision: VillageCoordinatePrecision): VillageLocationSource {
  if (precision === 'plus_code') return 'from_plus_code'
  if (precision === 'district_centroid') return 'district_fallback'
  if (precision === 'approximate') return 'approximate'
  return 'manual_gmaps'
}

export function resolveVillageCoordinate(
  village: { id?: string; name?: string },
  lookup: VillageCoordinateLookup = DEFAULT_VILLAGE_COORDINATE_LOOKUP,
  plusCodeCoordinates?: { lat: number; lng: number },
): VillageCoordinateAssignment | undefined {
  const normalizedName = village.name ? normalizeVillageName(village.name) : ''
  const manual = normalizedName ? lookup.manual_by_normalized_key?.[normalizedName] : undefined
  const records = [
    village.id ? lookup.by_village_id?.[village.id] : undefined,
    normalizedName ? lookup.by_normalized_name?.[normalizedName] : undefined,
  ].filter((record): record is VillageEnrichmentRecord => Boolean(record))
  const attributes = records.find(record => record.attributes)?.attributes

  if (manual && isValidCoordinates(manual) && isInHanoi(manual)) {
    return {
      location: { lat: manual.lat, lng: manual.lng },
      location_source: 'manual_gmaps',
      ...(attributes ? { village_attributes: attributes } : {}),
    }
  }

  const manualGeo = records.find(record =>
    record.geo?.precision === 'manual_gmaps' && isValidGeo(record.geo)
  )?.geo
  if (manualGeo && isValidGeo(manualGeo)) {
    return {
      location: { lat: manualGeo.lat, lng: manualGeo.lng },
      location_source: 'manual_gmaps',
      ...(attributes ? { village_attributes: attributes } : {}),
    }
  }

  const plusCodeGeo = records.find(record =>
    record.geo?.precision === 'plus_code' && isValidGeo(record.geo)
  )?.geo
  if (plusCodeGeo && isValidGeo(plusCodeGeo)) {
    return {
      location: { lat: plusCodeGeo.lat, lng: plusCodeGeo.lng },
      location_source: 'from_plus_code',
      ...(attributes ? { village_attributes: attributes } : {}),
    }
  }

  if (
    plusCodeCoordinates
    && isValidCoordinates(plusCodeCoordinates)
    && isInHanoi(plusCodeCoordinates)
  ) {
    return {
      location: { lat: plusCodeCoordinates.lat, lng: plusCodeCoordinates.lng },
      location_source: 'from_plus_code',
      ...(attributes ? { village_attributes: attributes } : {}),
    }
  }

  const approximateGeo = records.find(record =>
    record.geo?.precision === 'approximate' && isValidGeo(record.geo)
  )?.geo
  if (approximateGeo && isValidGeo(approximateGeo)) {
    return {
      location: { lat: approximateGeo.lat, lng: approximateGeo.lng },
      location_source: 'approximate',
      ...(attributes ? { village_attributes: attributes } : {}),
    }
  }

  const districtGeo = records.find(record =>
    record.geo?.precision === 'district_centroid' && isValidGeo(record.geo)
  )?.geo
  if (districtGeo && isValidGeo(districtGeo)) {
    return {
      location: { lat: districtGeo.lat, lng: districtGeo.lng },
      location_source: locationSource(districtGeo.precision),
      ...(attributes ? { village_attributes: attributes } : {}),
    }
  }

  if (attributes) return { village_attributes: attributes }
  return undefined
}

export function isVillageAttributeFilterable(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(VILLAGE_FIELD_REGISTRY, key)
    && VILLAGE_FIELD_REGISTRY[key as keyof typeof VILLAGE_FIELD_REGISTRY].filterable
}

export function buildVillageAttributePromptBlock(
  attributes?: Record<string, VillageAttributeValue>,
): string {
  const embeddable = Object.entries(attributes ?? {}).filter(([key, attribute]) => {
    const field = VILLAGE_FIELD_REGISTRY[key as keyof typeof VILLAGE_FIELD_REGISTRY]
    if (!field?.embeddable || attribute.value == null) return false
    if (typeof attribute.value === 'string') {
      const value = attribute.value.trim().toLowerCase()
      return value !== '' && value !== 'null' && value !== 'chưa có dữ liệu'
    }
    return true
  })
  if (embeddable.length === 0) return ''
  return `SCORING ATTRIBUTE DATA:\n${JSON.stringify(Object.fromEntries(embeddable))}`
}
