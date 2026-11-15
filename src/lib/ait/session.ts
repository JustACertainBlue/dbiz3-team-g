import { sanitizeInput } from './guard';
import { routeByRules } from './router';
import { profileSchema, Profile } from './schemas';

function canonicalizeDraft(v: any): any {
  if (typeof v === 'string') {
    return v.trim().replace(/\s+/g, ' ').toLowerCase();
  }
  if (Array.isArray(v)) {
    return v
      .map(canonicalizeDraft)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (v && typeof v === 'object') {
    const sortedKeys = Object.keys(v).sort();
    const res: any = {};
    for (const k of sortedKeys) {
      res[k] = canonicalizeDraft(v[k]);
    }
    return res;
  }
  return v;
}

export function shouldReuseSession({
  prev,
  now,
  draft,
  agencyId,
}: {
  prev: {
    agency_id: string;
    created_at: number;
    message_count: number;
    draft: any;
  } | null;
  now: number;
  draft: any;
  agencyId: string;
}): boolean {
  if (!prev) return false;
  if (prev.agency_id !== agencyId) return false;
  if (prev.message_count > 0) return false;
  if (now - prev.created_at > 10 * 60 * 1000) return false;

  const canonPrev = JSON.stringify(canonicalizeDraft(prev.draft));
  const canonCurr = JSON.stringify(canonicalizeDraft(draft));
  return canonPrev === canonCurr;
}

export function canCreateAiSession(
  role: string | null | undefined
):
  | { allowed: true }
  | { allowed: false; reason: 'login_required'; keepInput: true }
  | { allowed: false; reason: 'forbidden' } {
  if (role === 'Tour_Agency') {
    return { allowed: true };
  }
  if (role === null || role === undefined) {
    return { allowed: false, reason: 'login_required', keepInput: true };
  }
  return { allowed: false, reason: 'forbidden' };
}

export function draftToProfile({
  description = '',
  group_size,
  date,
  filters,
}: {
  description?: string;
  group_size?: any;
  date?: any;
  filters?: {
    max_budget?: any;
    crafts?: string[];
  };
}):
  | { ok: true; profile: Profile }
  | { ok: false; reason: 'too_long' | 'restricted_request' | 'invalid_profile' } {
  // 1. Sanitize description
  const sanitized = sanitizeInput(description, 1000);
  if (!sanitized.ok && sanitized.reason === 'too_long') {
    return { ok: false, reason: 'too_long' };
  }

  // 2. Check for restricted content in description
  const route = routeByRules(description);
  if (route?.intent === 'restricted_request') {
    return { ok: false, reason: 'restricted_request' };
  }

  // 3. Assemble profile
  const rawProfile: any = {
    hard_constraints: {
      group_size,
      max_budget_per_person: filters?.max_budget,
      target_date_or_range: date,
    },
    matching_attributes: [],
  };

  if (Array.isArray(filters?.crafts)) {
    rawProfile.matching_attributes = filters.crafts.map((c: string) => ({
      type: 'craft_preference',
      value: c,
      polarity: 'include',
    }));
  }

  const parsed = profileSchema.safeParse(rawProfile);
  if (!parsed.success) {
    return { ok: false, reason: 'invalid_profile' };
  }

  return { ok: true, profile: parsed.data };
}
