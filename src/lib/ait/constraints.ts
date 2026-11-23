import { matchesCraftPreference } from '@/lib/matching/craft-taxonomy'
import { filterCandidateByRadius } from '@/lib/matching/geo'
import { hanoiDate } from '@/lib/time/hanoi-time'

function getNextDayUTC7(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  const yStr = dt.getUTCFullYear();
  const mStr = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dStr = String(dt.getUTCDate()).padStart(2, '0');
  return Date.parse(`${yStr}-${mStr}-${dStr}T00:00:00+07:00`);
}

export function applyHardFilters({
  candidates,
  profile,
  bookings = [],
  operatingHours = [],
  now = Date.now(),
}: {
  candidates: any[];
  profile: any;
  bookings?: any[];
  operatingHours?: {
    provider_id: string;
    weekday: string | number;
    local_start: string;
    local_end: string;
  }[];
  now?: number;
}): {
  passed: { id: string; flags: string[] }[];
  rejected: { id: string; reason: string }[];
} {
  const passed: { id: string; flags: string[] }[] = [];
  const rejected: { id: string; reason: string }[] = [];

  const targetDateRange = profile?.hard_constraints?.target_date_or_range;
  const startDateStr = targetDateRange?.start_date;
  const endDateStr = targetDateRange?.end_date ?? startDateStr;
  const dateParts = typeof startDateStr === 'string' ? startDateStr.split('-').map(Number) : [];
  const targetWeekday = dateParts.length === 3
    ? new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2])).getUTCDay() || 7
    : null;

  let rangeStartMs: number | null = null;
  let rangeEndMs: number | null = null;

  if (startDateStr) {
    rangeStartMs = Date.parse(`${startDateStr}T00:00:00+07:00`);
    rangeEndMs = getNextDayUTC7(endDateStr);
  }

  const groupSize = profile?.hard_constraints?.group_size;
  const maxBudget = profile?.hard_constraints?.max_budget_per_person;
  const radiusKm = profile?.hard_constraints?.radius_km;
  const matchingAttrs = profile?.matching_attributes ?? [];

  for (const candidate of candidates) {
    let radiusUnconfirmed = false
    // 1. Status check
    const eligibleStatuses = ['verified', 'from_source_only'];
    if (!eligibleStatuses.includes(candidate.verification_status)) {
      rejected.push({ id: candidate.id, reason: 'status' });
      continue;
    }

    // 2. Published check
    if (candidate.published !== true) {
      rejected.push({ id: candidate.id, reason: 'unpublished' });
      continue;
    }

    // 3. Capacity check
    if (groupSize != null && candidate.max_participants != null) {
      if (candidate.max_participants < groupSize) {
        rejected.push({ id: candidate.id, reason: 'capacity' });
        continue;
      }
    }

    // 4. Budget check
    if (maxBudget != null && candidate.price_per_person != null) {
      if (candidate.price_per_person > maxBudget) {
        rejected.push({ id: candidate.id, reason: 'budget' });
        continue;
      }
    }

    if (typeof radiusKm === 'number' && Number.isFinite(radiusKm) && radiusKm > 0) {
      const radiusDecision = filterCandidateByRadius(candidate, radiusKm)
      if (!radiusDecision.include) {
        rejected.push({ id: candidate.id, reason: 'radius' })
        continue
      }
      radiusUnconfirmed = radiusDecision.status === 'unconfirmed'
    }

    const includedCraft = matchingAttrs.find(
      (attr: any) => attr.type === 'craft_preference' && attr.polarity !== 'exclude' && attr.value !== 'all'
    )
    if (includedCraft && !matchesCraftPreference(includedCraft.value, {
      craft_type: candidate.craft_type ?? candidate.craft,
      name: candidate.name,
      experience_name: candidate.experience_name,
      village_name: candidate.village_name,
      provider_name: candidate.provider_name,
    })) {
      rejected.push({ id: candidate.id, reason: 'craft_preference' });
      continue;
    }

    // 5. Date in past check
    if (startDateStr && startDateStr < hanoiDate(new Date(now))) {
      rejected.push({ id: candidate.id, reason: 'date_in_past' });
      continue;
    }

    // 6. Date conflict check
    if (rangeStartMs !== null && rangeEndMs !== null) {
      const hasConflict = bookings.some((b: any) => {
        if (b.experience_id !== candidate.id) return false;
        const status = String(b.status || '').trim().toLowerCase();
        if (status === 'cancelled') return false;
        const bStart = Date.parse(b.start_at);
        const bEnd = Date.parse(b.end_at);
        return bStart < rangeEndMs! && bEnd > rangeStartMs!;
      });

      if (hasConflict) {
        rejected.push({ id: candidate.id, reason: 'date_conflict' });
        continue;
      }
    }

    // 7. Notice period check
    if (rangeStartMs !== null && candidate.notice_period_hours != null) {
      const noticeMs = candidate.notice_period_hours * 3600 * 1000;
      if (rangeStartMs - now < noticeMs) {
        rejected.push({ id: candidate.id, reason: 'notice' });
        continue;
      }
    }

    // A provider with known weekly hours must have a window on the requested weekday.
    if (targetWeekday !== null && candidate.provider_id) {
      const providerHours = operatingHours.filter(
        (hours) => hours.provider_id === candidate.provider_id
      );
      if (
        providerHours.length > 0
        && !providerHours.some((hours) => Number(hours.weekday) === targetWeekday)
      ) {
        rejected.push({ id: candidate.id, reason: 'operating_hours' });
        continue;
      }
    }

    // 7. Excluded attributes check
    let isExcluded = false;
    for (const attr of matchingAttrs) {
      if (attr.polarity !== 'exclude') continue;

      if (attr.type === 'experience_type' && candidate.experience_type === attr.value) {
        isExcluded = true;
        break;
      }
      if (attr.type === 'category' && candidate.category === attr.value) {
        isExcluded = true;
        break;
      }
      if (attr.type === 'village_id' && candidate.village_id === attr.value) {
        isExcluded = true;
        break;
      }
      if (attr.type === 'craft_preference') {
        if (attr.value === 'all') {
          if (candidate.craft !== null && candidate.craft !== undefined && candidate.craft !== '') {
            isExcluded = true;
            break;
          }
        } else if (candidate.craft === attr.value) {
          isExcluded = true;
          break;
        }
      }
    }

    if (isExcluded) {
      rejected.push({ id: candidate.id, reason: 'excluded' });
      continue;
    }

    // Passed: collect flags
    const flags: string[] = [];
    if (candidate.max_participants == null) {
      flags.push('capacity_unknown');
    }
    if (candidate.price_per_person == null) {
      flags.push('price_unknown');
    }
    if (candidate.notice_period_hours == null) {
      flags.push('notice_unknown');
    }
    if (radiusUnconfirmed) {
      flags.push('radius_unconfirmed')
    }

    passed.push({ id: candidate.id, flags });
  }

  return { passed, rejected };
}
