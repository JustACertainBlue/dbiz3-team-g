const KEYS = [
  'experience_fit',
  'route_convenience',
  'agency_preferences',
  'provider_quality',
] as const;

export const DEFAULT_WEIGHTS = {
  experience_fit: 0.4,
  route_convenience: 0.25,
  agency_preferences: 0.2,
  provider_quality: 0.15,
};

export function normalizeWeights(w: any): {
  experience_fit: number;
  route_convenience: number;
  agency_preferences: number;
  provider_quality: number;
} {
  if (!w || typeof w !== 'object') return { ...DEFAULT_WEIGHTS };
  for (const k of KEYS) {
    if (typeof w[k] !== 'number' || isNaN(w[k]) || w[k] < 0) {
      return { ...DEFAULT_WEIGHTS };
    }
  }
  const sum = KEYS.reduce((acc, k) => acc + w[k], 0);
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };

  const clamp = (val: number) => Math.max(0.05, Math.min(0.6, val));

  // Binary search for scaling factor s
  let low = 0;
  let high = 1e6;

  for (let iter = 0; iter < 80; iter++) {
    const mid = (low + high) / 2;
    const curSum = KEYS.reduce((acc, k) => acc + clamp(w[k] * mid), 0);
    if (curSum < 1) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const s = (low + high) / 2;
  const res: any = {};
  for (const k of KEYS) {
    res[k] = clamp(w[k] * s);
  }

  // Ensure exact sum of 1
  let total = KEYS.reduce((acc, k) => acc + res[k], 0);
  let diff = 1 - total;
  if (Math.abs(diff) > 1e-9) {
    // Adjust slightly without violating [0.05, 0.6]
    for (const k of KEYS) {
      if (diff > 0 && res[k] < 0.6) {
        const add = Math.min(diff, 0.6 - res[k]);
        res[k] += add;
        diff -= add;
      } else if (diff < 0 && res[k] > 0.05) {
        const sub = Math.min(-diff, res[k] - 0.05);
        res[k] -= sub;
        diff += sub;
      }
      if (Math.abs(diff) < 1e-12) break;
    }
  }

  return res;
}
