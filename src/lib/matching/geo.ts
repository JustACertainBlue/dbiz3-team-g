import { resolveHanoiDistrictCenter, type Coordinates } from './hanoi-district-centers'

export type OriginCoordinates = Coordinates

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
  if (!origin || typeof origin !== 'object') {
    return typeof origin === 'string' ? resolveHanoiDistrictCenter(origin) : undefined
  }

  const record = origin as Record<string, unknown>
  const address = typeof record.origin_address === 'string'
    ? record.origin_address
    : typeof record.address === 'string'
      ? record.address
      : undefined
  return resolveHanoiDistrictCenter(address)
}
