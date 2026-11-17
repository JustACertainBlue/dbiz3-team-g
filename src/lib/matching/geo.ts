import { resolveHanoiDistrictCenter, type Coordinates } from './hanoi-district-centers'

export type OriginCoordinates = Coordinates

export const DEFAULT_HANOI_ORIGIN: OriginCoordinates = {
  lat: 21.0285,
  lng: 105.8542,
}

export const DISTRICT_FALLBACK_UNCERTAINTY_KM = 10
export const APPROXIMATE_COORDINATE_UNCERTAINTY_KM = 3

export interface RadiusFilterCandidate {
  distance_km?: number | null
  distance_source?: 'haversine'
  location_source?: 'from_plus_code' | 'district_fallback' | 'manual_gmaps' | 'approximate'
}

export interface RadiusFilterDecision {
  include: boolean
  missingDistance: boolean
  status?: 'confirmed' | 'unconfirmed'
}

export function locationUncertaintyKm(
  locationSource: 'from_plus_code' | 'district_fallback' | 'manual_gmaps' | 'approximate' | undefined,
): number {
  if (locationSource === 'district_fallback') return DISTRICT_FALLBACK_UNCERTAINTY_KM
  if (locationSource === 'approximate') return APPROXIMATE_COORDINATE_UNCERTAINTY_KM
  return 0
}

export function filterCandidateByRadius(
  candidate: RadiusFilterCandidate,
  radiusKm: number | undefined,
): RadiusFilterDecision {
  if (typeof radiusKm !== 'number' || !Number.isFinite(radiusKm) || radiusKm <= 0) {
    return { include: true, missingDistance: false }
  }
  if (
    candidate.distance_source !== 'haversine'
    || typeof candidate.distance_km !== 'number'
    || !Number.isFinite(candidate.distance_km)
  ) {
    return { include: true, missingDistance: true, status: 'unconfirmed' }
  }

  const uncertaintyKm = locationUncertaintyKm(candidate.location_source)
  if (candidate.distance_km - uncertaintyKm > radiusKm) {
    return { include: false, missingDistance: false }
  }
  return {
    include: true,
    missingDistance: false,
    status: candidate.distance_km + uncertaintyKm <= radiusKm ? 'confirmed' : 'unconfirmed',
  }
}

function validCoordinates(value: unknown): Coordinates | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  const lat = record.lat
  const lng = record.lng
  if (
    typeof lat !== 'number'
    || !Number.isFinite(lat)
    || lat < -90
    || lat > 90
    || typeof lng !== 'number'
    || !Number.isFinite(lng)
    || lng < -180
    || lng > 180
  ) {
    return undefined
  }
  return { lat, lng }
}

export function haversineDistanceKm(
  origin: unknown,
  destination: unknown
): number | undefined {
  const from = validCoordinates(origin)
  const to = validCoordinates(destination)
  if (!from || !to) return undefined

  const radians = (degrees: number) => degrees * Math.PI / 180
  const latitudeDelta = radians(to.lat - from.lat)
  const longitudeDelta = radians(to.lng - from.lng)
  const originLatitude = radians(from.lat)
  const destinationLatitude = radians(to.lat)
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(originLatitude) * Math.cos(destinationLatitude)
    * Math.sin(longitudeDelta / 2) ** 2
  const centralAngle = 2 * Math.atan2(
    Math.sqrt(Math.min(1, haversine)),
    Math.sqrt(Math.max(0, 1 - haversine))
  )
  return 6371.0088 * centralAngle
}

export function resolveOriginCoordinates(origin: unknown): OriginCoordinates | undefined {
  const explicitCoordinates = validCoordinates(origin)
  if (explicitCoordinates) return explicitCoordinates
  if (origin == null || origin === '') return DEFAULT_HANOI_ORIGIN
  if (typeof origin === 'string') return resolveHanoiDistrictCenter(origin)
  if (typeof origin !== 'object') return undefined

  const record = origin as Record<string, unknown>
  const address = typeof record.origin_address === 'string'
    ? record.origin_address
    : typeof record.address === 'string'
      ? record.address
      : undefined
  return address?.trim() ? resolveHanoiDistrictCenter(address) : DEFAULT_HANOI_ORIGIN
}

export function originDisplayNotice(origin: unknown): string | undefined {
  const coordinates = validCoordinates(origin)
  if (coordinates) return undefined
  const record = origin && typeof origin === 'object'
    ? origin as Record<string, unknown>
    : undefined
  const address = typeof origin === 'string'
    ? origin.trim()
    : typeof record?.origin_address === 'string'
      ? record.origin_address.trim()
      : typeof record?.address === 'string'
        ? record.address.trim()
        : ''
  if (!address && !record?.lat && !record?.lng) {
    return 'Điểm xuất phát mặc định: trung tâm Hà Nội (Hồ Gươm).'
  }
  if (address && !resolveOriginCoordinates(origin)) {
    return `Chưa xác định được điểm xuất phát “${address}”; không đoán và chưa tính khoảng cách.`
  }
  return undefined
}
