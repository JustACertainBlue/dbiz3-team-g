import {
  DEFAULT_HANOI_ORIGIN,
  DEFAULT_HANOI_ORIGIN_LABEL,
  filterCandidateByRadius,
  haversineDistanceKm,
  locationUncertaintyKm,
  resolveOriginCoordinates,
} from '@/lib/matching/geo'
import { resolveVillageCoordinate } from '@/lib/matching/village-coordinate-lookup'

interface GeoDebugVillage {
  village_id: string
  name: string
}

interface AitGeoDebugOptions {
  origin?: unknown
  radiusKm?: number
  villages: GeoDebugVillage[]
}

function originName(origin: unknown): string | undefined {
  if (typeof origin === 'string') return origin.trim() || undefined
  if (!origin || typeof origin !== 'object') return undefined

  const record = origin as Record<string, unknown>
  return typeof record.origin_address === 'string'
    ? record.origin_address.trim() || undefined
    : typeof record.address === 'string'
      ? record.address.trim() || undefined
      : undefined
}

function precisionForSource(source: string | undefined): string | null {
  switch (source) {
    case 'from_plus_code': return 'plus_code'
    case 'district_fallback': return 'district_centroid'
    case 'manual_gmaps': return 'manual_gmaps'
    case 'approximate': return 'approximate'
    default: return null
  }
}

export function isAitGeoDebugEnabled(): boolean {
  return process.env.AIT_DEBUG === '1' && process.env.NODE_ENV !== 'production'
}

export function logAitGeoDebug({ origin, radiusKm, villages }: AitGeoDebugOptions): void {
  if (!isAitGeoDebugEnabled()) return

  const namedOrigin = originName(origin)
  const originCoordinates = resolveOriginCoordinates(origin)
  const reference = namedOrigin
    ? `ref=${namedOrigin}`
    : `ref=${DEFAULT_HANOI_ORIGIN.lat},${DEFAULT_HANOI_ORIGIN.lng} (default: ${DEFAULT_HANOI_ORIGIN_LABEL})`
  const rows = villages.map(village => {
    const assignment = resolveVillageCoordinate({ id: village.village_id, name: village.name })
    const distance = assignment?.location && originCoordinates
      ? haversineDistanceKm(originCoordinates, assignment.location)
      : undefined
    const filterDecision = filterCandidateByRadius({
      distance_km: distance,
      distance_source: distance === undefined ? undefined : 'haversine',
      location_source: assignment?.location_source,
    }, radiusKm)
    const uncertainty = locationUncertaintyKm(assignment?.location_source)
    let decision = 'giữ'
    let reason = 'không có giới hạn bán kính'

    if (typeof radiusKm === 'number' && Number.isFinite(radiusKm) && radiusKm > 0) {
      if (filterDecision.missingDistance) {
        decision = 'giữ-chưa xác nhận'
        reason = 'thiếu tọa độ hoặc chưa resolve được điểm xuất phát'
      } else if (!filterDecision.include) {
        decision = 'loại'
        reason = uncertainty > 0
          ? `${distance!.toFixed(1)} km trừ ${uncertainty} km vẫn vượt ${radiusKm} km`
          : `${distance!.toFixed(1)} km vượt ${radiusKm} km`
      } else if (filterDecision.status === 'unconfirmed') {
        decision = 'giữ-chưa xác nhận'
        reason = uncertainty > 0
          ? `khoảng cách ±${uncertainty} km giao với ngưỡng ${radiusKm} km`
          : 'chưa đủ dữ liệu để xác nhận ngưỡng'
      } else {
        reason = uncertainty > 0
          ? `${distance!.toFixed(1)} km cộng ${uncertainty} km không vượt ${radiusKm} km`
          : `${distance!.toFixed(1)} km không vượt ${radiusKm} km`
      }
    }

    return {
      id: village.village_id,
      distance_km: distance === undefined ? null : Number(distance.toFixed(1)),
      precision: precisionForSource(assignment?.location_source),
      decision,
      reason,
    }
  })

  console.info(
    `${reference}; bán kính=${typeof radiusKm === 'number' ? `${radiusKm} km` : 'không giới hạn'}`,
    rows,
  )
}
