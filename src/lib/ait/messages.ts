import { DEFAULT_HANOI_ORIGIN_LABEL, originDisplayLabel } from '@/lib/matching/geo'

function formatVND(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatKm(n: number): string {
  if (!Number.isFinite(n)) return 'chưa có dữ liệu'
  return n.toFixed(1).replace('.', ',')
}

function formatRadiusKm(n: number): string {
  if (!Number.isFinite(n)) return 'chưa có dữ liệu'
  return Number(n.toFixed(1)).toLocaleString('vi-VN', { maximumFractionDigits: 1 })
}

function toDDMMYYYY(d: string): string {
  const parts = d.split('-');
  return parts.length >= 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
}

interface ResultMessageMatch {
  experience_name: string;
  price_per_person: number | null;
  distance_km?: number | null;
  distance_source?: 'haversine';
  location_source?: 'from_plus_code' | 'district_fallback' | 'manual_gmaps' | 'approximate';
  radius_status?: 'confirmed' | 'unconfirmed';
}

const CRAFT_LABELS_VI: Record<string, string> = {
  silk: 'dệt lụa',
  embroidery: 'thêu tay',
  pottery: 'làm gốm',
  woodcarving: 'điêu khắc gỗ',
  food: 'ẩm thực',
  metalwork: 'đồ kim hoàn',
  painting: 'sơn mài',
  'conical hat': 'làm nón lá',
  bamboo: 'đan mây tre',
};

export function craftLabelVi(preference: string): string {
  return CRAFT_LABELS_VI[preference.toLowerCase()] ?? preference;
}

export function resultEndingCandidate(reply: string): string {
  const sentences = reply.match(/[^.!?？]+[.!?？]*/gu)?.map(sentence => sentence.trim()).filter(Boolean) ?? [];
  const ending = sentences[sentences.length - 1] ?? '';
  if (/^(?:dưới đây|mình tìm(?: được| thấy)?|tìm thấy|here are|i found)\b/i.test(ending)) return '';
  return ending;
}

export function buildResultsMessage({
  count,
  group_size,
  start_date,
  end_date,
  max_budget_per_person,
  craft,
  origin,
  radiusKm,
  dateScheduleUnconfirmed = false,
  noResultsWithinRadius = false,
  noResultsDueToBudget = false,
  noResultsDueToDateInPast = false,
  noResultsDueToNotice = false,
  earliestAvailableDate,
  maxNoticePeriodHours,
  excludedVillages = [],
  excludedCrafts = [],
  missingPrimary = [],
  originUnresolved,
  priceSort,
  matches,
  ending,
}: {
  count: number;
  group_size?: number;
  start_date?: string;
  end_date?: string;
  max_budget_per_person?: number;
  craft?: string;
  origin?: string;
  radiusKm?: number;
  dateScheduleUnconfirmed?: boolean;
  noResultsWithinRadius?: boolean;
  noResultsDueToBudget?: boolean;
  noResultsDueToDateInPast?: boolean;
  noResultsDueToNotice?: boolean;
  earliestAvailableDate?: string;
  maxNoticePeriodHours?: number;
  excludedVillages?: string[];
  excludedCrafts?: string[];
  missingPrimary?: string[];
  originUnresolved?: string;
  priceSort?: 'asc' | 'desc';
  matches?: ResultMessageMatch[];
  ending?: string;
}): string {
  const criteria: string[] = [];
  const dateScheduleNote = dateScheduleUnconfirmed
    ? 'Chưa có dữ liệu về lịch ngày này, gồm ngày nghỉ hoặc đóng cửa đặc biệt; bạn nên xác nhận với nhà cung cấp.'
    : undefined;
  const missingPrimaryNotes = (missingPrimary ?? [])
    .map(field => `Chưa có dữ liệu về ${field}.`)
  const displayOrigin = originDisplayLabel(origin)
  const isDefaultOrigin = !origin || displayOrigin === DEFAULT_HANOI_ORIGIN_LABEL
  const defaultOriginNote = isDefaultOrigin
    && matches?.some(match => match.distance_source === 'haversine' && typeof match.distance_km === 'number')
    ? `Khoảng cách tính từ ${DEFAULT_HANOI_ORIGIN_LABEL}.`
    : undefined
  const withNotices = (message: string) =>
    [message, defaultOriginNote, ...missingPrimaryNotes, dateScheduleNote, originUnresolved, ending?.trim()]
      .filter((line): line is string => Boolean(line))
      .join('\n\n')
  const hasCompleteDistances = Boolean(
    matches
    && matches.length > 0
    && matches.length === count
    && matches.every(match =>
      match.distance_source === 'haversine'
      && typeof match.distance_km === 'number'
      && Number.isFinite(match.distance_km)
      && Boolean(match.location_source)
    )
  );
  const hasMissingDistance = !matches
    || matches.length !== count
    || matches.some(match =>
      match.distance_source !== 'haversine'
      || typeof match.distance_km !== 'number'
      || !Number.isFinite(match.distance_km)
    )
  const hasUnconfirmedRadius = Boolean(
    radiusKm != null
    && (hasMissingDistance || matches?.some(match => match.radius_status === 'unconfirmed'))
  )
  const hasApproximateRadius = Boolean(
    matches?.some(match =>
      match.location_source === 'approximate' && match.radius_status === 'unconfirmed'
    )
  )
  const radiusNote = radiusKm == null
    ? undefined
    : hasMissingDistance
      ? `Chưa có dữ liệu khoảng cách để kiểm tra bán kính ${formatRadiusKm(radiusKm)} km.`
      : hasUnconfirmedRadius
        ? hasApproximateRadius
          ? `Có trải nghiệm chưa xác nhận bán kính ${formatRadiusKm(radiusKm)} km do tọa độ xấp xỉ.`
          : `Có trải nghiệm chưa xác nhận bán kính ${formatRadiusKm(radiusKm)} km do sai số ước tính theo huyện.`
        : undefined
  if (count === 0 && noResultsDueToBudget && max_budget_per_person != null) {
    return withNotices(
      `Không tìm thấy trải nghiệm nào phù hợp với ngân sách tối đa ${formatVND(max_budget_per_person)}đ/người.`,
    )
  }
  if (count === 0 && noResultsDueToDateInPast && start_date) {
    const earliest = earliestAvailableDate ? ` Bạn chọn ngày khác từ ${toDDMMYYYY(earliestAvailableDate)}.` : ''
    return withNotices(`Ngày ${toDDMMYYYY(start_date)} đã qua.${earliest}`)
  }
  if (count === 0 && noResultsDueToNotice && maxNoticePeriodHours != null) {
    const earliest = earliestAvailableDate ? ` Ngày sớm nhất có thể khởi hành: ${toDDMMYYYY(earliestAvailableDate)}.` : ''
    return withNotices(`Trải nghiệm cần đặt trước ít nhất ${maxNoticePeriodHours} giờ.${earliest}`)
  }
  if (radiusKm != null && count === 0 && noResultsWithinRadius) {
    const from = isDefaultOrigin
      ? ` tính từ ${DEFAULT_HANOI_ORIGIN_LABEL}`
      : displayOrigin
        ? ` tính từ ${displayOrigin}`
        : '';
    return withNotices(`Không tìm thấy trải nghiệm nào phù hợp trong bán kính ${formatRadiusKm(radiusKm)} km${from}. Mình không tự mở rộng bán kính.`);
  }
  if (count === 0) {
    const noMatches = 'Không tìm thấy trải nghiệm nào phù hợp với các tiêu chí hiện tại.'
    return withNotices(radiusKm != null
      ? `${noMatches}\n\n${radiusNote ?? `Chưa có dữ liệu khoảng cách để kiểm tra bán kính ${formatRadiusKm(radiusKm)} km.`}`
      : noMatches)
  }
  if (craft) criteria.push(`nghề ${craft}`);
  if (start_date) {
    if (end_date && end_date !== start_date) {
      criteria.push(`từ ${toDDMMYYYY(start_date)} đến ${toDDMMYYYY(end_date)}`);
    } else {
      criteria.push(`ngày ${toDDMMYYYY(start_date)}`);
    }
  }
  if (max_budget_per_person != null) criteria.push(`ngân sách tối đa ${formatVND(max_budget_per_person)}đ/người`);
  if (origin && !isDefaultOrigin) criteria.push(`điểm xuất phát ${origin}`);
  if (radiusKm != null && hasCompleteDistances && !hasUnconfirmedRadius) criteria.push(`bán kính ${formatRadiusKm(radiusKm)} km`);

  const group = group_size != null ? ` cho nhóm ${group_size} khách` : '';
  const qualifier = criteria.length > 0 ? ` (${criteria.join(', ')})` : '';
  const lines = [`Mình tìm được ${count} trải nghiệm${group}${qualifier}.`];
  if (radiusNote) lines.push(radiusNote)
  const exclusions = [
    ...excludedVillages,
    ...excludedCrafts.map(excludedCraft => `nghề ${excludedCraft}`),
  ].filter(Boolean);
  const actions: string[] = [];
  if (exclusions.length > 0) actions.push(`Đã loại ${exclusions.join(', ')}`);
  if (priceSort === 'desc') actions.push('sắp xếp giá từ cao xuống thấp');
  if (priceSort === 'asc') actions.push('sắp xếp giá từ thấp lên cao');
  if (actions.length > 0) lines.push(`${actions.join(' và ')}.`);

  if (matches && matches.length > 0) {
    lines.push('');
    matches.forEach((match, index) => {
      const price = match.price_per_person == null
        ? ''
        : `: ${formatVND(match.price_per_person)}đ/người`;
      const distance = match.distance_source === 'haversine'
        && typeof match.distance_km === 'number'
        && Number.isFinite(match.distance_km)
        ? match.location_source === 'district_fallback'
          ? ` (khoảng ${Math.round(match.distance_km)} km (ước tính theo huyện))`
          : match.location_source === 'approximate'
            ? ` (khoảng ${Math.round(match.distance_km)} km, tọa độ xấp xỉ)`
            : ` (Cách ${origin || DEFAULT_HANOI_ORIGIN_LABEL} khoảng ${formatKm(match.distance_km)} km (đường chim bay))`
        : ''
      lines.push(`${index + 1}. ${match.experience_name}${price}${distance}`);
    });
  }

  if (missingPrimaryNotes.length > 0) lines.push('', ...missingPrimaryNotes)
  if (dateScheduleNote) lines.push('', dateScheduleNote);
  if (originUnresolved) lines.push('', originUnresolved)
  if (defaultOriginNote) lines.push('', defaultOriginNote)
  if (ending?.trim()) lines.push('', ending.trim());
  return lines.join('\n');
}

export function buildVillageCardResultsMessage(
  cards: Array<{
    name: string
    distance_km?: number | null
    distance_source?: 'haversine'
    location_source?: 'from_plus_code' | 'district_fallback' | 'manual_gmaps' | 'approximate'
    radius_status?: 'confirmed' | 'unconfirmed'
  }>,
  radiusKm?: number,
  origin?: string,
  overflowCards: Array<{ name: string; radius_status?: 'confirmed' | 'unconfirmed' }> = [],
): string {
  const displayOrigin = originDisplayLabel(origin)
  if (cards.length === 0) {
    return radiusKm == null
      ? 'Chưa tìm thấy làng nghề phù hợp trong dữ liệu.'
      : `Chưa tìm thấy làng nghề phù hợp trong bán kính ${formatRadiusKm(radiusKm)} km${displayOrigin ? ` tính từ ${displayOrigin}` : ''}.`
  }

  const hasDistances = cards.some(card =>
    card.distance_source === 'haversine'
    && typeof card.distance_km === 'number'
    && Number.isFinite(card.distance_km)
  )
  const lines = [`Mình tìm thấy ${cards.length} làng nghề phù hợp.`]
  if ((radiusKm != null || hasDistances) && displayOrigin) {
    lines.push(`Khoảng cách tính từ ${displayOrigin}.`)
  }
  cards.forEach((card, index) => {
    const hasDistance = card.distance_source === 'haversine'
      && typeof card.distance_km === 'number'
      && Number.isFinite(card.distance_km)
    const distance = hasDistance
      ? card.location_source === 'district_fallback'
        ? ` (khoảng ${Math.round(card.distance_km!)} km (ước tính theo huyện))`
        : ` (Cách ${displayOrigin || DEFAULT_HANOI_ORIGIN_LABEL} khoảng ${formatKm(card.distance_km!)} km (đường chim bay))`
      : ''
    const radiusWarning = card.radius_status === 'unconfirmed'
      ? ' — chưa xác nhận bán kính'
      : ''
    lines.push(`${index + 1}. ${card.name}${distance}${radiusWarning}`)
  })
  if (radiusKm != null && cards.some(card =>
    card.distance_source !== 'haversine'
    || typeof card.distance_km !== 'number'
    || !Number.isFinite(card.distance_km)
  )) {
    lines.push(`Chưa có dữ liệu khoảng cách để kiểm tra bán kính ${formatRadiusKm(radiusKm)} km.`)
  }
  if (radiusKm != null && overflowCards.length > 0) {
    const names = overflowCards.slice(0, 3).map(card =>
      `${card.name}${card.radius_status === 'unconfirmed' ? ' — chưa xác nhận bán kính' : ''}`
    ).join(', ')
    lines.push(`Còn ${overflowCards.length} làng khác trong bán kính: ${names}.`)
  }
  return lines.join('\n')
}

export function buildMissingPrimaryMessage(
  missingPrimary: string[],
  villageNames: string[],
): string {
  const missing = missingPrimary.length === 1
    ? missingPrimary[0]
    : `${missingPrimary.slice(0, -1).join(', ')} và ${missingPrimary[missingPrimary.length - 1]}`
  const lines = [`Hiện chưa có dữ liệu về ${missing}.`]
  const suggestions = villageNames.slice(0, 3)
  if (suggestions.length > 0) {
    lines.push('', 'Một số làng nghề có thông tin trong hệ thống:')
    suggestions.forEach((name, index) => lines.push(`${index + 1}. ${name}`))
  }
  return lines.join('\n')
}

export function refusalTemplate(
  kind: string,
  options: { field?: string } = {}
): { message: string; quick_replies: string[] } {
  switch (kind) {
    case 'out_of_scope':
      return {
        message:
          'Xin lỗi, mình không thể trả lời yêu cầu này vì nằm ngoài phạm vi nền tảng. Bạn muốn mình gợi ý trải nghiệm văn hóa có trong dữ liệu hay tiếp tục ghép tour làng nghề theo số khách, ngày và ngân sách?',
        quick_replies: ['Bắt đầu ghép tour', 'Xem các làng nghề'],
      };
    case 'restricted':
      return {
        message:
          'Mình không chia sẻ được thông tin của agency khác hoặc cấu hình hệ thống. Mình có thể giúp bạn với yêu cầu tour của riêng bạn.',
        quick_replies: ['Bắt đầu ghép tour'],
      };
    case 'no_permission':
      return {
        message: 'Tài khoản của bạn chưa có quyền thực hiện thao tác này.',
        quick_replies: ['Liên kết trợ giúp'],
      };
    case 'missing_data':
      return {
        message: `Hiện chưa có dữ liệu về ${options.field ?? ''} cho mục này.`,
        quick_replies: [],
      };
    case 'system_error':
    default:
      return {
        message:
          'Mình chưa xử lý được lúc này. Bạn thử lại hoặc nhập yêu cầu theo từng thông tin (số người, ngày, ngân sách) nhé.',
        quick_replies: ['Thử lại'],
      };
  }
}
