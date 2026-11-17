export interface Coordinates {
  lat: number
  lng: number
}

// Approximate legacy Hanoi district centroids computed with planar polygon centroids from geoBoundaries
// gbOpen VNM ADM2 simplified polygons, release 9469f09592ced973a3448cf66b6100b741b64c0d.
// The boundary year is 2020; source attribution: OCHA ROAP and Government of Viet Nam,
// CC BY 3.0 IGO. https://www.geoboundaries.org/api/current/gbOpen/VNM/ADM2/
export const HANOI_DISTRICT_CENTERS: Readonly<Record<string, Coordinates>> = {
  'ba dinh': { lat: 21.035959, lng: 105.826600 },
  'ba vi': { lat: 21.142422, lng: 105.383256 },
  'bac tu liem': { lat: 21.071630, lng: 105.761419 },
  'cau giay': { lat: 21.030248, lng: 105.791969 },
  'chuong my': { lat: 20.875658, lng: 105.659223 },
  'dan phuong': { lat: 21.115367, lng: 105.676351 },
  'dong anh': { lat: 21.136706, lng: 105.840566 },
  'dong da': { lat: 21.015482, lng: 105.825025 },
  'gia lam': { lat: 21.028898, lng: 105.950510 },
  'ha dong': { lat: 20.953107, lng: 105.756337 },
  'hai ba trung': { lat: 21.005914, lng: 105.857687 },
  'hoai duc': { lat: 21.023924, lng: 105.699418 },
  'hoan kiem': { lat: 21.028835, lng: 105.853933 },
  'hoang mai': { lat: 20.974568, lng: 105.863052 },
  'long bien': { lat: 21.042094, lng: 105.894092 },
  'me linh': { lat: 21.184115, lng: 105.707152 },
  'my duc': { lat: 20.686717, lng: 105.720307 },
  'nam tu liem': { lat: 21.012503, lng: 105.761482 },
  'phu xuyen': { lat: 20.735686, lng: 105.901301 },
  'phuc tho': { lat: 21.116146, lng: 105.583786 },
  'quoc oai': { lat: 20.968390, lng: 105.598899 },
  'soc son': { lat: 21.272477, lng: 105.830421 },
  'son tay': { lat: 21.097140, lng: 105.479466 },
  'tay ho': { lat: 21.068880, lng: 105.820188 },
  'thach that': { lat: 21.018933, lng: 105.531016 },
  'thanh oai': { lat: 20.855727, lng: 105.781066 },
  'thanh tri': { lat: 20.932745, lng: 105.840614 },
  'thanh xuan': { lat: 20.994635, lng: 105.815566 },
  'thuong tin': { lat: 20.845002, lng: 105.874898 },
  'ung hoa': { lat: 20.711702, lng: 105.799488 },
}

function normalizePlaceName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function resolveHanoiDistrictCenter(address: string | undefined): Coordinates | undefined {
  if (!address) return undefined

  const normalizedAddress = normalizePlaceName(address)
  const districtMatches = Object.keys(HANOI_DISTRICT_CENTERS).filter(district =>
    (` ${normalizedAddress} `).includes(` ${district} `)
  )
  const hasOldQuarterAlias = /\bold quarter\b/.test(normalizedAddress)
  const resolvedDistricts = new Set(districtMatches)
  if (hasOldQuarterAlias) resolvedDistricts.add('hoan kiem')

  if (resolvedDistricts.size !== 1) return undefined
  const district = [...resolvedDistricts][0]
  return HANOI_DISTRICT_CENTERS[district]
}
