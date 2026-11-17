function formatVND(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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
  excludedVillages = [],
  excludedCrafts = [],
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
  excludedVillages?: string[];
  excludedCrafts?: string[];
  priceSort?: 'asc' | 'desc';
  matches?: ResultMessageMatch[];
  ending?: string;
}): string {
  const criteria: string[] = [];
  const dateScheduleNote = dateScheduleUnconfirmed
    ? 'Chưa có dữ liệu về lịch ngày này, gồm ngày nghỉ hoặc đóng cửa đặc biệt; bạn nên xác nhận với nhà cung cấp.'
    : undefined;
  const withNotices = (message: string) =>
    [message, dateScheduleNote, ending?.trim()].filter((line): line is string => Boolean(line)).join('\n\n');
  const hasCompleteDistances = Boolean(
    matches
    && matches.length > 0
    && matches.length === count
    && matches.every(match =>
      match.distance_source === 'haversine'
      && typeof match.distance_km === 'number'
      && Number.isFinite(match.distance_km)
    )
  );
  if (radiusKm != null && count === 0 && noResultsWithinRadius) {
    const from = origin ? ` tính từ ${origin}` : '';
    return withNotices(`Không tìm thấy trải nghiệm nào phù hợp trong bán kính ${radiusKm} km${from}. Mình không tự mở rộng bán kính.`);
  }
  if (count === 0) {
    return withNotices('Không tìm thấy trải nghiệm nào phù hợp với các tiêu chí hiện tại.');
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
  if (origin) criteria.push(`điểm xuất phát ${origin}`);
  if (radiusKm != null && hasCompleteDistances) criteria.push(`bán kính ${radiusKm} km`);

  const group = group_size != null ? ` cho nhóm ${group_size} khách` : '';
  const qualifier = criteria.length > 0 ? ` (${criteria.join(', ')})` : '';
  const lines = [`Mình tìm được ${count} trải nghiệm${group}${qualifier}.`];
  if (radiusKm != null && !hasCompleteDistances) {
    lines.push(`Chưa thể xác nhận bán kính ${radiusKm} km vì chưa có dữ liệu khoảng cách cho tất cả trải nghiệm.`);
  }
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
        ? 'chưa có dữ liệu giá'
        : `${formatVND(match.price_per_person)}đ/người`;
      const distance = match.distance_source === 'haversine'
        && typeof match.distance_km === 'number'
        && Number.isFinite(match.distance_km)
        ? ` (khoảng ${Math.round(match.distance_km)} km đường chim bay)`
        : ' (chưa có dữ liệu khoảng cách)';
      lines.push(`${index + 1}. ${match.experience_name}: ${price}${distance}`);
    });
  }

  if (dateScheduleNote) lines.push('', dateScheduleNote);
  if (ending?.trim()) lines.push('', ending.trim());
  return lines.join('\n');
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
