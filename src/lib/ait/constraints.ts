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
  now = Date.now(),
}: {
  candidates: any[];
  profile: any;
  bookings?: any[];
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

  let rangeStartMs: number | null = null;
  let rangeEndMs: number | null = null;

  if (startDateStr) {
    rangeStartMs = Date.parse(`${startDateStr}T00:00:00+07:00`);
    rangeEndMs = getNextDayUTC7(endDateStr);
  }

  const groupSize = profile?.hard_constraints?.group_size;
  const maxBudget = profile?.hard_constraints?.max_budget_per_person;
  const matchingAttrs = profile?.matching_attributes ?? [];

  for (const candidate of candidates) {
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

    // 5. Date conflict check
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

    // 6. Notice period check
    if (rangeStartMs !== null && candidate.notice_period_hours != null) {
      const noticeMs = candidate.notice_period_hours * 3600 * 1000;
      if (rangeStartMs - now < noticeMs) {
        rejected.push({ id: candidate.id, reason: 'notice' });
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

    passed.push({ id: candidate.id, flags });
  }

  return { passed, rejected };
}
