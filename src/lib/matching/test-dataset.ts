import rawData from '@/data/ai-matching/villages_providers_activities_merged.json'
import type { VillageCardData, ProviderCardData, ActivityCardData, ProviderActivity } from '@/lib/matching/card-resolver'
import { CRAFT_MEDIA } from '@/lib/matching/card-resolver'
import type { CandidateExperience } from '@/lib/matching/candidate-repo'
import type { TourPreferenceProfile } from '@/lib/matching/types'
import type { CraftType } from '@/lib/matching/craft-taxonomy'

export interface TestVillageRaw {
  village_id: string
  village_name: string
  district_raw: string
  providers: Array<{
    provider_id: string
    name: string
    type: string
    type_raw: string
    address: string
    phones?: string[]
    contact_person?: string | null
    contact_phone?: string | null
    contact_note?: string | null
    zalo?: string | null
    email?: string | null
    website?: string | null
    fanpage?: string | null
    source?: string | null
    verified_status?: string
    notes?: string[]
    coordinates?: {
      lat: number | null
      lng: number | null
      plus_code: string | null
      status: string
    }
  }>
  activities: Array<{
    activity_id: string
    provider_id: string
    name: string
    description: string
    duration?: string | null
    price_raw?: string | null
    source?: string | null
    verified_status?: string
    notes?: string[]
    booking_note?: string | null
  }>
}

/**
 * Checks if a prompt triggers test mode for AI matching.
 */
export function isTestPrompt(text: string): boolean {
  if (!text) return false
  return /(?:^|[\s,.:;!?])test(?:$|[\s,.:;!?])/i.test(text.trim())
}

const VILLAGE_CRAFT_MAPPING: Record<string, { craftType: CraftType; craftName: string; mediaUrl: string; lat: number; lng: number; distKm: number }> = {
  'bat-trang': { craftType: 'Ceramics', craftName: 'Gốm sứ mỹ nghệ Bát Tràng', mediaUrl: CRAFT_MEDIA.ceramics, lat: 20.97735, lng: 105.91145, distKm: 14 },
  'kim-lan': { craftType: 'Ceramics', craftName: 'Gốm sứ cổ truyền Kim Lan', mediaUrl: CRAFT_MEDIA.ceramics, lat: 20.96369, lng: 105.90369, distKm: 16 },
  'xuan-la': { craftType: 'Other', craftName: 'Nghệ thuật nặn Tò He Xuân La', mediaUrl: 'https://images.unsplash.com/photo-1582560475093-ba66accbc424?w=800', lat: 20.7421, lng: 105.8685, distKm: 32 },
  'ha-thai': { craftType: 'Paper/Painting', craftName: 'Sơn mài mỹ nghệ Hạ Thái', mediaUrl: CRAFT_MEDIA.lacquer, lat: 20.9032, lng: 105.8655, distKm: 18 },
  'yen-thai': { craftType: 'Paper/Painting', craftName: 'Làm giấy Dó truyền thống Yên Thái', mediaUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800', lat: 21.04945, lng: 105.81395, distKm: 6 },
  'chang-son': { craftType: 'Other', craftName: 'Làm quạt giấy & điêu khắc Chàng Sơn', mediaUrl: CRAFT_MEDIA.woodcarving, lat: 21.02815, lng: 105.60345, distKm: 30 },
  'van-phuc': { craftType: 'Silk/Textile', craftName: 'Dệt lụa tơ tằm Vạn Phúc', mediaUrl: CRAFT_MEDIA.silk, lat: 20.9785, lng: 105.7725, distKm: 12 },
  'non-chuong': { craftType: 'Other', craftName: 'Làm nón lá làng Chuông', mediaUrl: CRAFT_MEDIA.conicalhats, lat: 20.8269, lng: 105.7618, distKm: 30 },
  'phu-vinh': { craftType: 'Other', craftName: 'Mây tre đan mỹ nghệ Phú Vinh', mediaUrl: CRAFT_MEDIA.bamboo, lat: 20.9331, lng: 105.6496, distKm: 25 },
  'ba-duong-noi': { craftType: 'Other', craftName: 'Làm diều sáo truyền thống Bá Dương Nội', mediaUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800', lat: 21.1120, lng: 105.6980, distKm: 22 },
  'son-dong': { craftType: 'Woodcarving', craftName: 'Điêu khắc mỹ nghệ & tạc tượng Sơn Đồng', mediaUrl: CRAFT_MEDIA.woodcarving, lat: 21.0340, lng: 105.7120, distKm: 20 },
  'ngu-xa': { craftType: 'Metalwork', craftName: 'Đúc đồng truyền thống Ngũ Xã', mediaUrl: 'https://images.unsplash.com/photo-1533158307587-828f0a76ef46?w=800', lat: 21.0450, lng: 105.8420, distKm: 4 },
  'phung-xa': { craftType: 'Silk/Textile', craftName: 'Dệt lụa tơ sen độc bản Phùng Xá', mediaUrl: CRAFT_MEDIA.silk, lat: 20.6750, lng: 105.7830, distKm: 40 },
  'dao-thuc': { craftType: 'Other', craftName: 'Múa rối nước dân gian Đào Thục', mediaUrl: CRAFT_MEDIA.waterpuppets, lat: 21.1730, lng: 105.9250, distKm: 24 },
}

/**
 * Cleans activity name by removing leading "vé" or "Vé" and ensuring proper capitalization
 */
export function cleanActivityName(name: string): string {
  if (!name) return ''
  const cleaned = name.replace(/^vé\s+/i, '').trim()
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : ''
}

function parsePriceFromRaw(priceRaw: string | null | undefined): number {
  if (!priceRaw) return 120000
  const clean = priceRaw.toLowerCase().replace(/\./g, '').replace(/,/g, '')
  const match = clean.match(/(\d{4,8})/)
  if (match) {
    return parseInt(match[1], 10)
  }
  if (clean.includes('miễn phí')) return 0
  return 120000
}

function parseDurationMinutes(durationRaw: string | null | undefined): number {
  if (!durationRaw) return 75
  const lower = durationRaw.toLowerCase()
  if (lower.includes('2 - 3 tiếng') || lower.includes('3 tiếng')) return 150
  if (lower.includes('1 – 2') || lower.includes('1-2') || lower.includes('2 tiếng')) return 90
  if (lower.includes('60 – 90') || lower.includes('60-90')) return 75
  if (lower.includes('1 giờ') || lower.includes('1 tiếng') || lower.includes('60')) return 60
  return 75
}

function getExperienceCategory(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('biểu diễn') || lower.includes('rối nước') || lower.includes('suất diễn')) return 'Cultural Show'
  if (lower.includes('tham quan') && !lower.includes('trải nghiệm') && !lower.includes('làm') && !lower.includes('workshop') && !lower.includes('vuốt') && !lower.includes('nặn') && !lower.includes('ghép')) return 'Sightseeing'
  return 'Workshop/Hands-on'
}

/**
 * Returns candidate experiences constructed exclusively from villages_providers_activities_merged.json
 */
export function getTestCandidates(profile?: TourPreferenceProfile): CandidateExperience[] {
  const villages = (rawData as { villages: TestVillageRaw[] }).villages || []
  const candidates: CandidateExperience[] = []

  for (const village of villages) {
    const meta = VILLAGE_CRAFT_MAPPING[village.village_id] || {
      craftType: 'Other' as CraftType,
      craftName: village.village_name,
      mediaUrl: CRAFT_MEDIA.ceramics,
      lat: 21.0285,
      lng: 105.8542,
      distKm: 15,
    }

    const providerMap = new Map(village.providers.map(p => [p.provider_id, p]))

    for (const act of village.activities) {
      const prov = providerMap.get(act.provider_id)
      const provName = prov?.name || village.village_name
      const cleanName = cleanActivityName(act.name)
      const price = parsePriceFromRaw(act.price_raw)
      const duration = parseDurationMinutes(act.duration)
      const category = getExperienceCategory(cleanName)

      const lat = prov?.coordinates?.lat || meta.lat
      const lng = prov?.coordinates?.lng || meta.lng

      candidates.push({
        experience_id: act.activity_id,
        provider_id: act.provider_id,
        village_id: village.village_id,
        village_name: village.village_name,
        name: cleanName,
        experience_name: cleanName,
        description: act.description,
        category,
        experience_type: category,
        craft_type: meta.craftType,
        price_per_person: price,
        max_participants: 25,
        max_capacity: 25,
        notice_period_hours: 24,
        duration_minutes: duration,
        provider_name: provName,
        provider_status: 'Verified',
        provider_verification_status: 'Approved',
        has_published_profile_version: true,
        experience_location_address: prov?.address || `${village.village_name}, ${village.district_raw}, Hà Nội`,
        distance_km: meta.distKm,
        travel_time_minutes: Math.round(meta.distKm * 2.2),
        historical_agency_preference_weight: 0.9,
        provider_quality_rating: 0.95,
        image_url: meta.mediaUrl,
        location: {
          lat,
          lng,
          address: prov?.address || `${village.village_name}, ${village.district_raw}, Hà Nội`,
        },
      } as CandidateExperience)
    }
  }

  return candidates
}

export const getTestAllExperiences = getTestCandidates

/**
 * Resolves Village cards strictly from test dataset
 */
export function resolveTestVillageCards(text: string): VillageCardData[] {
  const villages = (rawData as { villages: TestVillageRaw[] }).villages || []
  const lower = text.toLowerCase()

  const cards: VillageCardData[] = villages.map(v => {
    const meta = VILLAGE_CRAFT_MAPPING[v.village_id]
    return {
      village_id: v.village_id,
      name: v.village_name,
      craft: meta?.craftName || v.village_name,
      district: v.district_raw,
      image_url: meta?.mediaUrl || CRAFT_MEDIA.ceramics,
      description: `${v.village_name} (${v.district_raw}) — gồm ${v.providers.length} cơ sở/xưởng nghề và ${v.activities.length} hoạt động trải nghiệm văn hóa.`,
    }
  })

  // If user mentions specific craft or village, filter to those
  const matched = cards.filter(c => {
    const vName = c.name.toLowerCase()
    const craft = c.craft.toLowerCase()
    const dist = c.district.toLowerCase()
    return lower.includes(vName) || lower.includes(craft) || lower.includes(dist) ||
      (vName.includes('bát tràng') && lower.includes('gốm')) ||
      (vName.includes('vạn phúc') && lower.includes('lụa')) ||
      (vName.includes('chàng sơn') && (lower.includes('quạt') || lower.includes('mộc'))) ||
      (vName.includes('đào thục') && lower.includes('rối')) ||
      (vName.includes('phú vinh') && lower.includes('mây')) ||
      (vName.includes('chuông') && lower.includes('nón')) ||
      (vName.includes('hạ thái') && lower.includes('sơn mài')) ||
      (vName.includes('yên thái') && lower.includes('dó')) ||
      (vName.includes('ngũ xã') && lower.includes('đồng')) ||
      (vName.includes('sơn đồng') && lower.includes('gỗ'))
  })

  if (matched.length > 0) return matched
  // Return top 4 test villages if no specific one mentioned
  return cards.slice(0, 4)
}

/**
 * Resolves Provider cards strictly from test dataset
 */
export function resolveTestProviderCards(text: string): ProviderCardData[] {
  const villages = (rawData as { villages: TestVillageRaw[] }).villages || []
  const lower = text.toLowerCase()
  const providerCards: ProviderCardData[] = []

  for (const v of villages) {
    const meta = VILLAGE_CRAFT_MAPPING[v.village_id]
    for (const p of v.providers) {
      const pActs: ProviderActivity[] = v.activities
        .filter(a => a.provider_id === p.provider_id)
        .map(a => ({
          experience_id: a.activity_id,
          name: cleanActivityName(a.name),
          price: parsePriceFromRaw(a.price_raw),
          duration_minutes: parseDurationMinutes(a.duration),
        }))

      providerCards.push({
        provider_id: p.provider_id,
        village_id: v.village_id,
        village_name: v.village_name,
        business_name: p.name,
        artisan_name: p.contact_person || undefined,
        craft_type: p.type_raw || meta?.craftType || 'Thủ công mỹ nghệ',
        location_address: p.address,
        description: p.notes?.join('; ') || p.contact_note || `Xưởng thủ công uy tín tại ${v.village_name}`,
        activities: pActs,
        image_url: meta?.mediaUrl || CRAFT_MEDIA.ceramics,
        primary_experience_id: pActs[0]?.experience_id || `exp-${p.provider_id}`,
        is_verified: true,
      })
    }
  }

  const matched = providerCards.filter(p => {
    const bName = p.business_name.toLowerCase()
    const vName = p.village_name.toLowerCase()
    const cType = p.craft_type.toLowerCase()
    return lower.includes(bName) || lower.includes(vName) || lower.includes(cType) ||
      (lower.includes('gốm') && vName.includes('bát tràng')) ||
      (lower.includes('lụa') && vName.includes('vạn phúc')) ||
      (lower.includes('quạt') && vName.includes('chàng sơn')) ||
      (lower.includes('rối') && vName.includes('đào thục')) ||
      (lower.includes('mây') && vName.includes('phú vinh')) ||
      (lower.includes('nón') && vName.includes('chuông')) ||
      (lower.includes('sơn mài') && vName.includes('hạ thái'))
  })

  if (matched.length > 0) return matched.slice(0, 4)
  return providerCards.slice(0, 4)
}

/**
 * Resolves Activity cards strictly from test dataset
 */
export function resolveTestActivityCards(text: string): ActivityCardData[] {
  const villages = (rawData as { villages: TestVillageRaw[] }).villages || []
  const lower = text.toLowerCase()
  const isSightseeingOnly = /(?:chỉ muốn tham quan|chỉ tham quan|không trải nghiệm|không làm|không workshop|muốn tham quan thôi|chỉ ngắm|không làm đồ)/i.test(lower)
  const isSightseeingRequested = /(?:tham quan|ngắm cảnh|vãn cảnh|đi dạo|bảo tàng|check-in)/i.test(lower)
  const activityCards: ActivityCardData[] = []

  for (const v of villages) {
    const meta = VILLAGE_CRAFT_MAPPING[v.village_id]
    const provMap = new Map(v.providers.map(p => [p.provider_id, p]))

    for (const a of v.activities) {
      const prov = provMap.get(a.provider_id)
      const cleanName = cleanActivityName(a.name)
      const price = parsePriceFromRaw(a.price_raw)
      const duration = parseDurationMinutes(a.duration)
      const category = getExperienceCategory(cleanName)

      activityCards.push({
        experience_id: a.activity_id,
        provider_id: a.provider_id,
        provider_name: prov?.name || v.village_name,
        village_id: v.village_id,
        village_name: v.village_name,
        name: cleanName,
        description: a.description,
        category,
        duration_minutes: duration,
        price_per_person: price,
        max_participants: 25,
        image_url: meta?.mediaUrl || CRAFT_MEDIA.ceramics,
        is_verified: true,
      })
    }
  }

  const isLowPrice = /(?:giá rẻ|giá thấp|rẻ nhất|thấp nhất|chi phí thấp|tiết kiệm|bình dân|giá mềm|cheapest|lowest price|budget friendly)/i.test(lower)
  const isHighPrice = /(?:giá cao|cao cấp|đắt nhất|đắt tiền|vip|luxury|premium|highest price|thượng lưu)/i.test(lower)

  if (isSightseeingOnly) {
    let sightPool = activityCards.filter(a => a.category === 'Sightseeing' || a.name.toLowerCase().includes('tham quan'))
    if (isLowPrice) {
      sightPool.sort((a, b) => a.price_per_person - b.price_per_person)
    } else if (isHighPrice) {
      sightPool.sort((a, b) => b.price_per_person - a.price_per_person)
    }
    if (sightPool.length > 0) return sightPool.slice(0, 4)
  }

  let matched = activityCards.filter(act => {
    const name = act.name.toLowerCase()
    const vName = act.village_name.toLowerCase()
    const pName = act.provider_name.toLowerCase()
    return lower.includes(name) || lower.includes(vName) || lower.includes(pName) ||
      (lower.includes('gốm') && vName.includes('bát tràng')) ||
      (lower.includes('lụa') && vName.includes('vạn phúc')) ||
      (lower.includes('quạt') && vName.includes('chàng sơn')) ||
      (lower.includes('rối') && vName.includes('đào thục')) ||
      (lower.includes('mây') && vName.includes('phú vinh')) ||
      (lower.includes('nón') && vName.includes('chuông')) ||
      (lower.includes('sơn mài') && vName.includes('hạ thái'))
  })

  if (isLowPrice) {
    matched.sort((a, b) => a.price_per_person - b.price_per_person)
    activityCards.sort((a, b) => a.price_per_person - b.price_per_person)
  } else if (isHighPrice) {
    matched.sort((a, b) => b.price_per_person - a.price_per_person)
    activityCards.sort((a, b) => b.price_per_person - a.price_per_person)
  }

  if (matched.length > 0) return matched.slice(0, 5)
  return activityCards.slice(0, 5)
}
