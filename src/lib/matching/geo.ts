import { resolveHanoiDistrictCenter, type Coordinates } from './hanoi-district-centers'

export type OriginCoordinates = Coordinates

export const DEFAULT_HANOI_ORIGIN_LABEL = 'trung tâm Hà Nội'
export const DEFAULT_HANOI_ORIGIN: OriginCoordinates = {
  lat: 21.0285,
  lng: 105.8542,
}

export const DISTRICT_FALLBACK_UNCERTAINTY_KM = 10
export const APPROXIMATE_COORDINATE_UNCERTAINTY_KM = 3
const DEFAULT_HANOI_ORIGIN_LABELS = new Set([
  'ho guom',
  'hoan kiem',
  'ho hoan kiem',
  'trung tam ha noi',
  'trung tam ha noi ho guom',
  'ha noi',
  'gan ha noi',
  'pho co',
])
const OUTSIDE_HANOI_ORIGIN_LABELS = new Set([
  'da nang',
  'sai gon',
  'ho chi minh',
  'ho chi minh city',
  'tp hcm',
  'tp ho chi minh',
  'hcmc',
])

function normalizeOriginLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isDefaultHanoiOriginLabel(value: string): boolean {
  return DEFAULT_HANOI_ORIGIN_LABELS.has(normalizeOriginLabel(value))
}

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
    || candidate.distance_km < 0
  ) {
    return { include: false, missingDistance: true, status: 'unconfirmed' }
  }

  const uncertaintyKm = locationUncertaintyKm(candidate.location_source)
  const displayedDistance = Math.round(candidate.distance_km * 10) / 10
  const displayedRadius = Math.round(radiusKm * 10) / 10
  if (displayedDistance - uncertaintyKm > displayedRadius) {
    return { include: false, missingDistance: false }
  }
  return {
    include: true,
    missingDistance: false,
    status: displayedDistance + uncertaintyKm <= displayedRadius ? 'confirmed' : 'unconfirmed',
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
  if (typeof origin === 'string') {
    if (isDefaultHanoiOriginLabel(origin)) return DEFAULT_HANOI_ORIGIN
    return resolveHanoiDistrictCenter(origin)
      || (OUTSIDE_HANOI_ORIGIN_LABELS.has(normalizeOriginLabel(origin)) ? undefined : DEFAULT_HANOI_ORIGIN)
  }
  if (typeof origin !== 'object') return undefined

  const record = origin as Record<string, unknown>
  const address = typeof record.origin_address === 'string'
    ? record.origin_address
    : typeof record.address === 'string'
      ? record.address
      : undefined
  if (!address?.trim()) return DEFAULT_HANOI_ORIGIN
  if (isDefaultHanoiOriginLabel(address)) return DEFAULT_HANOI_ORIGIN
  return resolveHanoiDistrictCenter(address)
    || (OUTSIDE_HANOI_ORIGIN_LABELS.has(normalizeOriginLabel(address)) ? undefined : DEFAULT_HANOI_ORIGIN)
}

export function originDisplayLabel(origin: unknown): string | undefined {
  if (origin == null || origin === '') return DEFAULT_HANOI_ORIGIN_LABEL
  const record = origin && typeof origin === 'object'
    ? origin as Record<string, unknown>
    : undefined
  const address = typeof origin === 'string'
    ? origin.trim()
    : typeof record?.origin_address === 'string'
      ? record.origin_address.trim()
      : typeof record?.address === 'string'
        ? record.address.trim()
        : undefined
  if (address && isDefaultHanoiOriginLabel(address)) {
    const normalizedAddress = normalizeOriginLabel(address)
    if (/(?:^|\s)ho guom(?:\s|$)/.test(normalizedAddress)) return 'Hồ Gươm'
    if (/(?:^|\s)hoan kiem(?:\s|$)/.test(normalizedAddress)) {
      return normalizedAddress.startsWith('ho hoan kiem') ? 'Hồ Hoàn Kiếm' : 'Hoàn Kiếm'
    }
    return DEFAULT_HANOI_ORIGIN_LABEL
  }
  const coordinates = resolveOriginCoordinates(origin)
  if (!coordinates) return undefined
  if (
    coordinates.lat === DEFAULT_HANOI_ORIGIN.lat
    && coordinates.lng === DEFAULT_HANOI_ORIGIN.lng
  ) {
    return DEFAULT_HANOI_ORIGIN_LABEL
  }
  if (typeof origin === 'string') return origin
  if (address) return address
  return 'điểm xuất phát đã cung cấp'
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
    return `Khoảng cách tính từ ${DEFAULT_HANOI_ORIGIN_LABEL}.`
  }
  if (address && OUTSIDE_HANOI_ORIGIN_LABELS.has(normalizeOriginLabel(address))) {
    return `Địa điểm ${address} nằm ngoài phạm vi Hà Nội; mình chưa thể ghép tour theo điểm xuất phát này.`
  }
  if (address && !isDefaultHanoiOriginLabel(address) && !resolveHanoiDistrictCenter(address)) {
    return `Chưa nhận ra địa điểm ${address}, tạm tính từ ${DEFAULT_HANOI_ORIGIN_LABEL}.`
  }
  return undefined
}
