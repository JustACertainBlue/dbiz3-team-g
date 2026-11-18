import { MatchCard } from './schemas';
import { DEFAULT_HANOI_ORIGIN_LABEL } from '@/lib/matching/geo'

function formatVND(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatDateDDMMYYYY(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return dateStr;
}

export function buildMatchCard({
  candidate,
  rank,
  score,
  factors = {},
  sourceCount,
}: {
  candidate: any;
  rank: number;
  score: number | null;
  factors?: any;
  sourceCount?: number | null;
}): MatchCard {
  const flags: string[] = [];
  if (candidate.max_participants == null) flags.push('capacity_unknown');
  if (candidate.notice_period_hours == null) flags.push('notice_unknown');
  if (candidate.price_per_person == null) flags.push('price_unknown');

  const display = {
    price:
      candidate.price_per_person != null
        ? `${formatVND(candidate.price_per_person)}đ/người`
        : 'Chưa có dữ liệu giá',
    capacity:
      candidate.max_participants != null
        ? `Tối đa ${candidate.max_participants} người`
        : 'Chưa có dữ liệu về sức chứa',
    notice:
      candidate.notice_period_hours != null
        ? `Báo trước ${candidate.notice_period_hours} giờ`
        : 'Chưa có dữ liệu về thời gian báo trước',
  };

  let trustLabel = 'Chưa có thông tin về trạng thái xác minh';
  const badges: string[] = [];

  if (candidate.verification_status === 'verified') {
    trustLabel = 'Đã được xác minh';
    badges.push('Đã được xác minh');
  } else if (candidate.verification_status === 'from_source_only') {
    trustLabel = 'Tổng hợp từ nguồn công khai';
    badges.push('Tổng hợp từ nguồn công khai');
  } else if (candidate.verification_status === 'unverified') {
    trustLabel = 'Chưa xác minh';
  }

  const tags: string[] = [];
  if (Array.isArray(candidate.tags)) {
    for (const t of candidate.tags) {
      if (!tags.includes(t)) {
        tags.push(t);
        if (tags.length === 4) break;
      }
    }
  }

  const reasons: { key: string; text: string }[] = [];
  const caveats: { key: string; text: string }[] = [];

  // 1. Craft
  if (factors.craft) {
    if (factors.craft.matched) {
      reasons.push({ key: 'craft', text: `Đúng sở thích ${factors.craft.value}` });
    } else {
      caveats.push({ key: 'craft', text: `Chưa khớp sở thích ${factors.craft.value}` });
    }
  }

  if (factors.experience_type) {
    const requested = factors.experience_type.requested.join(', ')
    reasons.push({
      key: 'experience_type',
      text: factors.experience_type.matched
        ? `Đúng loại trải nghiệm ${requested}`
        : `Loại trải nghiệm ${factors.experience_type.value} chưa khớp yêu cầu ${requested}`,
    })
  }

  // 2. Capacity
  if (factors.capacity) {
    if (factors.capacity.matched) {
      if (factors.capacity.max != null) {
        reasons.push({
          key: 'capacity',
          text: `Nhận tối đa ${factors.capacity.max} người, nhóm bạn ${factors.capacity.group} người`,
        });
      }
    }
  }

  // 3. Budget
  if (factors.budget) {
    if (factors.budget.matched) {
      if (factors.budget.price != null) {
        reasons.push({
          key: 'budget',
          text: `${formatVND(factors.budget.price)}đ/người, trong ngân sách ${formatVND(
            factors.budget.max
          )}đ`,
        });
      }
    }
  }

  // 4. Tags
  if (factors.tags?.matched && factors.tags.matched.length > 0) {
    reasons.push({ key: 'tags', text: `Có ${factors.tags.matched.join(', ')}` });
  }

  // Distance caveat
  if (factors.distance?.km != null) {
    caveats.push({
      key: 'distance',
      text: candidate.location_source === 'district_fallback'
        ? `Khoảng ${Math.round(factors.distance.km)} km (ước tính theo huyện)`
        : candidate.location_source === 'approximate'
          ? `Khoảng ${Math.round(factors.distance.km)} km (tọa độ xấp xỉ)`
          : `Cách ${candidate.distance_origin_label || DEFAULT_HANOI_ORIGIN_LABEL} khoảng ${factors.distance.km.toFixed(1).replace('.', ',')} km (đường chim bay)`,
    });
  } else if (candidate.distance_requested && !factors.radius_unconfirmed) {
    caveats.push({ key: 'distance', text: 'Chưa có dữ liệu khoảng cách' });
  }
  if (factors.radius_unconfirmed) {
    caveats.push({ key: 'radius', text: 'Chưa xác nhận bán kính' })
  }

  return {
    experience_id: candidate.id,
    provider_id: candidate.provider_id,
    rank,
    match_score: score === null ? null : Math.round(score * 10) / 10,
    experience_name: candidate.name,
    provider_name: candidate.provider_name,
    village_name: candidate.village_name,
    price_per_person: candidate.price_per_person ?? null,
    distance_km: candidate.distance_source === 'haversine' ? candidate.distance_km ?? null : null,
    ...(candidate.distance_source === 'haversine' ? { distance_source: 'haversine' as const } : {}),
    ...(candidate.distance_source === 'haversine' && candidate.location_source
      ? { location_source: candidate.location_source }
      : {}),
    ...(candidate.distance_requested ? { distance_requested: true } : {}),
    ...(candidate.radius_status ? { radius_status: candidate.radius_status } : {}),
    ...(candidate.distance_source === 'haversine' && candidate.distance_origin_label
      ? { distance_origin_label: candidate.distance_origin_label }
      : {}),
    max_participants: candidate.max_participants ?? null,
    notice_period_hours: candidate.notice_period_hours ?? null,
    image_url: candidate.image_url ?? null,
    reasons,
    caveats,
    flags,
    badges,
    tags,
    trust: {
      status: candidate.verification_status,
      label: trustLabel,
      source_count: sourceCount ?? null,
    },
    display,
    actions: ['view_detail', 'request_quote', 'chat_provider'],
  };
}

export function verificationText(
  status: string,
  options: { unit?: string; date?: string } = {}
): string {
  if (status === 'verified') {
    if (options.unit) {
      let text = `Đã được xác minh bởi ${options.unit}`;
      if (options.date) {
        text += ` ngày ${formatDateDDMMYYYY(options.date)}`;
      }
      return text;
    }
    return 'Đã được xác minh. Chưa có thông tin về đơn vị xác minh.';
  }

  if (status === 'from_source_only') {
    return 'Thông tin tổng hợp từ nhiều nguồn công khai, chưa liên hệ trực tiếp xác nhận';
  }

  if (status === 'unverified') {
    return 'Chưa xác minh';
  }

  return 'Chưa có thông tin về trạng thái xác minh';
}
